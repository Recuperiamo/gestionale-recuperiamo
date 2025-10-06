"use client";
import React, { useMemo } from "react";

export default function StoricoRichiesteModificaTable({ richieste = [], isCliente }) {
  const rows = useMemo(() => {
    return richieste
      .filter(r => (isCliente ? r.stato !== "archived" : true))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(r => {
        const att = r.attivita;
        const fascia = extractFascia(r.noteStudente);
        const orarioOriginario = att?.orarioOriginale ? new Date(att.orarioOriginale) : null;
        const orarioCorrente = att?.orario ? new Date(att.orario) : null;
        const proposto = r.nuovaData
          ? new Date(r.nuovaData)
          : r.nuovoOrario
            ? new Date(r.nuovoOrario)
            : null;

        const fmt = d => d
          ? d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }) +
            " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "—";

        return {
          id: r.id,
          dataRichiesta: fmt(new Date(r.createdAt)),
          lezioneId: r.attivitaId,
          tipo: r.tipo,
          stato: r.stato,
          fascia,
          orarioOriginario: fmt(orarioOriginario),
          orarioProposto: fmt(proposto),
          orarioDefinitivo: (r.stato === "approved" || r.stato === "archived") ? fmt(orarioCorrente) : "—",
          note: summarizeNotes(r)
        };
      });
  }, [richieste, isCliente]);

  return (
    <div>
      <h2 style={{ color: "#1976d2", margin: "0 0 18px" }}>Storico Richieste Modifica Lezioni</h2>
      <div style={{
        overflowX: "auto",
        border: "1px solid #dde6f3",
        borderRadius: 14,
        background: "#f5f8ff"
      }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Data richiesta</Th>
              <Th>Lezione</Th>
              <Th>Tipo</Th>
              <Th>Stato</Th>
              <Th>Fascia richiesta</Th>
              <Th>Orario originario</Th>
              <Th>Orario proposto</Th>
              <Th>Orario definitivo</Th>
              <Th style={{ minWidth: 180 }}>Note</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 28, color: "#4e637f" }}>
                  Nessuna richiesta storica
                </td>
              </tr>
            )}
            {rows.map(r => (
              <tr key={r.id} style={{ background: r.id % 2 ? "#fff" : "#f7fafd" }}>
                <Td>{r.id}</Td>
                <Td>{r.dataRichiesta}</Td>
                <Td>{r.lezioneId}</Td>
                <Td>{r.tipo}</Td>
                <Td>{badgeStato(r.stato)}</Td>
                <Td>{r.fascia || "—"}</Td>
                <Td>{r.orarioOriginario}</Td>
                <Td>{r.orarioProposto}</Td>
                <Td>{r.orarioDefinitivo}</Td>
                <Td style={{ fontSize: 12, whiteSpace: "pre-line" }}>{r.note || "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isCliente && (
        <p style={{ fontSize: 11.5, color: "#5a6d90", marginTop: 10 }}>
          Nota: "archived" = richiesta approvata e poi superata da una nuova approvazione sulla stessa lezione (solo staff).
        </p>
      )}
    </div>
  );
}

/* Helpers */
function extractFascia(note) {
  if (!note) return null;
  const m = note.match(/Fascia richiesta:\s*([0-9]{2}:[0-9]{2})\s*-\s*([0-9]{2}:[0-9]{2})/i);
  return m ? `${m[1]} - ${m[2]}` : null;
}
function summarizeNotes(r) {
  const parts = [];
  if (r.noteStudente) parts.push(`Stud: ${r.noteStudente}`);
  if (r.noteAdmin) parts.push(`Adm: ${r.noteAdmin}`);
  return parts.join("\n");
}

function badgeStato(stato) {
  const style = {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: ".3px"
  };
  switch (stato) {
    case "approved": return <span style={{ ...style, background: "#C7F7D7", color: "#12753A" }}>approved</span>;
    case "rejected": return <span style={{ ...style, background: "#F8D7DA", color: "#721C24" }}>rejected</span>;
    case "in_review": return <span style={{ ...style, background: "#D4F0FC", color: "#20489A" }}>in_review</span>;
    case "archived": return <span style={{ ...style, background: "#E5E7EB", color: "#374151" }}>archived</span>;
    default: return <span style={{ ...style, background: "#FFF3B0", color: "#8C7800" }}>{stato}</span>;
  }
}

/* Small presentational cells */
function Th({ children, style }) {
  return (
    <th style={{
      padding: "11px 10px",
      background: "#f5f8ff",
      color: "#20489a",
      fontSize: 12.5,
      fontWeight: 700,
      borderBottom: "2px solid #dde6f3",
      textAlign: "left",
      ...style
    }}>{children}</th>
  );
}
function Td({ children, style }) {
  return (
    <td style={{
      padding: "10px 10px",
      fontSize: 12.5,
      color: "#20489a",
      borderBottom: "1px solid #e6edf6",
      verticalAlign: "top",
      ...style
    }}>{children}</td>
  );
}