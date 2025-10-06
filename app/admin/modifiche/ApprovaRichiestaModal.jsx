"use client";
import React, { useState, useEffect } from "react";

/**
 * Modale amministratore per approvare o rifiutare una richiesta modifica.
 * Mostra SOLO la descrizione dell'attività (senza ID). Se assente, fallback "Lezione".
 */
export default function ApprovaRichiestaModal({
  richiesta,
  onClose,
  onApproved,
  onRejected
}) {
  if (!richiesta) return null;

  const att = richiesta.attivita;
  const originaleStart = att?.orario || att?.createdAt;

  // SOLO descrizione (senza ID)
  const descrizioneAttivita = att?.descrizione
    ? att.descrizione
    : "Lezione";

  // Ricava fascia (se presente) dalle note
  const fasciaEstratta = (() => {
    const txt = richiesta.noteStudente || "";
    const m =
      txt.match(/Fascia richiesta:\s*([0-9]{2}:[0-9]{2})\s*-\s*([0-9]{2}:[0-9]{2})/i) ||
      txt.match(/Disponibilit[aà]:\s*([0-9]{2}:[0-9]{2})\s*-\s*([0-9]{2}:[0-9]{2})/i);
    return m ? `${m[1]} - ${m[2]}` : null;
  })();

  function toLocalValue(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0") +
      "T" +
      String(d.getHours()).padStart(2, "0") +
      ":" +
      String(d.getMinutes()).padStart(2, "0")
    );
  }

  const prefillDateTime =
    richiesta.nuovoOrario ||
    richiesta.nuovaData ||
    originaleStart;

  const [dtValue, setDtValue] = useState(toLocalValue(prefillDateTime));
  const [durataOverride, setDurataOverride] = useState("");
  const [noteAdmin, setNoteAdmin] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [approvedMsg, setApprovedMsg] = useState(false);
  const [rejectedMsg, setRejectedMsg] = useState(false);

  useEffect(() => {
    setErr(null);
    setApprovedMsg(false);
    setRejectedMsg(false);
    setNoteAdmin("");
    setDurataOverride("");
  }, [richiesta?.id]);

  async function apiPatch(payload, flagSetter) {
    setLoading(true);
    setErr(null);
    setApprovedMsg(false);
    setRejectedMsg(false);
    try {
      const res = await fetch("/api/modifiche", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const ct = res.headers.get("content-type") || "";
      let data;
      if (ct.includes("application/json")) {
        data = await res.json().catch(() => ({}));
      } else {
        const text = await res.text();
        data = { error: "Non-JSON response: " + text.slice(0, 100) };
      }
      if (!res.ok) {
        setErr(data.error || "Errore");
        return;
      }
      flagSetter(true);
      if (payload.action === "approve") onApproved && onApproved(data);
      if (payload.action === "reject") onRejected && onRejected(data);
      setTimeout(() => onClose && onClose(), 650);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (richiesta.tipo !== "cancellazione" && !dtValue) {
      setErr("Data/Orario definitivi obbligatori");
      return;
    }
    const payload = {
      id: richiesta.id,
      action: "approve",
      noteAdmin: noteAdmin || undefined
    };
    if (richiesta.tipo !== "cancellazione" && dtValue) {
      payload.overrideOrario = new Date(dtValue).toISOString();
    }
    if (durataOverride) {
      const n = Number(durataOverride);
      if (isNaN(n) || n <= 0) {
        setErr("Durata override non valida");
        return;
      }
      payload.overrideDurataOre = n;
    }
    await apiPatch(payload, setApprovedMsg);
  }

  async function handleReject() {
    if (richiesta.stato !== "pending") {
      setErr("Solo richieste pending possono essere rifiutate.");
      return;
    }
    const payload = {
      id: richiesta.id,
      action: "reject",
      noteAdmin: noteAdmin || undefined
    };
    await apiPatch(payload, setRejectedMsg);
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <h3 style={title}>Gestisci richiesta #{richiesta.id}</h3>

        <Info label="Tipo">{richiesta.tipo}</Info>
        <Info label="Attività">{descrizioneAttivita}</Info>
        <Info label="Originale">
          {originaleStart
            ? new Date(originaleStart).toLocaleString("it-IT")
            : "—"}
        </Info>

        {fasciaEstratta && (
          <Info label="Fascia proposta">{fasciaEstratta}</Info>
        )}

        {richiesta.nuovaData && richiesta.tipo === "cambio_data" && (
          <Info label="Data richiesta">
            {new Date(richiesta.nuovaData).toLocaleDateString("it-IT")}
          </Info>
        )}

        {richiesta.nuovoOrario && richiesta.tipo === "cambio_orario" && (
          <Info label="Orario richiesto">
            {new Date(richiesta.nuovoOrario).toLocaleString("it-IT")}
          </Info>
        )}

        {richiesta.tipo !== "cancellazione" && (
          <div style={field}>
            <label style={lbl}>Data & Orario definitivi (obbligatorio)</label>
            <input
              type="datetime-local"
              value={dtValue}
              disabled={loading}
              onChange={e => setDtValue(e.target.value)}
              style={input}
            />
          </div>
        )}

        <div style={field}>
          <label style={lbl}>Override durata (opzionale)</label>
          <input
            type="number"
            min="1"
            value={durataOverride}
            onChange={e => setDurataOverride(e.target.value)}
            style={input}
            placeholder={att?.durataOre || att?.oreConsumate || "1"}
            disabled={loading}
          />
        </div>

        {richiesta.noteStudente && (
          <Info label="Note studente">
            <span style={{ whiteSpace: "pre-wrap" }}>
              {richiesta.noteStudente}
            </span>
          </Info>
        )}

        <div style={field}>
          <label style={lbl}>Note admin (opzionale)</label>
          <textarea
            rows={3}
            style={{ ...input, resize: "vertical" }}
            value={noteAdmin}
            onChange={e => setNoteAdmin(e.target.value)}
            disabled={loading}
          />
        </div>

        {err && <div style={errBox}>{err}</div>}
        {approvedMsg && !err && <div style={okBox}>Approvata</div>}
        {rejectedMsg && !err && <div style={rejBox}>Rifiutata</div>}

        <div
            style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 18,
            flexWrap: "wrap"
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleReject}
              disabled={loading || richiesta.stato !== "pending"}
              style={btnReject}
              title={richiesta.stato !== "pending" ? "Solo pending" : "Rifiuta richiesta"}
            >
              {loading ? "…" : "Rifiuta"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={onClose} disabled={loading} style={btnGhost}>
              Chiudi
            </button>
            <button onClick={handleApprove} disabled={loading} style={btnPrimary}>
              {loading ? "Salvo..." : "Applica e Approva"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Presentational */
function Info({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#20489a",
          letterSpacing: ".3px"
        }}
      >
        {label}:
      </span>{" "}
      <span style={{ fontSize: 14 }}>{children}</span>
    </div>
  );
}

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(32,72,154,0.28)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2500
};
const modal = {
  background: "#fff",
  padding: "28px 30px 30px",
  borderRadius: 20,
  width: "min(560px,92vw)",
  maxHeight: "88vh",
  overflowY: "auto",
  boxShadow: "0 10px 38px rgba(32,72,154,0.25)",
  fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
  color: "#20489a"
};
const title = { margin: "0 0 16px", fontSize: 20, fontWeight: 800 };
const field = { marginBottom: 16, display: "flex", flexDirection: "column", gap: 6 };
const lbl = { fontSize: 12, fontWeight: 600, letterSpacing: ".3px" };
const input = {
  border: "1.6px solid #4268b3",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 14,
  background: "#fff",
  color: "#20489a"
};
const btnPrimary = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 18px",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
  boxShadow: "0 2px 6px rgba(22,163,74,0.35)"
};
const btnGhost = {
  background: "#e3eefe",
  color: "#20489a",
  border: "none",
  borderRadius: 10,
  padding: "10px 18px",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer"
};
const btnReject = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
  boxShadow: "0 2px 6px rgba(220,38,38,0.35)"
};
const errBox = {
  background: "#F8D7DA",
  border: "1px solid #E58B94",
  color: "#721C24",
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 600
};
const okBox = {
  background: "#DCFCE7",
  border: "1px solid #86EFAC",
  color: "#166534",
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 600
};
const rejBox = {
  background: "#FEE2E2",
  border: "1px solid #FCA5A5",
  color: "#B91C1C",
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 600
};