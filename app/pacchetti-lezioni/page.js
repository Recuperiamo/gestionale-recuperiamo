"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";

import { useRichiesteModifica } from "../components/modifiche/useRichiesteModifica";
import AttivitaDettaglioModal from "../components/attivita/AttivitaDettaglioModal";
import RichiestaModificaModal from "../components/modifiche/RichiestaModificaModal";

export default function PacchettiLezioniPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [attivita, setAttivita] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState(null);

  const [attivitaSelezionata, setAttivitaSelezionata] = useState(null);
  const [attivitaPerRichiesta, setAttivitaPerRichiesta] = useState(null);
  const [showRichiesta, setShowRichiesta] = useState(false);

  const isCliente = session?.user?.role === "cliente";

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/signin");
      return;
    }
    fetch("/api/attivita", { cache: "no-store" })
      .then(r => {
        if (!r.ok) throw new Error("Err " + r.status);
        return r.json();
      })
      .then(js => {
        setAttivita(Array.isArray(js) ? js : []);
        setErrore(null);
      })
      .catch(e => setErrore(e.message))
      .finally(() => setLoading(false));
  }, [status, session, router]);

  // Hook richieste
  const { richieste, byAttivita, refetch } = useRichiesteModifica({ auto: isCliente });

  // Helpers
  function parseStart(a) {
    return new Date(a.orario || a.createdAt);
  }
  function formatDate(a) {
    const d = parseStart(a);
    const data = d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${data} ${time}`;
  }
  function hasOpenRequest(aId) {
    const list = byAttivita[aId] || [];
    return list.some(r => ["pending", "in_review"].includes(r.stato));
  }

  function canShowRequestButton(a) {
    if (!isCliente) return false;
    if (hasOpenRequest(a.id)) return false;
    const start = parseStart(a).getTime();
    const now = Date.now();
    // Consideriamo prenotata se nel futuro o stato esplicitamente 'Prenotata'
    const isFuture = start >= now;
    const statoMatch = (a.stato || "").toLowerCase() === "prenotata";
    return isFuture || statoMatch;
  }

  // Split prenotate / svolte
  const { prenotate, svolte } = useMemo(() => {
    const now = Date.now();
    const pren = [];
    const sv = [];
    attivita.forEach(a => {
      const startTs = parseStart(a).getTime();
      const statoLower = (a.stato || "").toLowerCase();
      const isPren =
        statoLower === "prenotata" ||
        startTs >= now;
      if (isPren) pren.push(a); else sv.push(a);
    });
    pren.sort((a, b) => parseStart(a) - parseStart(b));              // future asc
    sv.sort((a, b) => parseStart(b) - parseStart(a));                // past desc
    return { prenotate: pren, svolte: sv };
  }, [attivita]);

  function openDettaglio(a) { setAttivitaSelezionata(a); }
  function openRichiesta(a) {
    setAttivitaPerRichiesta(a);
    setShowRichiesta(true);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f8ff" }}>
      <Navbar />
      <main
        style={{
          maxWidth: 1200,
          margin: "60px auto 40px auto",
          background: "#fff",
          borderRadius: 28,
          padding: "40px 42px 48px",
          boxShadow: "0 6px 34px rgba(32,72,154,0.15)",
          fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
          color: "#20489a"
        }}
      >
        <h1 style={{ fontSize: 32, fontWeight: 800, textAlign: "center", margin: "0 0 34px" }}>
          Pacchetti & Lezioni
        </h1>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>Caricamento…</div>
        ) : errore ? (
          <div style={errBox}>Errore: {errore}</div>
        ) : (
          <>
            {/* ================== LEZIONI PRENOTATE ================== */}
            <SectionTitle>Lezioni Prenotate (future / prenotate)</SectionTitle>
            <TableWrapper>
              <MainTable
                emptyLabel="Nessuna lezione prenotata"
                columns={["Data / Orario", "Descrizione", "Ore", "Richiesta Aperta", "Ultimo Stato", "Azioni"]}
                rows={prenotate.map((a, i) => {
                  const reqList = byAttivita[a.id] || [];
                  const openReq = reqList.find(r => ["pending", "in_review"].includes(r.stato));
                  const lastReq = [...reqList].sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt))[0];
                  return {
                    key: a.id,
                    cells: [
                      {
                        content: formatDate(a),
                        clickable: true,
                        onClick: () => openDettaglio(a)
                      },
                      a.descrizione || `Lezione #${a.id}`,
                      a.oreConsumate ?? a.durataOre ?? "—",
                      openReq ? (
                        <Badge color="#FFF3B0" text="#8C7800">{openReq.stato}</Badge>
                      ) : "—",
                      lastReq ? (
                        <Badge
                          color={
                            lastReq.stato === "rejected"
                              ? "#F8D7DA"
                              : lastReq.stato === "approved"
                              ? "#C7F7D7"
                              : lastReq.stato === "in_review"
                              ? "#D4F0FC"
                              : "#FFF3B0"
                          }
                          text={
                            lastReq.stato === "rejected"
                              ? "#721C24"
                              : lastReq.stato === "approved"
                              ? "#12753A"
                              : lastReq.stato === "in_review"
                              ? "#20489A"
                              : "#8C7800"
                          }
                        >
                          {lastReq.stato}
                        </Badge>
                      ) : "—",
                      canShowRequestButton(a) ? (
                        <button
                          onClick={() => openRichiesta(a)}
                          style={btnMiniPrimary}
                        >
                          Richiedi modifica
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, opacity: 0.6 }}>—</span>
                      )
                    ]
                  };
                })}
              />
            </TableWrapper>

            {/* ================== LEZIONI SVOLTE ================== */}
            <SectionTitle>Lezioni Svolte / Passate</SectionTitle>
            <TableWrapper>
              <MainTable
                emptyLabel="Nessuna lezione svolta"
                columns={["Data / Orario", "Descrizione", "Ore", "Ultimo Stato", "Richiesta Recente"]}
                rows={svolte.map(a => {
                  const reqList = byAttivita[a.id] || [];
                  const lastReq = [...reqList].sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt))[0];
                  return {
                    key: a.id,
                    cells: [
                      {
                        content: formatDate(a),
                        clickable: true,
                        onClick: () => openDettaglio(a)
                      },
                      a.descrizione || `Lezione #${a.id}`,
                      a.oreConsumate ?? a.durataOre ?? "—",
                      (a.stato || "").length ? a.stato : "—",
                      lastReq ? (
                        <Badge
                          color={
                            lastReq.stato === "rejected"
                              ? "#F8D7DA"
                              : lastReq.stato === "approved"
                              ? "#C7F7D7"
                              : lastReq.stato === "in_review"
                              ? "#D4F0FC"
                              : "#FFF3B0"
                          }
                          text={
                            lastReq.stato === "rejected"
                              ? "#721C24"
                              : lastReq.stato === "approved"
                              ? "#12753A"
                              : lastReq.stato === "in_review"
                              ? "#20489A"
                              : "#8C7800"
                          }
                        >
                          {lastReq.stato}
                        </Badge>
                      ) : "—"
                    ]
                  };
                })}
              />
            </TableWrapper>

            {/* ================== RICHIESTE INVIATE ================== */}
            <SectionTitle>Richieste inviate (tutte)</SectionTitle>
            <TableWrapper>
              <MainTable
                emptyLabel="Nessuna richiesta"
                columns={["ID", "Attività", "Tipo", "Stato", "Creata", "Dettagli"]}
                rows={[...richieste]
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .map(r => ({
                    key: r.id,
                    cells: [
                      r.id,
                      r.attivitaId,
                      r.tipo,
                      <Badge
                        key={"st" + r.id}
                        color={
                          r.stato === "rejected"
                            ? "#F8D7DA"
                            : r.stato === "approved"
                            ? "#C7F7D7"
                            : r.stato === "in_review"
                            ? "#D4F0FC"
                            : "#FFF3B0"
                        }
                        text={
                          r.stato === "rejected"
                            ? "#721C24"
                            : r.stato === "approved"
                            ? "#12753A"
                            : r.stato === "in_review"
                            ? "#20489A"
                            : "#8C7800"
                        }
                      >
                        {r.stato}
                      </Badge>,
                      new Date(r.createdAt).toLocaleString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      }),
                      <span key={"det" + r.id} style={{ fontSize: 12 }}>
                        {r.noteStudente ? `Studente: ${r.noteStudente}` : ""}
                        {r.noteAdmin
                          ? `${r.noteStudente ? " | " : ""}Admin: ${r.noteAdmin}`
                          : ""}
                      </span>
                    ]
                  }))}
              />
            </TableWrapper>
          </>
        )}
      </main>

      {attivitaSelezionata && (
        <AttivitaDettaglioModal
          attivita={attivitaSelezionata}
          isCliente={isCliente}
          onClose={() => setAttivitaSelezionata(null)}
        />
      )}

      {isCliente && showRichiesta && attivitaPerRichiesta && (
        <RichiestaModificaModal
          open={showRichiesta}
          attivita={attivitaPerRichiesta}
          existingRichieste={byAttivita[attivitaPerRichiesta.id] || []}
          onSuccess={() => { refetch && refetch(); }}
          onClose={() => {
            setShowRichiesta(false);
            setAttivitaPerRichiesta(null);
          }}
        />
      )}
    </div>
  );
}

