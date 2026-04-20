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
  const [selezioneMassiva, setSelezioneMassiva] = useState(false);
  const [selezionati, setSelezionati] = useState<Set<number>>(new Set());
  const [bulkSposta, setBulkSposta] = useState(false);

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

  function toggleSelezione(id: number) {
    setSelezionati(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelezionaTutto() {
    if (selezionati.size === sorted.length) {
      setSelezionati(new Set());
    } else {
      setSelezionati(new Set(sorted.map(a => a.id)));
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Eliminare ${selezionati.size} lezioni selezionate?`)) return;
    for (const id of selezionati) {
      await fetch("/api/attivita", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    }
    setSelezionati(new Set());
    setSelezioneMassiva(false);
    await fetchAttivita();
    onRefreshPacchetti?.();
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
                onClick={() => {
                  setSelezioneMassiva(v => !v);
                  setSelezionati(new Set());
                }}
                style={{
                  background: selezioneMassiva ? "#7c3aed" : "#ede9fe",
                  color: selezioneMassiva ? "#fff" : "#5b21b6",
                  border: "none", borderRadius: 8, padding: "8px 14px",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                {selezioneMassiva ? "✕ Annulla selezione" : "☑ Selezione multipla"}
              </button>
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

        {/* Barra azione bulk */}
        {selezioneMassiva && selezionati.size > 0 && (
          <div style={{
            padding: "12px 24px", background: "#1e1b4b", color: "#fff",
            display: "flex", alignItems: "center", gap: 16, flexShrink: 0,
          }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{selezionati.size} lezione{selezionati.size > 1 ? "i" : ""} selezionata{selezionati.size > 1 ? "e" : ""}</span>
            <button
              onClick={() => setBulkSposta(true)}
              style={{
                background: "#f59e0b", color: "#fff", border: "none",
                borderRadius: 7, padding: "7px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}
            >
              Sposta selezionate
            </button>
            <button
              onClick={handleBulkDelete}
              style={{
                background: "#ef4444", color: "#fff", border: "none",
                borderRadius: 7, padding: "7px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}
            >
              Elimina selezionate
            </button>
            <button
              onClick={() => setSelezionati(new Set())}
              style={{
                background: "transparent", color: "#c7d2fe", border: "1px solid #4338ca",
                borderRadius: 7, padding: "7px 14px", fontSize: 13, cursor: "pointer",
              }}
            >
              Deseleziona tutto
            </button>
          </div>
        )}

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
                  {selezioneMassiva && (
                    <Th style={{ width: 36, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selezionati.size === sorted.length && sorted.length > 0}
                        onChange={toggleSelezionaTutto}
                        title="Seleziona tutto"
                      />
                    </Th>
                  )}
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
                        background: selezionati.has(att.id) ? "#ede9fe" : i % 2 === 0 ? "#fff" : "#f8fafc",
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => { if (!selezionati.has(att.id)) e.currentTarget.style.background = "#eff6ff"; }}
                      onMouseLeave={(e) => { if (!selezionati.has(att.id)) e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f8fafc"; }}
                    >
                      {selezioneMassiva && (
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={selezionati.has(att.id)}
                            onChange={() => toggleSelezione(att.id)}
                          />
                        </td>
                      )}
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

      {/* Modale sposta massivo */}
      {bulkSposta && (
        <div style={{ zIndex: 3100, position: "relative" }}>
          <BulkSpostaModal
            attivitaIds={Array.from(selezionati)}
            attivitaList={attivita}
            clienteId={pacchetto.clienteId}
            currentPacchettoId={pacchetto.id}
            onClose={() => setBulkSposta(false)}
            onSuccess={() => {
              setBulkSposta(false);
              setSelezionati(new Set());
              setSelezioneMassiva(false);
              fetchAttivita();
              onRefreshPacchetti?.();
            }}
          />
        </div>
      )}
    </>
  );
}

function BulkSpostaModal({ attivitaIds, attivitaList, clienteId, currentPacchettoId, onClose, onSuccess }) {
  const [pacchetti, setPacchetti] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [targetId, setTargetId] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    fetch(`/api/pacchetti?clienteId=${clienteId}&stato=attivo`)
      .then(r => r.json())
      .then(data => {
        const lista = Array.isArray(data) ? data : [];
        setPacchetti(lista.filter(p => p.id !== currentPacchettoId));
      })
      .catch(() => setPacchetti([]))
      .finally(() => setLoading(false));
  }, [clienteId, currentPacchettoId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!targetId) return;
    setSaving(true);
    setProgress({ done: 0, total: attivitaIds.length });
    setError("");
    let failed = 0;
    for (let i = 0; i < attivitaIds.length; i++) {
      const res = await fetch("/api/attivita/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attivitaId: attivitaIds[i], targetPacchettoId: Number(targetId) }),
      });
      if (!res.ok) failed++;
      setProgress({ done: i + 1, total: attivitaIds.length });
    }
    setSaving(false);
    if (failed > 0) {
      setError(`${failed} lezione/i non spostate (ore insufficienti o errore).`);
    } else {
      onSuccess();
    }
  }

  const targetPacchetto = pacchetti.find(p => p.id === Number(targetId));
  const totOre = attivitaList
    .filter(a => attivitaIds.includes(a.id))
    .reduce((s, a) => s + (a.oreConsumate ?? a.durataOre ?? 0), 0);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
      zIndex: 3200, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: 14, padding: "28px 28px 22px",
        minWidth: 360, maxWidth: 460, boxShadow: "0 8px 40px rgba(15,23,42,0.3)",
        position: "relative",
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 18, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#64748b" }}>×</button>
        <h3 style={{ color: "#20489a", fontWeight: 700, marginTop: 0, marginBottom: 6 }}>
          Sposta {attivitaIds.length} lezioni
        </h3>
        <div style={{ background: "#f5f8ff", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 14 }}>
          <div><b>Lezioni selezionate:</b> {attivitaIds.length}</div>
          <div><b>Ore totali da spostare:</b> {totOre}h</div>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 6 }}>Pacchetto destinazione *</label>
          {loading ? (
            <div style={{ color: "#9ab0d4", fontSize: 13, marginBottom: 16 }}>Caricamento…</div>
          ) : pacchetti.length === 0 ? (
            <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 7, padding: "10px 12px", fontSize: 13, marginBottom: 16, color: "#856404" }}>
              Nessun altro pacchetto attivo disponibile per questo cliente.
            </div>
          ) : (
            <select
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              required
              style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1.5px solid #b0c8f5", fontSize: 14, marginBottom: 8, background: "#f8fbff", color: "#20489a" }}
            >
              <option value="">— Seleziona pacchetto —</option>
              {pacchetti.map(p => (
                <option key={p.id} value={p.id}>
                  {p.descrizione || `#${p.id}`} — {p.oreResidue ?? "?"} ore residue
                </option>
              ))}
            </select>
          )}
          {targetPacchetto && (targetPacchetto.oreResidue ?? 0) < totOre && (
            <div style={{ background: "#ffe6e6", border: "1px solid #f99", borderRadius: 7, padding: "8px 12px", fontSize: 13, marginBottom: 10, color: "#a00" }}>
              Attenzione: {targetPacchetto.oreResidue}h residue nel pacchetto, {totOre}h richieste. Le lezioni EXTRA non scalano le ore.
            </div>
          )}
          {progress && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ background: "#e2e8f0", borderRadius: 6, overflow: "hidden", height: 8 }}>
                <div style={{ background: "#10b981", height: 8, width: `${(progress.done / progress.total) * 100}%`, transition: "width 0.2s" }} />
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{progress.done} / {progress.total} spostate</div>
            </div>
          )}
          {error && <div style={{ background: "#fdecea", border: "1px solid #f5c6c6", borderRadius: 7, padding: "8px 12px", fontSize: 13, marginBottom: 10, color: "#c00" }}>{error}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
            <button type="button" onClick={onClose} disabled={saving} style={{ background: "#e3eefe", color: "#20489a", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 600, cursor: "pointer" }}>
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving || !targetId || pacchetti.length === 0}
              style={{ background: saving || !targetId ? "#9ab0d4" : "#f59e0b", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 700, cursor: saving || !targetId ? "not-allowed" : "pointer" }}
            >
              {saving ? `Spostamento… (${progress?.done}/${progress?.total})` : "Sposta tutto"}
            </button>
          </div>
        </form>
      </div>
    </div>
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
