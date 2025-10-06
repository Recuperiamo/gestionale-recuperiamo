"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import Navbar from "../components/Navbar";
import CalendarioAttivita from "../components/calendario/CalendarioAttivita";
import ApprovaRichiestaModal from "../admin/modifiche/ApprovaRichiestaModal";

export default function CalendarioAdminPage() {
  const { data: session, status } = useSession();
  const [mode, setMode] = useState("week"); // "week" | "month"

  // Stato per gestione richiesta dal calendario (admin)
  const [richiestaSelezionata, setRichiestaSelezionata] = useState(null);
  const [showModal, setShowModal] = useState(false);

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f8ff" }}>
        <Navbar />
        <div style={{ padding: 50, textAlign: "center", fontWeight: 600 }}>
          Caricamento…
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f8ff" }}>
        <Navbar />
        <div style={{ padding: 50, textAlign: "center", fontWeight: 600 }}>
            Non autenticato
        </div>
      </div>
    );
  }

  const isAdmin = ["admin", "operatore"].includes(session.user?.role);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f8ff" }}>
      <Navbar />
      <main
        style={{
          maxWidth: 1200,
          margin: "50px auto 40px auto",
          background: "#fff",
          borderRadius: 22,
          padding: "36px 34px 32px 34px",
          boxShadow: "0 4px 28px rgba(32,72,154,0.12)",
          fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
          color: "#20489a"
        }}
      >
        <h1
          style={{
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: ".6px",
            margin: "0 0 24px 0",
            textAlign: "center"
          }}
        >
          Calendario Attività (Admin)
        </h1>

        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <button
            onClick={() => setMode(m => (m === "week" ? "month" : "week"))}
            style={{
              background: "#e3eefe",
              color: "#20489a",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 16,
              padding: "8px 20px",
              boxShadow: "0 1px 4px rgba(32,72,154,0.18)",
              cursor: "pointer",
              transition: "background .2s"
            }}
            onMouseOver={e => (e.currentTarget.style.background = "#b2e4fc")}
            onMouseOut={e => (e.currentTarget.style.background = "#e3eefe")}
          >
            {mode === "week" ? "Vista Mensile" : "Vista Settimanale"}
          </button>
        </div>

        <CalendarioAttivita
          externalMode={mode}
          allowModeSwitch={false}
          allowNavigation={true}
          showLegend={true}
          enableAdminRequests={isAdmin}
          onAdminOpenRichiesta={(r) => {
            setRichiestaSelezionata(r);
            setShowModal(true);
          }}
        />
      </main>

      {isAdmin && showModal && richiestaSelezionata && (
        <ApprovaRichiestaModal
          richiesta={richiestaSelezionata}
          onClose={() => {
            setShowModal(false);
            setRichiestaSelezionata(null);
          }}
          onApproved={() => {
            setShowModal(false);
            setRichiestaSelezionata(null);
          }}
          onRejected={() => {
            setShowModal(false);
            setRichiestaSelezionata(null);
          }}
        />
      )}
    </div>
  );
}