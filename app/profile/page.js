"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") return null;
  if (!session) {
    router.replace("/signin");
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#20489a" }}>
      <Navbar />
      <main
        style={{
          maxWidth: 420,
          margin: "60px auto 0 auto",
          background: "#fff",
          borderRadius: 18,
          padding: "38px 34px 34px 34px",
          boxShadow: "0 4px 20px 0 rgba(32,72,154,0.07)",
          color: "#20489a",
        }}
      >
        <h2 style={{ fontWeight: 700, fontSize: 26, marginBottom: 18, textAlign: "center" }}>
          Profilo Utente
        </h2>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
          Nome: <span style={{ fontWeight: 400 }}>{session.user.name}</span>
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
          Email: <span style={{ fontWeight: 400 }}>{session.user.email}</span>
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 28 }}>
          Ruolo: <span style={{ fontWeight: 400 }}>{session.user.role}</span>
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 15,
            color: "#4268b3",
            textAlign: "center"
          }}
        >
          Modifica i tuoi dati dal pannello amministratore
        </div>
      </main>
    </div>
  );
}