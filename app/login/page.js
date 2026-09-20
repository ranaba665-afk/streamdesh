"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      if (mode === "signup") {
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
      router.push("/");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-wrap">
      <h2 className="display" style={{ fontSize: 28, marginBottom: 20 }}>
        {mode === "signup" ? "Create your channel" : "Log in"}
      </h2>

      <form onSubmit={handleSubmit}>
        {mode === "signup" && (
          <input
            className="field"
            placeholder="Channel name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          className="field"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="field"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button className="btn" style={{ width: "100%" }} type="submit">
          {mode === "signup" ? "Create account" : "Log in"}
        </button>
      </form>

      <button
        className="btn ghost"
        style={{ width: "100%", marginTop: 10 }}
        onClick={() => signInWithGoogle().then(() => router.push("/"))}
      >
        Continue with Google
      </button>

      <p style={{ marginTop: 16, fontSize: 13.5, color: "var(--text-dim)" }}>
        {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
        <button
          className="btn ghost"
          style={{ padding: "2px 8px", fontSize: 13 }}
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup" ? "Log in" : "Create a channel"}
        </button>
      </p>
    </div>
  );
}
