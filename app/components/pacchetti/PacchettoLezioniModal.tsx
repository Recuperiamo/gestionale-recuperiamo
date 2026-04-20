// @ts-nocheck
"use client";
import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import AttivitaDettaglioModal from "../attivita/AttivitaDettaglioModal";
import SpostaAttivitaModal from "../attivita/SpostaAttivitaModal";

const AttivitaForm = dynamic(() => import("../attivita/AttivitaForm"), { ssr: false });

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtOrario(att) {
  const d = att.orario || att.createdAt;
  if (!d) return "—";
  return new Date(d).toLocaleString("it-IT", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function statoColor(stato) {
  const s = (stato || "").toLowerCase();
  if (s === "cancellata") return { bg: "#fee2e2", color: "#991b1b" };
  if (s === "ripianificata") return { bg: "#fef3c7", color: "#92400e" };
  if (s === "extra") return { bg: "#ede9fe", color: "#5b21b6" };
  return { bg: "#d1fae5", color: "#065f46" };
}

// ─── componente ─────────────────────────────────────────────────────────────

export default function PacchettoLezioniModal({ pacchetto, onClose, onRefreshPacchetti }) {
  const [attivita, setAttivita] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [dettaglio, setDettaglio] = useState(null);
  const [editData, setEditData] = useState(null);
  const [spostaData, setSpostaData] = useState(null);
  const [sortCol, setSortCol] = useState("orario");
  const [sortDir, setSortDir] = useState("desc");

  const fetchAttivita = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attivita?pacchettoId=${pacchetto.id}&includeAdHocLavagne=0`);
      const data = await res.json();
      setAttivita(Array.isArray(data) ? data : []);
    } catch {
      setAttivita([]);
    } finally {
      setLoading(false);
    }
  }, [pacchetto.id]);

  useEffect(() => { fetchAttivita(); }, [fetchAttivita]);

  // Chiudi con Esc
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Ordinamento
  const sorted = [...attivita].sort((a, b) => {
    let va, vb;
    if (sortCol === "orario") {
      va = a.orario ? new Date(a.orario).getTime() : 0;
      vb = b.orario ? new Date(b.orario).getTime() : 0;
    } else if (sortCol === "ore") {
      va = a.oreConsumate ?? a.durataOre ?? 0;
      vb = b.oreConsumate ?? b.durataOre ?? 0;
    } else {
      va = (a.descrizione || "").toLowerCase();
      vb = (b.descrizione || "").toLowerCase();
    }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  function SortIcon({ col }) {
    if (sortCol !== col) return <span style={{ opacity: 0.3 }}>↕</span>;
    return <span>{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const totOre = attivita.reduce((s, a) => s + (a.oreConsumate ?? a.durataOre ?? 0), 0);
  const clienteLabel = pacchetto.cliente?.nomeReferente || `Cliente #${pacchetto.clienteId}`;

  async function handleDelete(att) {
    if (!confirm(`Elimina la lezione "${att.descrizione || "#" + att.id}"?`)) return;
    try {
      const r = await fetch("/api/attivita", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: att.id }),
      });
      if (!r.ok) {
        const js = await r.json().catch(() => ({}));
        alert("Errore: " + (js.error || r.status));
        return;
      }
      setDettaglio(null);
      await fetchAttivita();
      onRefreshPacchetti?.();
    } catch {
      alert("Errore di rete");
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(15,23,42,0.45)",
          zIndex: 3000,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Pannello */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 3001,
        width: "min(92vw, 900px)",
        maxHeight: "88vh",
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 24px 64px rgba(15,23,42,0.28)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid #e2e8f0",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#20489a", margin: 0 }}>
                📋 Lezioni — {pacchetto.descrizione}
              </h2>
              <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
                {clienteLabel} · {attivita.length} lezioni · {totOre.toFixed(1)} ore totali
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  background: "#10b981", color: "#fff", border: "none",
                  borderRadius: 8, padding: "8px 16px",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(16,185,129,0.3)",
                }}
              >
                + Nuova lezione
              </button>
              <button
                onClick={onClose}
                style={{
                  background: "#f1f5f9", border: "none", borderRadius: 8,
                  width: 36, height: 36, fontSize: 20, cursor: "pointer",
                  color: "#64748b", lineHeight: 1,
                }}
                title="Chiudi (Esc)"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Corpo scrollabile */}
        <div style={{ overflowY: "auto", flex: 1, padding: "0 0 8px" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
              Caricamento lezioni…
            </div>
          ) : attivita.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
              Nessuna lezione in questo pacchetto.
              <br />
              <button
                onClick={() => setShowCreate(true)}
                style={{ marginTop: 12, background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, cursor: "pointer" }}
              >
                + Crea la prima lezione
              </button>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <Th onClick={() => toggleSort("descrizione")}>
                    Descrizione <SortIcon col="descrizione" />
                  </Th>
                  <Th onClick={() => toggleSort("orario")} style={{ whiteSpace: "nowrap" }}>
                    Orario <SortIcon col="orario" />
                  </Th>
                  <Th onClick={() => toggleSort("ore")} style={{ textAlign: "center" }}>
                    Ore <SortIcon col="ore" />
                  </Th>
                  <Th style={{ textAlign: "center" }}>Stato</Th>
                  <Th style={{ textAlign: "right" }} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((att, i) => {
                  const ore = att.oreConsumate ?? att.durataOre ?? 0;
                  const sc = statoColor(att.stato);
                  return (
                    <tr
                      key={att.id}
                      style={{
                        background: i % 2 === 0 ? "#fff" : "#f8fafc",
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f8fafc")}
                    >
                      <td style={{ padding: "10px 16px", fontWeight: 600, color: "#1e293b", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {att.descrizione || `Lezione #${att.id}`}
                        {att.ricorrenzaId && (
                          <span title="Parte di una ricorrenza" style={{ marginLeft: 6, fontSize: 11, color: "#8b5cf6", fontWeight: 700 }}>↻</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#475569", whiteSpace: "nowrap" }}>
                        {fmtOrario(att)}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#20489a" }}>
                        {ore}h
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{
                          background: sc.bg, color: sc.color,
                          borderRadius: 10, padding: "2px 10px",
                          fontSize: 11, fontWeight: 700,
                        }}>
                          {att.stato || "Prenotata"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => setDettaglio(att)}
                          style={{
                            background: "#dbeafe", color: "#1e40af", border: "none",
                            borderRadius: 6, padding: "5px 12px", fontSize: 12,
                            fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          Dettaglio
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modale dettaglio lezione */}
      {dettaglio && (
        <div style={{ zIndex: 3100, position: "relative" }}>
          <AttivitaDettaglioModal
            attivita={dettaglio}
            onClose={() => setDettaglio(null)}
            onEdit={(a) => { setDettaglio(null); setEditData(a); }}
            onDelete={handleDelete}
            onSposta={(a) => { setDettaglio(null); setSpostaData(a); }}
          />
        </div>
      )}

      {/* Modale modifica lezione */}
      {editData && (
        <div style={{ zIndex: 3100, position: "relative" }}>
          <AttivitaForm
            initialData={editData}
            onClose={() => setEditData(null)}
            onSuccess={() => {
              setEditData(null);
              fetchAttivita();
              onRefreshPacchetti?.();
            }}
          />
        </div>
      )}

      {/* Modale creazione lezione */}
      {showCreate && (
        <div style={{ zIndex: 3100, position: "relative" }}>
          <AttivitaForm
            initialData={{
              clienteId: pacchetto.clienteId,
              pacchettoId: pacchetto.id,
            }}
            onClose={() => setShowCreate(false)}
            onSuccess={() => {
              setShowCreate(false);
              fetchAttivita();
              onRefreshPacchetti?.();
            }}
          />
        </div>
      )}

      {/* Modale sposta lezione */}
      {spostaData && (
        <div style={{ zIndex: 3100, position: "relative" }}>
          <SpostaAttivitaModal
            attivita={spostaData}
            onClose={() => setSpostaData(null)}
            onSuccess={() => {
              setSpostaData(null);
              fetchAttivita();
              onRefreshPacchetti?.();
            }}
          />
        </div>
      )}
    </>
  );
}

function Th({ children, onClick, style }) {
  return (
    <th
      onClick={onClick}
      style={{
        padding: "10px 16px",
        textAlign: "left",
        fontSize: 11,
        fontWeight: 700,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        ...style,
      }}
    >
      {children}
    </th>
  );
}
