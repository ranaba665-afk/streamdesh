"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function Shell({ children }) {
  const { user, logOut } = useAuth();
  const router = useRouter();

  function handleSearch(e) {
    e.preventDefault();
    const q = e.target.elements.q.value.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          Stream<span className="dot">Desh</span>
        </Link>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/subscriptions">Subscriptions</Link>
          <Link href="/upload">Upload video</Link>
          {user && <Link href={`/channel/${user.uid}`}>My channel</Link>}
        </nav>
      </aside>

      <div>
        <header className="topbar">
          <form className="search" onSubmit={handleSearch} style={{ display: "flex" }}>
            <input
              name="q"
              className="search"
              placeholder="Search videos"
              style={{ border: "none", padding: "9px 0 9px 14px" }}
            />
          </form>

          {user ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Link href="/upload" className="btn">
                Upload
              </Link>
              <button className="btn ghost" onClick={logOut}>
                Log out
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn">
              Log in
            </Link>
          )}
        </header>

        <main className="main">{children}</main>
      </div>
    </div>
  );
}