/* ========== Presentational Subcomponents / Styles ========== */
function SectionTitle({ children }) {
  return (
    <h2
      style={{
        fontSize: 22,
        fontWeight: 700,
        margin: "0 0 16px",
        color: "#20489a"
      }}
    >
      {children}
    </h2>
  );
}

function TableWrapper({ children }) {
  return (
    <div
      style={{
        overflowX: "auto",
        border: "1px solid #dde6f3",
        borderRadius: 16,
        background: "#f5f8ff",
        marginBottom: 36
      }}
    >
      {children}
    </div>
  );
}

function MainTable({ columns, rows, emptyLabel }) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "separate",
        borderSpacing: 0
      }}
    >
      <thead>
        <tr>
          {columns.map(c => (
            <Th key={c}>{c}</Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td
              colSpan={columns.length}
              style={{ textAlign: "center", padding: 30, color: "#5e6b85" }}
            >
              {emptyLabel}
            </td>
          </tr>
        )}
        {rows.map(r => (
          <tr key={r.key} style={{ background: Number(r.key) % 2 ? "#fff" : "#f7fafd" }}>
            {r.cells.map((cell, idx) => {
              if (typeof cell === "object" && cell !== null && "content" in cell) {
                return (
                  <Td
                    key={idx}
                    style={cell.clickable ? { cursor: "pointer", textDecoration: "underline" } : undefined}
                    onClick={cell.clickable ? cell.onClick : undefined}
                  >
                    {cell.content}
                  </Td>
                );
              }
              return <Td key={idx}>{cell}</Td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Th({ children }) {
  return (
    <th
      style={{
        padding: "12px 12px",
        background: "#f5f8ff",
        color: "#20489a",
        fontSize: 14,
        fontWeight: 700,
        borderBottom: "2px solid #dde6f3",
        textAlign: "left"
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, style, onClick }) {
  return (
    <td
      onClick={onClick}
      style={{
        padding: "11px 12px",
        fontSize: 14,
        color: "#20489a",
        borderBottom: "1px solid #e6edf6",
        verticalAlign: "top",
        ...style
      }}
    >
      {children}
    </td>
  );
}

function Badge({ children, color, text }) {
  return (
    <span
      style={{
        background: color,
        color: text,
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: ".3px",
        display: "inline-block",
        whiteSpace: "nowrap"
      }}
    >
      {children}
    </span>
  );
}

/* ========== Shared styles ========== */
const errBox = {
  background: "#F8D7DA",
  border: "1px solid #E58B94",
  color: "#721C24",
  padding: 18,
  borderRadius: 12,
  fontWeight: 600,
  marginBottom: 30
};

const btnMiniPrimary = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "6px 12px",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
  boxShadow: "0 1px 4px #2563eb55"
};