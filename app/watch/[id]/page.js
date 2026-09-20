"use client";

import { useEffect, useRef, useState } from "react";
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../../lib/firebase";
import { useAuth } from "../../../context/AuthContext";

export default function WatchPage({ params }) {
  const { id } = params;
  const { user } = useAuth();
  const videoRef = useRef(null);
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const viewCounted = useRef(false);

  useEffect(() => {
    getDoc(doc(db, "videos", id)).then((snap) => {
      if (snap.exists()) setVideo({ id: snap.id, ...snap.data() });
    });
  }, [id]);

  useEffect(() => {
    const q = query(collection(db, "videos", id, "comments"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [id]);

  useEffect(() => {
    if (!video?.playbackUrl || !videoRef.current) return;
    let hls;
    const el = videoRef.current;

    if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = video.playbackUrl;
    } else {
      import("hls.js").then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(video.playbackUrl);
          hls.attachMedia(el);
        }
      });
    }
    return () => hls?.destroy();
  }, [video?.playbackUrl]);

  function handleTimeUpdate() {
    // Count the view once the viewer has watched 5 continuous seconds —
    // enough to filter out accidental clicks without any subscriber/watch
    // -hour eligibility gate.
    if (viewCounted.current) return;
    if (videoRef.current.currentTime >= 5) {
      viewCounted.current = true;
      httpsCallable(functions, "recordView")({ videoId: id });
    }
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    await addDoc(collection(db, "videos", id, "comments"), {
      text: commentText,
      authorUid: user.uid,
      authorName: user.displayName || "User",
      createdAt: serverTimestamp(),
    });
    setCommentText("");
  }

  if (!video) return <p style={{ color: "var(--text-dim)" }}>Loading…</p>;

  return (
    <div style={{ maxWidth: 900 }}>
      <video
        ref={videoRef}
        controls
        onTimeUpdate={handleTimeUpdate}
        style={{ width: "100%", aspectRatio: "16/9", background: "#000", borderRadius: 3 }}
      />

      <h1 className="display" style={{ fontSize: 24, marginTop: 16 }}>
        {video.title}
      </h1>
      <p style={{ color: "var(--text-dim)", fontSize: 13.5, marginTop: 4 }}>
        {video.channelName} · {video.views || 0} views
      </p>
      {video.description && <p style={{ marginTop: 12, fontSize: 14.5 }}>{video.description}</p>}

      <h3 style={{ marginTop: 32, marginBottom: 12, fontSize: 17 }}>Comments ({comments.length})</h3>

      {user ? (
        <form onSubmit={handleComment} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            className="field"
            style={{ marginBottom: 0 }}
            placeholder="Add a comment…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button className="btn" type="submit">
            Post
          </button>
        </form>
      ) : (
        <p style={{ color: "var(--text-dim)", fontSize: 13.5, marginBottom: 20 }}>
          Log in to leave a comment.
        </p>
      )}

      {comments.map((c) => (
        <div key={c.id} style={{ marginBottom: 14 }}>
          <strong style={{ fontSize: 13.5 }}>{c.authorName}</strong>
          <p style={{ margin: "2px 0 0", fontSize: 14 }}>{c.text}</p>
        </div>
      ))}
    </div>
  );
}
