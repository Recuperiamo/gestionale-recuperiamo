// @ts-nocheck
"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "../lib/auth/hooks";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import CalendarioAttivita from "../components/calendario/CalendarioAttivita";
import Link from "next/link";

const MAIN_FONT = `'Segoe UI','Arial','Helvetica',sans-serif`;

export default function ProfiloPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [calView, setCalView] = useState("week");
  const [msg, setMsg] = useState("");
  const [note, setNote] = useState([]);
  const [noteLoading, setNoteLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.replace("/signin");
  }, [status, session, router]);

  useEffect(() => {
    if (!session) return;
    fetch('/api/note')
      .then(r => r.ok ? r.json() : [])
      .then(data => setNote(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setNoteLoading(false));
  }, [session]);

  if (status === "loading" || !session) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f8ff", fontFamily: MAIN_FONT }}>
        <Navbar />
        <div style={{ textAlign: "center", padding: 50 }}>Caricamento profilo…</div>
      </div>
    );
  }

  function toggleView() {
    setCalView((v) => (v === "week" ? "month" : "week"));
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
          color: "#20489a",
        }}
      >
        <h2
          style={{
            fontWeight: 800,
            fontSize: 38,
            marginBottom: 28,
            textAlign: "center",
            color: "#20489a",
            letterSpacing: "0.5px",
          }}
        >
          Calendario lezioni
        </h2>

        <section
          style={{
            fontSize: 18,
            textAlign: "center",
            marginBottom: 26,
            lineHeight: 1.5,
          }}
        >
          <div>
            <span style={{ fontWeight: 700 }}>Nome:</span> {session.user?.name || "—"}
          </div>
          {/* Email rimossa come da richiesta */}
        </section>

        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <button
            onClick={toggleView}
            style={switchBtnStyle}
            onMouseOver={(e) => (e.currentTarget.style.background = "#b2e4fc")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#e3eefe")}
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
          enableStudentRequests={true}
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
              fontWeight: 600,
            }}
          >
            {msg}
          </div>
        )}

        {/* Note / Promemoria del docente */}
        {(noteLoading || note.length > 0) && (
          <div style={{ marginTop: 40 }}>
            <h3 style={{
              fontSize: 22, fontWeight: 700, color: "#20489a",
              marginBottom: 16, paddingBottom: 10,
              borderBottom: "2px solid #e3eefe",
            }}>
              📌 Note dal docente
            </h3>
            {noteLoading ? (
              <div style={{ color: "#64748b", textAlign: "center", padding: 20 }}>
                Caricamento…
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {note.map(n => {
                  const hasDate = !!n.data;
                  const isPast = hasDate && new Date(n.data) < new Date();
                  const dateStr = hasDate
                    ? new Date(n.data).toLocaleString("it-IT", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })
                    : null;
                  return (
                    <div key={n.id} style={{
                      display: "flex", alignItems: "flex-start", gap: 12,
                      background: isPast ? "#f8fafc" : "#faf5ff",
                      border: `1px solid ${isPast ? "#e2e8f0" : "#e9d5ff"}`,
                      borderLeft: `4px solid ${isPast ? "#94a3b8" : "#7C3AED"}`,
                      borderRadius: 8, padding: "12px 16px",
                      opacity: isPast ? 0.75 : 1,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, color: "#1e293b", lineHeight: 1.5 }}>
                          {n.testo}
                        </div>
                        {dateStr && (
                          <div style={{
                            marginTop: 6, fontSize: 12,
                            color: isPast ? "#64748b" : "#6d28d9", fontWeight: 500,
                          }}>
                            📅 {dateStr}{isPast ? " (passata)" : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
  transition: "background 0.2s",
};