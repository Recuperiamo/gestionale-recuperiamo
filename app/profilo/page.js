"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import CalendarioAttivita from "../components/calendario/CalendarioAttivita";
// RIMOSSO: import RichiestaModificaClienteModal (non serve più)
// RIMOSSO: useRichiesteModifica (gestito già dentro CalendarioAttivita quando enableStudentRequests=true)

const MAIN_FONT = `'Segoe UI','Arial','Helvetica',sans-serif`;

export default function ProfiloPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [calView, setCalView] = useState("week");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.replace("/signin");
  }, [status, session, router]);

  if (status === "loading" || !session) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f8ff", fontFamily: MAIN_FONT }}>
        <Navbar />
        <div style={{ textAlign: "center", padding: 50 }}>Caricamento profilo…</div>
      </div>
    );
  }

  function toggleView() {
    setCalView(v => (v === "week" ? "month" : "week"));
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f8ff", fontFamily: MAIN_FONT }}>
      <Navbar />
      <main
        style={{
          maxWidth: 1200,
          margin: "60px auto 50px",
          background: "#fff",
          borderRadius: 28,
          padding: "42px 44px 50px",
          boxShadow: "0 6px 34px rgba(32,72,154,0.15)",
          color: "#20489a"
        }}
      >
        <h2
          style={{
            fontWeight: 800,
            fontSize: 38,
            marginBottom: 28,
            textAlign: "center",
            color: "#20489a",
            letterSpacing: "0.5px"
          }}
        >
          Calendario lezioni
        </h2>

        <section
          style={{
            fontSize: 18,
            textAlign: "center",
            marginBottom: 26,
            lineHeight: 1.5
          }}
        >
          <div>
            <span style={{ fontWeight: 700 }}>Nome:</span> {session.user?.name || "—"}
          </div>
          <div>
            <span style={{ fontWeight: 700 }}>Email:</span> {session.user?.email || "—"}
          </div>
        </section>

        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <button
            onClick={toggleView}
            style={switchBtnStyle}
            onMouseOver={e => (e.currentTarget.style.background = "#b2e4fc")}
            onMouseOut={e => (e.currentTarget.style.background = "#e3eefe")}
          >
            {calView === "week" ? "Vista Mensile" : "Vista Settimanale"}
          </button>
        </div>

        <CalendarioAttivita
          externalMode={calView}
          allowModeSwitch={false}
          allowNavigation={true}
          forceClienteId={session.user?.clienteId}
          showLegend={true}
          enableStudentRequests={true}  // Usa il flusso nativo con RichiestaModificaModal
          // IMPORTANTE: non passare onEventClick, altrimenti il modale nativo non si apre
        />

        {msg && (
          <div
            style={{
              margin: "24px 0 0",
              padding: 14,
              background: "#e7fbf1",
              color: "#12753a",
              borderRadius: 10,
              textAlign: "center",
              fontWeight: 600
            }}
          >
            {msg}
          </div>
        )}
      </main>
    </div>
  );
}

const switchBtnStyle = {
  background: "#e3eefe",
  color: "#20489a",
  border: "none",
  borderRadius: 12,
  fontWeight: 700,
  fontSize: 16,
  padding: "10px 22px",
  boxShadow: "0 2px 6px rgba(32,72,154,0.20)",
  cursor: "pointer",
  transition: "background 0.2s"
};