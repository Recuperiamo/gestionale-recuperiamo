"use client";
import React, { useEffect, useState, useRef, useMemo } from "react";

const HOURS_7 = 168;
const HOURS_3 = 72;

export default function RichiestaModificaModal({
  open,
  onClose,
  attivita,
  existingRichieste = [],
  onSuccess
}) {
  if (!open || !attivita) return null;

  const start = attivita.orario ? new Date(attivita.orario) : new Date(attivita.createdAt);
  const now = new Date();
  const diffHours = (start.getTime() - now.getTime()) / 3600000;

  const alreadyOpen = existingRichieste.some(r =>
    ["pending", "in_review"].includes(r.stato)
  );

  // Stati
  const [tipo, setTipo] = useState("cambio_orario");
  const [nuovaData, setNuovaData] = useState("");
  const [fasciaDa, setFasciaDa] = useState("");
  const [fasciaA, setFasciaA] = useState("");
  const [note, setNote] = useState("");
  const [warningAccepted, setWarningAccepted] = useState(diffHours >= HOURS_3);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && attivita) {
      const iso = start.toISOString();
      setNuovaData(iso.slice(0, 10));
      initializedRef.current = true;
    }
  }, [attivita, start]);

  useEffect(() => {
    if (tipo === "cancellazione") {
      setFasciaDa("");
      setFasciaA("");
    }
  }, [tipo]);

  const inSevenWindow = diffHours < HOURS_7;
  const inThreeWindow = diffHours < HOURS_3;
  const disableCancel = diffHours < HOURS_7;

  /* ================= Helpers ================= */
  function compareHm(a, b) {
    // a,b formato "HH:MM"
    return a.localeCompare(b); // less than zero if a<b (per stringhe HH:MM funziona)
  }

  function isPastDateTime(dateYYYYMMDD, timeHHMMSS) {
    // timeHHMMSS può essere "HH:MM:SS" o "HH:MM"
    const t = timeHHMMSS.length === 5 ? timeHHMMSS + ":00" : timeHHMMSS;
    const d = new Date(`${dateYYYYMMDD}T${t}`);
    if (isNaN(d.getTime())) return false;
    return d.getTime() <= Date.now();
  }

  /* ================= Validazioni ================= */
  function validateCambioData() {
    if (tipo !== "cambio_data") return true;
    if (!nuovaData) return false;
    const todayISO = new Date().toISOString().slice(0, 10);
    if (nuovaData < todayISO) {
      setError("La data scelta è nel passato.");
      return false;
    }
    const origISO = start.toISOString().slice(0, 10);
    if (diffHours < HOURS_7 && !(nuovaData < origISO)) {
      setError("Con meno di 7 giorni puoi solo anticipare (data precedente).");
      return false;
    }
    // fascia obbligatoria anche per cambio_data
    if (!fasciaDa || !fasciaA) {
      setError("Fascia oraria obbligatoria.");
      return false;
    }
    if (fasciaA <= fasciaDa) {
      setError("La fascia A deve essere successiva alla fascia DA.");
      return false;
    }

    // NUOVA VALIDAZIONE: la data combinata con l'orario ORIGINALE non deve essere nel passato
    const originalTime = start.toISOString().slice(11, 19); // HH:MM:SS
    if (isPastDateTime(nuovaData, originalTime)) {
      setError("La nuova data scelta risulta già nel passato.");
      return false;
    }

    return true;
  }

  function validateCambioOrario() {
    if (tipo !== "cambio_orario") return true;
    if (!fasciaDa || !fasciaA) {
      setError("Fascia oraria obbligatoria.");
      return false;
    }
    if (fasciaA <= fasciaDa) {
      setError("La fascia A deve essere successiva alla fascia DA.");
      return false;
    }
    // Se la lezione è oggi, la fascia non può iniziare nel passato
    const startIsToday =
      start.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
    if (startIsToday) {
      const currentHM =
        String(now.getHours()).padStart(2, "0") +
        ":" +
        String(now.getMinutes()).padStart(2, "0");
      if (compareHm(fasciaDa, currentHM) <= 0) {
        setError("La fascia inizia nel passato.");
        return false;
      }
    }
    return true;
  }

  const disabledSubmit = useMemo(() => {
    if (submitting || alreadyOpen) return true;

    if (tipo === "cambio_data") {
      if (!nuovaData) return true;
      if (!fasciaDa || !fasciaA) return true;
      if (fasciaA && fasciaDa && fasciaA <= fasciaDa) return true;
    }

    if (tipo === "cambio_orario") {
      if (!fasciaDa || !fasciaA) return true;
      if (fasciaA <= fasciaDa) return true;
      // se oggi e fasciaDa < adesso -> disabled (preventivo)
      const startIsToday =
        start.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
      if (startIsToday) {
        const currentHM =
          String(now.getHours()).padStart(2, "0") +
          ":" +
          String(now.getMinutes()).padStart(2, "0");
        if (compareHm(fasciaDa, currentHM) <= 0) return true;
      }
    }

    if (tipo === "cancellazione" && disableCancel) return true;
    if (inThreeWindow && tipo !== "cancellazione" && !warningAccepted) return true;
    return false;
  }, [
    submitting,
    alreadyOpen,
    tipo,
    nuovaData,
    fasciaDa,
    fasciaA,
    disableCancel,
    inThreeWindow,
    warningAccepted,
    start,
    now
  ]);

  function composeNote() {
    let n = note?.trim() || "";
    const fascia = (fasciaDa || fasciaA)
      ? `Fascia richiesta: ${fasciaDa || "??"} - ${fasciaA || "??"}`
      : null;
    if (tipo === "cambio_orario" || tipo === "cambio_data") {
      if (fascia) n = n ? n + "\n" + fascia : fascia;
    } else if (fascia) {
      n = n ? n + "\nDisponibilità: " + fasciaDa + " - " + fasciaA : `Disponibilità: ${fasciaDa} - ${fasciaA}`;
    }
    return n || null;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      if (tipo === "cambio_data" && !validateCambioData()) {
        setSubmitting(false);
        return;
      }
      if (tipo === "cambio_orario" && !validateCambioOrario()) {
        setSubmitting(false);
        return;
      }

      const payload = {
        attivitaId: attivita.id,
        tipo,
        noteStudente: composeNote()
      };

      if (tipo === "cambio_data") {
        const originalTime = start.toISOString().slice(11, 19);
        payload.nuovaData = new Date(`${nuovaData}T${originalTime}`).toISOString();
      }

      const res = await fetch("/api/modifiche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Errore " + res.status);
      } else {
        onSuccess && onSuccess(json);
        onClose();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <h3 style={title}>Richiedi modifica lezione</h3>

        {alreadyOpen && (
          <div style={alertBox}>
            Esiste già una richiesta aperta (pending / in_review).
          </div>
        )}

        {/* ALERT fascia 7-3 giorni */}
        {(!inThreeWindow && diffHours < HOURS_7 && tipo !== "cancellazione") && (
          <div style={warnBoxYellow}>
            <p style={warnTitle}>ATTENZIONE (&lt; 7 giorni)</p>
            <p style={warnText}>
              Il cambio è garantito solo entro la data di lezione attuale; se non si trova un accordo
              la lezione potrà essere considerata svolta. Fornisci la fascia oraria di disponibilità.
              Per ulteriori proposte usa le note.
            </p>
          </div>
        )}

        {/* ALERT <72 ore */}
        {(inThreeWindow && tipo !== "cancellazione") && (
          <div style={warnBoxRed}>
            <p style={warnTitleRed}>MENO DI 72 ORE</p>
            <p style={warnTextSmall}>
              Lezione imminente. In caso di mancato accordo la lezione sarà considerata svolta.
            </p>
            <label style={{ display: "flex", gap: 6, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={warningAccepted}
                onChange={e => setWarningAccepted(e.target.checked)}
              />
              Confermo di aver compreso
            </label>
          </div>
        )}

        {/* Tipo */}
        <div style={fieldGroup}>
          <label style={label}>Tipo richiesta</label>
          <select
            value={tipo}
            disabled={alreadyOpen}
            onChange={e => {
              setTipo(e.target.value);
              setError(null);
            }}
            style={select}
          >
            <option value="cambio_orario">Cambio orario</option>
            <option value="cambio_data">Cambio data</option>
            <option value="cancellazione" disabled={disableCancel}>
              Cancellazione {disableCancel ? "(non consentita <7g)" : ""}
            </option>
          </select>
        </div>

        {/* Cambio data */}
        {tipo === "cambio_data" && (
          <>
            <div style={fieldGroup}>
              <label style={label}>
                Nuova data {diffHours < HOURS_7 && "(solo precedente)"}
              </label>
              <input
                type="date"
                value={nuovaData}
                disabled={alreadyOpen}
                onChange={e => {
                  setError(null);
                  setNuovaData(e.target.value);
                }}
                style={input}
              />
            </div>
            <div style={fieldGroup}>
              <label style={label}>Fascia oraria (obbligatoria)</label>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <small style={subLabel}>DA</small>
                  <input
                    type="time"
                    value={fasciaDa}
                    onChange={e => setFasciaDa(e.target.value)}
                    style={input}
                    disabled={alreadyOpen}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <small style={subLabel}>A</small>
                  <input
                    type="time"
                    value={fasciaA}
                    onChange={e => setFasciaA(e.target.value)}
                    style={input}
                    disabled={alreadyOpen}
                  />
                </div>
              </div>
              {fasciaDa && fasciaA && fasciaA <= fasciaDa && (
                <div style={miniError}>La fascia A deve essere successiva alla fascia DA.</div>
              )}
            </div>
          </>
        )}

        {/* Cambio orario */}
        {tipo === "cambio_orario" && (
          <div style={fieldGroup}>
            <label style={label}>Fascia oraria (obbligatoria)</label>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <small style={subLabel}>DA</small>
                <input
                  type="time"
                  value={fasciaDa}
                  onChange={e => setFasciaDa(e.target.value)}
                  style={input}
                  disabled={alreadyOpen}
                />
              </div>
              <div style={{ flex: 1 }}>
                <small style={subLabel}>A</small>
                <input
                  type="time"
                  value={fasciaA}
                  onChange={e => setFasciaA(e.target.value)}
                  style={input}
                  disabled={alreadyOpen}
                />
              </div>
            </div>
            {fasciaDa && fasciaA && fasciaA <= fasciaDa && (
              <div style={miniError}>La fascia A deve essere successiva alla fascia DA.</div>
            )}
          </div>
        )}

        {/* Note */}
        <div style={fieldGroup}>
          <label style={label}>{tipo === "cancellazione" ? "Motivo (opzionale)" : "Note (opzionale)"}</label>
          <textarea
            rows={3}
            value={note}
            disabled={alreadyOpen}
            onChange={e => setNote(e.target.value)}
            style={textarea}
          />
        </div>

        {error && <div style={errorBox}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 18 }}>
          <button onClick={onClose} style={btnGhost}>Chiudi</button>
          <button
            disabled={disabledSubmit}
            onClick={handleSubmit}
            style={disabledSubmit ? btnDisabled : btnPrimary}
          >
            {submitting ? "Invio..." : "Invia richiesta"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Styles ===== */
const overlay = { position: "fixed", inset: 0, background: "rgba(32,72,154,0.32)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150 };
const modal = { background: "#fff", borderRadius: 18, padding: "28px 30px 24px", width: "min(520px,92vw)", boxShadow: "0 8px 30px rgba(32,72,154,0.25)", maxHeight: "88vh", overflowY: "auto" };
const title = { margin: "0 0 16px", fontSize: 20, fontWeight: 700, color: "#20489a" };
const fieldGroup = { marginBottom: 16, display: "flex", flexDirection: "column", gap: 6 };
const label = { fontSize: 13, fontWeight: 600, color: "#20489a", letterSpacing: ".3px" };
const subLabel = { display: "block", fontSize: 11, fontWeight: 600, color: "#4268b3", marginBottom: 4 };
const input = { border: "1.4px solid #4268b3", borderRadius: 8, padding: "8px 10px", fontSize: 14, color: "#20489a", background: "#fff", width: "100%" };
const textarea = { ...input, resize: "vertical" };
const select = { ...input, cursor: "pointer" };
const btnPrimary = { background: "#1cb0f6", color: "#fff", border: "none", fontWeight: 700, padding: "10px 20px", borderRadius: 10, cursor: "pointer", fontSize: 14 };
const btnDisabled = { ...btnPrimary, background: "#9dcfe7", cursor: "not-allowed" };
const btnGhost = { background: "#e3eefe", color: "#20489a", border: "none", fontWeight: 600, padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14 };
const warnBoxYellow = { borderRadius: 12, padding: "12px 14px 10px", background: "#FFF8D1", border: "1px solid #FACC15", marginBottom: 16 };
const warnBoxRed = { borderRadius: 12, padding: "12px 14px 10px", background: "#FFE4E6", border: "1px solid #FB7185", marginBottom: 16 };
const warnTitle = { margin: 0, fontWeight: 700, color: "#624900", fontSize: 12.5 };
const warnTitleRed = { ...warnTitle, color: "#9f1239" };
const warnText = { margin: "6px 0 0 0", fontSize: 12.5, lineHeight: 1.35, color: "#553E00" };
const warnTextSmall = { margin: "6px 0 0 0", fontSize: 12.5, lineHeight: 1.35, color: "#7f1d1d" };
const alertBox = { background: "#FFF3B0", border: "1px solid #E6C75F", color: "#8C7800", padding: "10px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600, marginBottom: 14 };
const errorBox = { background: "#F8D7DA", border: "1px solid #E58B94", color: "#721C24", padding: "10px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600, marginTop: -4 };
const miniError = { marginTop: 4, fontSize: 11, fontWeight: 600, color: "#b91c1c" };