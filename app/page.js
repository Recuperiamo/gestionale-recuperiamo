"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "./components/Navbar";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") return null;
  if (!session) {
    router.replace("/signin");
    return null;
  }

  // Solo admin può restare su dashboard, gli altri redirect a /profilo
  if (session.user?.role !== "admin") {
    router.replace("/profilo");
    return null;
  }

  const userRole = session.user?.role || "Ruolo non definito";

  return (
    <div style={{ minHeight: "100vh", background: "#20489a" }}>
      <Navbar />
      <main
        style={{
          maxWidth: 540,
          margin: "40px auto 0 auto",
          background: "#20489a",
          color: "#fff",
          padding: "0 0 32px 0",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            marginTop: 24,
            marginBottom: 10,
            letterSpacing: "-0.8px"
          }}>
            Pannello Gestione Ore
          </div>
          <div style={{
            fontSize: 18,
            marginBottom: 24,
            fontWeight: 400
          }}>
            Traccia le ore dei tuoi clienti, gestisci gli appuntamenti e condividi i riepiloghi.
          </div>
          <div style={{
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 6,
            letterSpacing: "0.3px",
            color: "#1cb0f6",
          }}>
            Ruolo attuale: <span style={{ color: "#fff", background: "#1cb0f6", borderRadius: "5px", padding: "2px 10px", marginLeft: "4px" }}>{userRole}</span>
          </div>
        </div>
        <section
          style={{
            background: "#fff",
            borderRadius: 18,
            padding: "32px 32px 28px 32px",
            margin: "0 0 36px 0",
            boxShadow: "0 4px 20px 0 rgba(32,72,154,0.05)",
            color: "#20489a",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>👤➕</span> Aggiungi un Nuovo Cliente
          </div>
          <form style={{ display: "flex", gap: 14 }}>
            <input
              style={{
                flex: 2,
                padding: "10px 12px",
                fontSize: 16,
                borderRadius: 7,
                border: "1.5px solid #dbe4f1",
                outline: "none",
                marginRight: 4,
              }}
              placeholder="Es. Mario Rossi"
              type="text"
              name="nome"
              autoComplete="off"
              disabled
            />
            <input
              style={{
                flex: 1,
                padding: "10px 12px",
                fontSize: 16,
                borderRadius: 7,
                border: "1.5px solid #dbe4f1",
                outline: "none",
                marginRight: 4,
              }}
              placeholder="Es. 50"
              type="number"
              name="ore"
              autoComplete="off"
              disabled
            />
            <button
              type="button"
              style={{
                background: "#1cb0f6",
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
                padding: "10px 22px",
                border: "none",
                borderRadius: 7,
                cursor: "not-allowed",
                opacity: 0.7
              }}
              disabled
            >
              Crea Cliente
            </button>
          </form>
        </section>
        <div style={{ textAlign: "center", marginTop: 52 }}>
          <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>
            Diagnosi in corso...
          </div>
          <div style={{ fontWeight: 400, fontSize: 16 }}>
            Se vedi questo messaggio, la pagina base si è caricata correttamente.
            <br />
            Numero di clienti caricati in memoria: 0
          </div>
        </div>
      </main>
    </div>
  );
}