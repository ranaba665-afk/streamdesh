"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import VideoCard from "../../components/VideoCard";

// Firestore has no full-text search built in. This does a case-sensitive
// prefix match on title, which is enough to ship with — swap in
// Algolia/Typesense later for real fuzzy/full-text search without
// changing anything else on this page.
async function searchVideos(term) {
  if (!term) return [];
  const q = query(
    collection(db, "videos"),
    where("status", "==", "ready"),
    orderBy("title"),
    where("title", ">=", term),
    where("title", "<=", term + "\uf8ff"),
    limit(30)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function SearchResults() {
  const params = useSearchParams();
  const term = params.get("q") || "";
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    searchVideos(term).then((v) => {
      setVideos(v);
      setLoading(false);
    });
  }, [term]);

  return (
    <div>
      <h2 className="display" style={{ fontSize: 22, marginBottom: 20 }}>
        Results for "{term}"
      </h2>

      {loading ? (
        <p style={{ color: "var(--text-dim)" }}>Searching…</p>
      ) : videos.length === 0 ? (
        <p style={{ color: "var(--text-dim)" }}>
          No videos match that title yet. Search only matches from the start of the title for now.
        </p>
      ) : (
        <div className="grid">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p style={{ color: "var(--text-dim)" }}>Loading…</p>}>
      <SearchResults />
    </Suspense>
  );
}
