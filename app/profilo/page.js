"use client";

import React, { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";

export default function ProfiloPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect se non autenticato
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/signin");
    }
  }, [session, status, router]);

  if (status === "loading" || !session) return null;

  // Tutti gli utenti autenticati possono vedere questa pagina
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
          Il tuo profilo
        </h2>
        <div style={{ fontSize: 18, textAlign: "center", marginBottom: 24 }}>
          <b>Nome:</b> {session.user?.name || "Non disponibile"}
          <br />
          <b>Email:</b> {session.user?.email || "Non disponibile"}
          <br />
          <b>Ruolo:</b> {session.user?.role || "Non disponibile"}
        </div>
        <div style={{ marginTop: 18, fontSize: 14, color: "#4268b3", textAlign: "center" }}>
          Se hai bisogno di modificare i tuoi dati, contatta l'amministratore.
        </div>
      </main>
    </div>
  );
}