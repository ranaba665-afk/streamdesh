"use client";

import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../context/AuthContext";
import VideoCard from "../../../components/VideoCard";

export default function ChannelPage({ params }) {
  const { id } = params; // channel owner's uid
  const { user } = useAuth();
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const subId = user ? `${user.uid}_${id}` : null;

  useEffect(() => {
    async function load() {
      const channelSnap = await getDoc(doc(db, "users", id));
      if (channelSnap.exists()) setChannel({ id: channelSnap.id, ...channelSnap.data() });

      const q = query(
        collection(db, "videos"),
        where("ownerUid", "==", id),
        where("status", "==", "ready"),
        orderBy("createdAt", "desc")
      );
      const videoSnap = await getDocs(q);
      setVideos(videoSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      if (user) {
        const subSnap = await getDoc(doc(db, "subscriptions", `${user.uid}_${id}`));
        setSubscribed(subSnap.exists());
      }
      setLoading(false);
    }
    load();
  }, [id, user]);

  async function toggleSubscribe() {
    if (!user || busy) return;
    setBusy(true);
    const subRef = doc(db, "subscriptions", subId);

    if (subscribed) {
      await deleteDoc(subRef);
      setSubscribed(false);
      setChannel((c) => ({ ...c, subscriberCount: Math.max(0, (c.subscriberCount || 0) - 1) }));
    } else {
      await setDoc(subRef, {
        subscriberUid: user.uid,
        channelUid: id,
        createdAt: new Date(),
      });
      setSubscribed(true);
      setChannel((c) => ({ ...c, subscriberCount: (c.subscriberCount || 0) + 1 }));
    }
    setBusy(false);
  }

  if (loading) return <p style={{ color: "var(--text-dim)" }}>Loading…</p>;
  if (!channel) return <p>Channel not found.</p>;

  const isOwnChannel = user?.uid === id;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "var(--surface-raised)",
            backgroundImage: channel.photoURL ? `url(${channel.photoURL})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <h1 className="display" style={{ fontSize: 26 }}>
            {channel.displayName}
          </h1>
          <p style={{ color: "var(--text-dim)", fontSize: 13.5, marginTop: 4 }}>
            {channel.subscriberCount || 0} subscribers · {videos.length} videos
          </p>
        </div>

        {!isOwnChannel && user && (
          <button className={subscribed ? "btn ghost" : "btn"} onClick={toggleSubscribe} disabled={busy}>
            {subscribed ? "Subscribed" : "Subscribe"}
          </button>
        )}
      </div>

      {videos.length === 0 ? (
        <p style={{ color: "var(--text-dim)" }}>This channel hasn't posted any videos yet.</p>
      ) : (
        <div className="grid">
          {videos.map((v) => (
            <VideoCard key={v.id} video={{ ...v, channelName: channel.displayName }} />
          ))}
        </div>
      )}
    </div>
  );
}
