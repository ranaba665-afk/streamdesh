"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import VideoCard from "../../components/VideoCard";

export default function SubscriptionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      const subsSnap = await getDocs(
        query(collection(db, "subscriptions"), where("subscriberUid", "==", user.uid))
      );
      const channelUids = subsSnap.docs.map((d) => d.data().channelUid);

      if (channelUids.length === 0) {
        setVideos([]);
        setLoading(false);
        return;
      }

      // Firestore "in" queries cap out at 30 values — fine for now, chunk
      // this later once a viewer can follow more than 30 channels.
      const videoSnap = await getDocs(
        query(
          collection(db, "videos"),
          where("ownerUid", "in", channelUids.slice(0, 30)),
          where("status", "==", "ready"),
          orderBy("createdAt", "desc"),
          limit(30)
        )
      );
      setVideos(videoSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }
    load();
  }, [user, authLoading]);

  if (authLoading || loading) return <p style={{ color: "var(--text-dim)" }}>Loading…</p>;

  if (!user) {
    return <p style={{ color: "var(--text-dim)" }}>Log in to see videos from channels you follow.</p>;
  }

  if (videos.length === 0) {
    return (
      <div>
        <h2 className="display">Nothing here yet</h2>
        <p style={{ color: "var(--text-dim)" }}>
          Subscribe to a channel and their new videos will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid">
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} />
      ))}
    </div>
  );
}
