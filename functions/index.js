const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
setGlobalOptions({ region: "asia-south1" });

const db = admin.firestore();

/**
 * subscriberCount is only ever changed here, server-side, so the Firestore
 * rules can keep "users/{uid}" writable only by its own owner without
 * opening a hole for arbitrary count tampering.
 */
exports.onSubscribeCreate = onDocumentCreated("subscriptions/{subId}", async (event) => {
  const { channelUid } = event.data.data();
  await db.doc(`users/${channelUid}`).update({
    subscriberCount: admin.firestore.FieldValue.increment(1),
  });
});

exports.onSubscribeDelete = onDocumentDeleted("subscriptions/{subId}", async (event) => {
  const { channelUid } = event.data.data();
  await db.doc(`users/${channelUid}`).update({
    subscriberCount: admin.firestore.FieldValue.increment(-1),
  });
});

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN;

/**
 * Called from the upload page. Returns a one-time direct-upload URL from
 * Cloudflare Stream so the video file goes straight from the browser to
 * Cloudflare — it never passes through our own server.
 */
exports.createUploadUrl = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Please log in and try again.");
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxDurationSeconds: 3600,
        creator: request.auth.uid,
        meta: { uploaderUid: request.auth.uid },
      }),
    }
  );
  const json = await res.json();
  if (!json.success) {
    throw new HttpsError("internal", "Could not create an upload URL.");
  }

  const { uploadURL, uid: streamVideoId } = json.result;

  // Pre-create the Firestore video doc in "processing" state. The client
  // fills in title/description then flips status to "ready" once
  // Cloudflare finishes transcoding (poll or webhook — see README).
  await db.collection("videos").doc(streamVideoId).set({
    ownerUid: request.auth.uid,
    status: "processing",
    views: 0,
    likes: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { uploadURL, streamVideoId };
});

/**
 * Polled by the upload page every few seconds after the file finishes
 * uploading. Once Cloudflare reports the video as "ready", this writes
 * the playback URL, thumbnail, and duration into the Firestore doc.
 */
exports.checkVideoStatus = onCall(async (request) => {
  const { streamVideoId } = request.data || {};
  if (!streamVideoId) throw new HttpsError("invalid-argument", "streamVideoId is required.");

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${streamVideoId}`,
    { headers: { Authorization: `Bearer ${CF_API_TOKEN}` } }
  );
  const json = await res.json();
  const result = json.result;
  const ready = result?.readyToStream === true;

  if (ready) {
    await db.collection("videos").doc(streamVideoId).update({
      status: "ready",
      playbackUrl: result.playback.hls,
      thumbnailUrl: result.thumbnail,
      durationLabel: formatDuration(result.duration),
    });
  }

  return { ready };
});

function formatDuration(seconds) {
  const s = Math.round(seconds || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/**
 * Called once per watch session (e.g. after 5 continuous seconds of
 * playback) to count a view. No subscriber/watch-hour threshold gates
 * monetization — but we still de-duplicate by hashed IP+video+day so the
 * same viewer refreshing the page can't inflate ad-eligible views.
 */
exports.recordView = onCall(async (request) => {
  const { videoId } = request.data || {};
  if (!videoId) throw new HttpsError("invalid-argument", "videoId is required.");

  const ip = request.rawRequest.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const dedupeKey = crypto.createHash("sha256").update(`${ip}:${videoId}:${day}`).digest("hex");
  const dedupeRef = db.collection("viewDedupe").doc(dedupeKey);

  const alreadyCounted = await db.runTransaction(async (tx) => {
    const existing = await tx.get(dedupeRef);
    if (existing.exists) return true;
    tx.set(dedupeRef, { createdAt: admin.firestore.FieldValue.serverTimestamp() });
    tx.update(db.collection("videos").doc(videoId), {
      views: admin.firestore.FieldValue.increment(1),
    });
    return false;
  });

  return { counted: !alreadyCounted };
});
