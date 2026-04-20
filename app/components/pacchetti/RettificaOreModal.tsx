// @ts-nocheck
"use client";
import React, { useState } from "react";

export default function RettificaOreModal({ pacchetto, onClose, onSuccess }) {
  const [delta, setDelta] = useState("");
  const [motivazione, setMotivazione] = useState("");
  const [ancheAcquistate, setAncheAcquistate] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const deltaNum = parseFloat(delta.replace(",", ".")) || 0;
  const oreResidueAttuali = pacchetto.oreResidue ?? 0;
  const oreAcquistateAttuali = pacchetto.oreAcquistate ?? 0;
  const oreResidueDopo = oreResidueAttuali + deltaNum;
  const oreAcquistateDopo = oreAcquistateAttuali + (ancheAcquistate ? deltaNum : 0);

  const segno = deltaNum > 0 ? "+" : "";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!delta || deltaNum === 0) { setError("Inserisci un valore diverso da zero."); return; }
    if (!motivazione.trim()) { setError("La motivazione è obbligatoria."); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/pacchetti/${pacchetto.id}/rettifica`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: deltaNum, motivazione: motivazione.trim(), ancheAcquistate }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Errore salvataggio"); return; }
      onSuccess(data.pacchetto);
    } catch {
      setError("Errore di rete.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
      zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "28px 28px 22px",
        minWidth: 400, maxWidth: 500, boxShadow: "0 12px 48px rgba(15,23,42,0.3)",
        position: "relative",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 14, right: 18,
          background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#64748b",
        }}>×</button>

        <h3 style={{ margin: "0 0 4px", color: "#20489a", fontWeight: 800, fontSize: 18 }}>
          ⚖️ Rettifica ore
        </h3>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>
          {pacchetto.descrizione} · {pacchetto.cliente?.nomeReferente || `Cliente #${pacchetto.clienteId}`}
        </p>

        {/* Stato attuale */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20,
        }}>
          <Stat label="Ore acquistate" value={oreAcquistateAttuali} color="#3b82f6" />
          <Stat label="Ore residue" value={oreResidueAttuali} color="#10b981" />
        </div>

        <form onSubmit={handleSubmit}>
          {/* Delta */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 6 }}>
              Ore da aggiungere / sottrarre *
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="text"
                inputMode="decimal"
                value={delta}
                onChange={e => setDelta(e.target.value)}
                placeholder="es. +2 oppure -1.5"
                style={{
                  flex: 1, padding: "9px 12px", borderRadius: 8,
                  border: `1.5px solid ${deltaNum > 0 ? "#86efac" : deltaNum < 0 ? "#fca5a5" : "#cbd5e1"}`,
                  fontSize: 14,
                  color: deltaNum > 0 ? "#065f46" : deltaNum < 0 ? "#991b1b" : "#1e293b",
                  fontWeight: 700,
                }}
                autoFocus
              />
              <span style={{
                fontSize: 13, fontWeight: 600, color: "#64748b", whiteSpace: "nowrap",
              }}>ore</span>
            </div>
          </div>

          {/* Anteprima */}
          {deltaNum !== 0 && (
            <div style={{
              background: deltaNum > 0 ? "#f0fdf4" : "#fef2f2",
              border: `1.5px solid ${deltaNum > 0 ? "#86efac" : "#fca5a5"}`,
              borderRadius: 10, padding: "12px 16px", marginBottom: 16,
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>Ore residue</div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>
                  <span style={{ color: "#94a3b8" }}>{oreResidueAttuali}</span>
                  {" → "}
                  <span style={{ color: deltaNum > 0 ? "#065f46" : "#991b1b" }}>
                    {segno}{deltaNum} = {oreResidueDopo.toFixed(2).replace(/\.?0+$/, "")}
                  </span>
                </div>
              </div>
              {ancheAcquistate && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>Ore acquistate</div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>
                    <span style={{ color: "#94a3b8" }}>{oreAcquistateAttuali}</span>
                    {" → "}
                    <span style={{ color: deltaNum > 0 ? "#065f46" : "#991b1b" }}>
                      {segno}{deltaNum} = {oreAcquistateDopo.toFixed(2).replace(/\.?0+$/, "")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aggiusta anche acquistate */}
          <div style={{
            marginBottom: 16, padding: "10px 14px", borderRadius: 8,
            background: ancheAcquistate ? "#eff6ff" : "#f8fafc",
            border: "1.5px solid #bfdbfe",
          }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={ancheAcquistate}
                onChange={e => setAncheAcquistate(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Aggiusta anche ore acquistate</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  Consigliato per rettifiche contabili retroattive (es. ore extra non conteggiate al saldo).
                </div>
              </div>
            </label>
          </div>

          {/* Motivazione */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 6 }}>
              Motivazione * <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 12 }}>(appare nel changelog)</span>
            </label>
            <textarea
              value={motivazione}
              onChange={e => setMotivazione(e.target.value)}
              placeholder="es. Rettifica retroattiva ore EXTRA pregressi — lezioni extra del periodo marzo/aprile spostate al pacchetto corrente"
              rows={3}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "9px 12px", borderRadius: 8,
                border: "1.5px solid #cbd5e1", fontSize: 13,
                resize: "vertical", fontFamily: "inherit",
              }}
            />
          </div>

          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fca5a5",
              borderRadius: 8, padding: "8px 12px", fontSize: 13,
              color: "#991b1b", marginBottom: 12,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} disabled={saving} style={{
              background: "#f1f5f9", color: "#475569", border: "none",
              borderRadius: 8, padding: "9px 20px", fontWeight: 600, cursor: "pointer",
            }}>
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving || deltaNum === 0 || !motivazione.trim()}
              style={{
                background: saving || deltaNum === 0 || !motivazione.trim() ? "#9ab0d4" : "#20489a",
                color: "#fff", border: "none", borderRadius: 8,
                padding: "9px 22px", fontWeight: 700, fontSize: 14,
                cursor: saving || deltaNum === 0 || !motivazione.trim() ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Salvataggio…" : "Applica rettifica"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{
      background: "#f8fafc", borderRadius: 8, padding: "10px 14px",
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}
