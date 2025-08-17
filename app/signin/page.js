"use client";

import React from "react";
import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";

export default function SignInPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (session) {
      router.replace("/");
    }
  }, [session, router]);

  if (session) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#20489a" }}>
      <Navbar />
      <main
        style={{
          maxWidth: 420,
          margin: "70px auto 0 auto",
          background: "#fff",
          borderRadius: 18,
          padding: "40px 34px 34px 34px",
          boxShadow: "0 4px 20px 0 rgba(32,72,154,0.07)",
          color: "#20489a",
        }}
      >
        <h2 style={{ fontWeight: 700, fontSize: 27, marginBottom: 16, textAlign: "center" }}>
          Accedi al tuo account
        </h2>
        <form
          autoComplete="off"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr("");
            const res = await signIn("credentials", {
              email,
              password,
              redirect: false
            });
            if (res?.error) setErr("Credenziali non valide");
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontWeight: 600, fontSize: 16, marginBottom: 6, display: "block" }}>
              Email
            </label>
            <input
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 16,
                borderRadius: 7,
                border: "1.5px solid #dbe4f1",
                outline: "none",
              }}
              placeholder="tuo@email.it"
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label style={{ fontWeight: 600, fontSize: 16, marginBottom: 6, display: "block" }}>
              Password
            </label>
            <input
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 16,
                borderRadius: 7,
                border: "1.5px solid #dbe4f1",
                outline: "none",
              }}
              placeholder="••••••••"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            style={{
              background: "#1cb0f6",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              padding: "12px 0",
              border: "none",
              borderRadius: 7,
              width: "100%",
            }}
          >
            Accedi
          </button>
          {err && <div style={{ color: "#D32F2F", margin: "18px 0 0 0", fontWeight: 600, textAlign: "center" }}>{err}</div>}
        </form>
        <div style={{ marginTop: 18, fontSize: 14, color: "#4268b3", textAlign: "center" }}>
          Non hai un account? <span style={{ color: "#1cb0f6", fontWeight: 600 }}>Contatta l'amministratore</span>
        </div>
      </main>
    </div>
  );
}