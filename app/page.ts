// @ts-nocheck
"use client";

import React, { useEffect, useState } from "react";
import AuthGuard from "./components/AuthGuard";
import Navbar from "./components/Navbar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import '../styles/globals.css';

export default function DashboardPage() {
  const router = useRouter();
  const [pacchetti, setPacchetti] = useState([]);
  const [attivita, setAttivita] = useState([]);
  const [richieste, setRichieste] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [pacchettiRes, attivitaRes, richiesteRes] = await Promise.all([
        fetch("/api/pacchetti"),
        fetch("/api/attivita"),
        fetch("/api/modifiche?stato=pending"),
      ]);
      
      const pacchettiData = await pacchettiRes.json();
      const attivitaData = await attivitaRes.json();
      const richiesteData = await richiesteRes.json();
      
      setPacchetti(Array.isArray(pacchettiData) ? pacchettiData : []);
      setAttivita(Array.isArray(attivitaData) ? attivitaData : []);
      setRichieste(Array.isArray(richiesteData) ? richiesteData : []);
    } catch (err) {
      console.error("Errore caricamento dati dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  // Calcola pacchetti con poche ore residue
  const pacchettiInScadenza = pacchetti.filter(p => {
    const oreResidue = (p.oreAcquistate || 0) - (p.oreSvolte || 0);
    return oreResidue > 0 && oreResidue < 4;
  });

  // Calcola prossime lezioni (prossimi 7 giorni)
  const now = new Date();
  const settimana = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const prossimiGiorni = attivita
    .filter(a => {
      if ((a.stato || "").toLowerCase() === "cancellata") return false;
      const orario = a.orario ? new Date(a.orario) : new Date(a.createdAt);
      return orario >= now && orario <= settimana;
    })
    .sort((a, b) => {
      const dataA = a.orario ? new Date(a.orario) : new Date(a.createdAt);
      const dataB = b.orario ? new Date(b.orario) : new Date(b.createdAt);
      return dataA - dataB;
    });

  const oggi = new Date().toDateString();
  const domani = new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

  return (
    <AuthGuard requireAdmin>
      {session => {
        const userRole = session.user?.role || "Ruolo non definito";
        return (
          <div style={{ minHeight: "100vh", background: "#f5f7fa" }}>
            <Navbar />
            <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
              {/* Header */}
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 32, fontWeight: 700, color: "#20489a", marginBottom: 8 }}>
                  Dashboard Admin
                </h1>
                <p style={{ fontSize: 16, color: "#666" }}>
                  Centro di controllo del gestionale
                </p>
              </div>

              {/* Quick Actions */}
              <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#20489a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  ⚡ Azioni Rapide
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                  <button
                    onClick={() => router.push("/pacchetti-lezioni")}
                    style={{
                      background: "#1cb0f6",
                      color: "#fff",
                      border: "none",
                      borderRadius: 12,
                      padding: "20px",
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(28,176,246,0.2)",
                      transition: "transform 0.2s, box-shadow 0.2s"
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(28,176,246,0.3)";
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(28,176,246,0.2)";
                    }}
                  >
                    📅 Crea Nuova Lezione
                  </button>
                  <button
                    onClick={() => router.push("/pacchetti")}
                    style={{
                      background: "#20489a",
                      color: "#fff",
                      border: "none",
                      borderRadius: 12,
                      padding: "20px",
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(32,72,154,0.2)",
                      transition: "transform 0.2s, box-shadow 0.2s"
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(32,72,154,0.3)";
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(32,72,154,0.2)";
                    }}
                  >
                    📦 Aggiungi Pacchetto
                  </button>
                  <button
                    onClick={() => router.push("/clienti")}
                    style={{
                      background: "#58cc02",
                      color: "#fff",
                      border: "none",
                      borderRadius: 12,
                      padding: "20px",
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(88,204,2,0.2)",
                      transition: "transform 0.2s, box-shadow 0.2s"
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(88,204,2,0.3)";
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(88,204,2,0.2)";
                    }}
                  >
                    👤 Aggiungi Cliente
                  </button>
                </div>
              </section>

              {/* Alert Prioritari */}
              {(pacchettiInScadenza.length > 0 || richieste.length > 0) && (
                <section style={{ marginBottom: 32 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "#20489a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    ⚠️ Alert Prioritari
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Richieste pendenti */}
                    {richieste.length > 0 && (
                      <div
                        onClick={() => router.push("/richieste")}
                        style={{
                          background: "#fff",
                          borderRadius: 12,
                          padding: "20px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          borderLeft: "4px solid #ff9600",
                          cursor: "pointer",
                          transition: "box-shadow 0.2s"
                        }}
                        onMouseOver={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)"}
                        onMouseOut={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 18, fontWeight: 600, color: "#ff9600", marginBottom: 4 }}>
                              🔔 {richieste.length} Richieste Pendenti
                            </div>
                            <div style={{ fontSize: 14, color: "#666" }}>
                              Richieste di modifica in attesa di gestione
                            </div>
                          </div>
                          <div style={{ fontSize: 32, fontWeight: 700, color: "#ff9600" }}>
                            {richieste.length}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pacchetti in scadenza */}
                    {pacchettiInScadenza.length > 0 && (
                      <div
                        onClick={() => router.push("/pacchetti")}
                        style={{
                          background: "#fff",
                          borderRadius: 12,
                          padding: "20px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          borderLeft: "4px solid #ff4b4b",
                          cursor: "pointer",
                          transition: "box-shadow 0.2s"
                        }}
                        onMouseOver={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)"}
                        onMouseOut={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 18, fontWeight: 600, color: "#ff4b4b", marginBottom: 4 }}>
                              ⏰ {pacchettiInScadenza.length} Pacchetti con poche ore
                            </div>
                            <div style={{ fontSize: 14, color: "#666" }}>
                              Pacchetti con meno di 4 ore residue
                            </div>
                          </div>
                          <div style={{ fontSize: 32, fontWeight: 700, color: "#ff4b4b" }}>
                            {pacchettiInScadenza.length}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Riepilogo Pacchetti */}
              <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#20489a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  📊 Riepilogo Pacchetti (Ore Residue {'<'} 4)
                </h2>
                {loading ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#666" }}>Caricamento...</div>
                ) : pacchettiInScadenza.length === 0 ? (
                  <div style={{
                    background: "#fff",
                    borderRadius: 12,
                    padding: "40px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    textAlign: "center",
                    color: "#666"
                  }}>
                    ✅ Nessun pacchetto in scadenza
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {pacchettiInScadenza.map(p => {
                      const oreResidue = (p.oreAcquistate || 0) - (p.oreSvolte || 0);
                      const percentuale = ((oreResidue / (p.oreAcquistate || 1)) * 100).toFixed(0);
                      return (
                        <div
                          key={p.id}
                          onClick={() => router.push(`/pacchetti?id=${p.id}`)}
                          style={{
                            background: "#fff",
                            borderRadius: 12,
                            padding: "20px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                            cursor: "pointer",
                            transition: "box-shadow 0.2s"
                          }}
                          onMouseOver={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)"}
                          onMouseOut={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <div>
                              <div style={{ fontSize: 16, fontWeight: 600, color: "#20489a" }}>
                                {p.cliente?.nomeReferente || "Cliente non specificato"}
                              </div>
                              <div style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
                                {p.descrizione || `Pacchetto #${p.id}`}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 24, fontWeight: 700, color: oreResidue < 2 ? "#ff4b4b" : "#ff9600" }}>
                                {oreResidue}h
                              </div>
                              <div style={{ fontSize: 12, color: "#666" }}>
                                su {p.oreAcquistate || 0}h
                              </div>
                            </div>
                          </div>
                          <div style={{ background: "#f5f7fa", borderRadius: 8, height: 8, overflow: "hidden" }}>
                            <div style={{
                              background: oreResidue < 2 ? "#ff4b4b" : "#ff9600",
                              height: "100%",
                              width: `${percentuale}%`,
                              transition: "width 0.3s"
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Prossime Lezioni */}
              <section>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#20489a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  📅 Prossime Lezioni (7 giorni)
                </h2>
                {loading ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#666" }}>Caricamento...</div>
                ) : prossimiGiorni.length === 0 ? (
                  <div style={{
                    background: "#fff",
                    borderRadius: 12,
                    padding: "40px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    textAlign: "center",
                    color: "#666"
                  }}>
                    📭 Nessuna lezione programmata nei prossimi 7 giorni
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {prossimiGiorni.map(a => {
                      const orario = a.orario ? new Date(a.orario) : new Date(a.createdAt);
                      const isOggi = orario.toDateString() === oggi;
                      const isDomani = orario.toDateString() === domani;
                      const giorno = orario.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" });
                      const ora = orario.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
                      
                      return (
                        <div
                          key={a.id}
                          onClick={() => router.push("/pacchetti-lezioni")}
                          style={{
                            background: "#fff",
                            borderRadius: 12,
                            padding: "20px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                            borderLeft: isOggi ? "4px solid #58cc02" : isDomani ? "4px solid #1cb0f6" : "4px solid #ddd",
                            cursor: "pointer",
                            transition: "box-shadow 0.2s"
                          }}
                          onMouseOver={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)"}
                          onMouseOut={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                {isOggi && <span style={{ fontSize: 12, fontWeight: 700, color: "#58cc02", background: "#e6f9e6", padding: "2px 8px", borderRadius: 4 }}>OGGI</span>}
                                {isDomani && <span style={{ fontSize: 12, fontWeight: 700, color: "#1cb0f6", background: "#e6f5fc", padding: "2px 8px", borderRadius: 4 }}>DOMANI</span>}
                                <span style={{ fontSize: 16, fontWeight: 600, color: "#20489a" }}>
                                  {giorno} • {ora}
                                </span>
                              </div>
                              <div style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
                                {a.descrizione || "Lezione"} {a.pacchetto?.cliente?.nomeReferente ? `- ${a.pacchetto.cliente.nomeReferente}` : ""}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 18, fontWeight: 600, color: "#20489a" }}>
                                {a.durataOre || a.oreConsumate || 0}h
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </main>
          </div>
        );
      }}
    </AuthGuard>
  );
}
