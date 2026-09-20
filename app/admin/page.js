"use client";

import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);
  const [tab, setTab] = useState("videos");
  const [videos, setVideos] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setChecked(true);
      return;
    }
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      setIsAdmin(snap.exists() && snap.data().isAdmin === true);
      setChecked(true);
    });
  }, [user, authLoading]);

  useEffect(() => {
    if (!isAdmin) return;
    async function load() {
      const videoSnap = await getDocs(query(collection(db, "videos"), orderBy("createdAt", "desc"), limit(100)));
      setVideos(videoSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const userSnap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"), limit(100)));
      setUsers(userSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    load();
  }, [isAdmin]);

  async function removeVideo(id) {
    if (!confirm("Delete this video? This can't be undone.")) return;
    await deleteDoc(doc(db, "videos", id));
    setVideos((v) => v.filter((x) => x.id !== id));
  }

  async function toggleFlag(video) {
    const flagged = !video.flagged;
    await updateDoc(doc(db, "videos", video.id), { flagged });
    setVideos((v) => v.map((x) => (x.id === video.id ? { ...x, flagged } : x)));
  }

  async function toggleAdmin(u) {
    const next = !u.isAdmin;
    await updateDoc(doc(db, "users", u.id), { isAdmin: next });
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, isAdmin: next } : x)));
  }

  if (!checked) return <p style={{ color: "var(--text-dim)" }}>Loading…</p>;

  if (!user || !isAdmin) {
    return (
      <div>
        <h2 className="display">Admin access only</h2>
        <p style={{ color: "var(--text-dim)" }}>
          This page is restricted. If you're supposed to have access, ask an existing admin to grant it
          from the Users tab, or set <code>isAdmin: true</code> on your user doc directly in the Firebase
          console for the very first admin.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="display" style={{ fontSize: 26, marginBottom: 16 }}>
        Admin
      </h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button className={tab === "videos" ? "btn" : "btn ghost"} onClick={() => setTab("videos")}>
          Videos ({videos.length})
        </button>
        <button className={tab === "users" ? "btn" : "btn ghost"} onClick={() => setTab("users")}>
          Users ({users.length})
        </button>
      </div>

      {tab === "videos" && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-dim)", borderBottom: "1px solid var(--line)" }}>
              <th style={{ padding: "8px 6px" }}>Title</th>
              <th style={{ padding: "8px 6px" }}>Status</th>
              <th style={{ padding: "8px 6px" }}>Views</th>
              <th style={{ padding: "8px 6px" }}>Flagged</th>
              <th style={{ padding: "8px 6px" }}></th>
            </tr>
          </thead>
          <tbody>
            {videos.map((v) => (
              <tr key={v.id} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "8px 6px" }}>{v.title || "(untitled)"}</td>
                <td style={{ padding: "8px 6px", color: "var(--text-dim)" }}>{v.status}</td>
                <td style={{ padding: "8px 6px" }}>{v.views || 0}</td>
                <td style={{ padding: "8px 6px" }}>
                  <button className="btn ghost" style={{ padding: "3px 8px", fontSize: 12 }} onClick={() => toggleFlag(v)}>
                    {v.flagged ? "Unflag" : "Flag"}
                  </button>
                </td>
                <td style={{ padding: "8px 6px" }}>
                  <button
                    className="btn ghost"
                    style={{ padding: "3px 8px", fontSize: 12, color: "var(--live)" }}
                    onClick={() => removeVideo(v.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "users" && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-dim)", borderBottom: "1px solid var(--line)" }}>
              <th style={{ padding: "8px 6px" }}>Channel</th>
              <th style={{ padding: "8px 6px" }}>Email</th>
              <th style={{ padding: "8px 6px" }}>Subscribers</th>
              <th style={{ padding: "8px 6px" }}>Admin</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "8px 6px" }}>{u.displayName}</td>
                <td style={{ padding: "8px 6px", color: "var(--text-dim)" }}>{u.email}</td>
                <td style={{ padding: "8px 6px" }}>{u.subscriberCount || 0}</td>
                <td style={{ padding: "8px 6px" }}>
                  <button className="btn ghost" style={{ padding: "3px 8px", fontSize: 12 }} onClick={() => toggleAdmin(u)}>
                    {u.isAdmin ? "Remove admin" : "Make admin"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
