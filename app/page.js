"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import VideoCard from "../components/VideoCard";

export default function HomePage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const q = query(
        collection(db, "videos"),
        where("status", "==", "ready"),
        orderBy("createdAt", "desc"),
        limit(30)
      );
      const snap = await getDocs(q);
      setVideos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <p style={{ color: "var(--text-dim)" }}>Loading…</p>;

  if (videos.length === 0) {
    return (
      <div>
        <h2 className="display">No videos yet</h2>
        <p style={{ color: "var(--text-dim)" }}>Upload the first video to get the platform started.</p>
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
