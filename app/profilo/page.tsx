// @ts-nocheck
"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "../lib/auth/hooks";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import CalendarioAttivita from "../components/calendario/CalendarioAttivita";
import Link from "next/link";

// ─── helpers ──────────────────────────────────────────────────────────────────

function isoToDateInput(iso) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}
function isoToTimeInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function buildISO(date, time) {
  if (!date) return null;
  return new Date(`${date}T${time || "00:00"}`).toISOString();
}
function sortNote(arr) {
  return [...arr].sort((a, b) => {
    if (a.data && b.data) return new Date(a.data) - new Date(b.data);
    if (a.data) return -1;
    if (b.data) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}
function fmtDt(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function emptyForm() {
  return { testo: "", clienteIds: [], dateInizio: "", timeInizio: "", dateFine: "", timeFine: "" };
}

const inputSt = {
  width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0",
  borderRadius: 8, fontSize: 14, background: "#fff", boxSizing: "border-box",
};

// ─── modale nota ──────────────────────────────────────────────────────────────

function NotaModal({ nota, clienti, onSave, onClose }) {
  const editing = !!nota;
  const [form, setForm] = useState(() =>
    nota ? {
      testo: nota.testo,
      clienteIds: nota.clienteId ? [nota.clienteId] : [],
      dateInizio: isoToDateInput(nota.data),
      timeInizio: isoToTimeInput(nota.data),
      dateFine:   isoToDateInput(nota.dataFine),
      timeFine:   isoToTimeInput(nota.dataFine),
    } : emptyForm()
  );
  const [saving, setSaving] = useState(false);
  const [clientiOpen, setClientiOpen] = useState(false);
  const [search, setSearch] = useState("");

  const clientiFiltrati = clienti.filter(c =>
    !search || c.nomeReferente?.toLowerCase().includes(search.toLowerCase())
  );

  function toggleCliente(id) {
    setForm(p => ({
      ...p,
      clienteIds: p.clienteIds.includes(id)
        ? p.clienteIds.filter(x => x !== id)
        : [...p.clienteIds, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.testo.trim()) return;
    setSaving(true);
    try {
      const dataInizio = buildISO(form.dateInizio, form.timeInizio);
      const dataFine   = buildISO(form.dateFine,   form.timeFine);
      const nuove = [];

      if (editing) {
        const res = await fetch(`/api/note/${nota.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testo: form.testo,
            clienteId: form.clienteIds[0] ?? null,
            data: dataInizio,
            dataFine,
          }),
        });
        if (res.ok) nuove.push(await res.json());
      } else {
        const targets = form.clienteIds.length > 0 ? form.clienteIds : [null];
        for (const cid of targets) {
          const res = await fetch("/api/note", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ testo: form.testo, clienteId: cid ?? null, data: dataInizio, dataFine }),
          });
          if (res.ok) nuove.push(await res.json());
        }
      }
      if (nuove.length) onSave(nuove, editing);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 14, padding: 28,
        width: "100%", maxWidth: 560,
        boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
        maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
            {editing ? "Modifica nota" : "Nuova nota"}
          </h3>
          <button onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Testo */}
          <textarea autoFocus placeholder="Testo del promemoria..."
            value={form.testo} onChange={e => setForm(p => ({ ...p, testo: e.target.value }))}
            required style={{
              width: "100%", minHeight: 90, padding: 10,
              border: "1px solid #c4b5fd", borderRadius: 8, fontSize: 14,
              fontFamily: "inherit", resize: "vertical", background: "#faf5ff", boxSizing: "border-box",
            }} />

          {/* Dal – Al / Dalle – Alle */}
          <div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6, fontWeight: 600 }}>
              Periodo (opzionale — appare nel calendario)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 3 }}>Dal</label>
                <input type="date" value={form.dateInizio}
                  onChange={e => setForm(p => ({ ...p, dateInizio: e.target.value }))}
                  style={inputSt} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 3 }}>Al</label>
                <input type="date" value={form.dateFine}
                  min={form.dateInizio || undefined}
                  onChange={e => setForm(p => ({ ...p, dateFine: e.target.value }))}
                  disabled={!form.dateInizio}
                  style={{ ...inputSt, background: form.dateInizio ? "#fff" : "#f8fafc" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 3 }}>Dalle ore</label>
                <input type="time" value={form.timeInizio}
                  onChange={e => setForm(p => ({ ...p, timeInizio: e.target.value }))}
                  disabled={!form.dateInizio}
                  style={{ ...inputSt, background: form.dateInizio ? "#fff" : "#f8fafc" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 3 }}>Alle ore</label>
                <input type="time" value={form.timeFine}
                  onChange={e => setForm(p => ({ ...p, timeFine: e.target.value }))}
                  disabled={!form.dateFine}
                  style={{ ...inputSt, background: form.dateFine ? "#fff" : "#f8fafc" }} />
              </div>
            </div>
          </div>

          {/* Clienti a scomparsa */}
          <div>
            <button type="button" onClick={() => setClientiOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                background: clientiOpen ? "#f5f3ff" : "#f8fafc",
                border: "1px solid #e2e8f0", borderRadius: clientiOpen ? "8px 8px 0 0" : 8,
                padding: "8px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#64748b",
              }}>
              <span style={{ flex: 1, textAlign: "left" }}>
                👤 Clienti (opzionale)
                {form.clienteIds.length > 0 && (
                  <span style={{
                    marginLeft: 8, background: "#7C3AED", color: "#fff",
                    borderRadius: 10, padding: "1px 8px", fontSize: 11,
                  }}>{form.clienteIds.length}</span>
                )}
              </span>
              <span style={{ fontSize: 10 }}>{clientiOpen ? "▲" : "▼"}</span>
            </button>

            {clientiOpen && (
              <div style={{ border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
                <div style={{ padding: "6px 8px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  <input type="text" placeholder="Cerca…" value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: "100%", border: "none", background: "transparent", fontSize: 13, outline: "none", padding: "2px 4px" }} />
                </div>
                <div style={{ maxHeight: 160, overflowY: "auto" }}>
                  {clientiFiltrati.length === 0
                    ? <div style={{ padding: "10px 12px", fontSize: 13, color: "#94a3b8" }}>Nessun risultato</div>
                    : clientiFiltrati.map(c => (
                      <label key={c.id} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 12px", cursor: "pointer",
                        background: form.clienteIds.includes(c.id) ? "#f5f3ff" : "#fff",
                        borderBottom: "1px solid #f1f5f9",
                      }}>
                        <input type="checkbox"
                          checked={form.clienteIds.includes(c.id)}
                          onChange={() => toggleCliente(c.id)}
                          style={{ width: 15, height: 15, accentColor: "#7C3AED", cursor: "pointer" }} />
                        <span style={{ fontSize: 14, color: "#1e293b", flex: 1 }}>{c.nomeReferente}</span>
                        {c.tipo === "STUDENTE" && (
                          <span style={{ fontSize: 10, color: "#64748b", background: "#f1f5f9", borderRadius: 6, padding: "1px 6px" }}>
                            studente
                          </span>
                        )}
                      </label>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
            <button type="submit" disabled={saving || !form.testo.trim()}
              style={{
                background: "#7C3AED", color: "#fff", border: "none",
                borderRadius: 8, padding: "10px 22px", fontWeight: 600, fontSize: 14,
                cursor: saving || !form.testo.trim() ? "not-allowed" : "pointer",
                opacity: saving || !form.testo.trim() ? 0.6 : 1,
              }}>
              {saving ? "Salvataggio…" : editing ? "Salva modifiche" : form.clienteIds.length > 1 ? `Crea per ${form.clienteIds.length} clienti` : "Salva nota"}
            </button>
            <button type="button" onClick={onClose}
              style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 500, fontSize: 14, cursor: "pointer" }}>
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── card singola nota ────────────────────────────────────────────────────────

function NotaCard({ nota, isAdmin, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const start  = nota.data     ? new Date(nota.data)     : null;
  const end    = nota.dataFine ? new Date(nota.dataFine) : null;
  const isPast = end ? end < new Date() : (start ? start < new Date() : false);

  let rangeLabel = null;
  if (start && end) {
    const sameDay = start.toDateString() === end.toDateString();
    rangeLabel = sameDay
      ? `📅 ${fmtDt(nota.data)} → ${isoToTimeInput(nota.dataFine)}`
      : `📅 ${fmtDt(nota.data)} → ${fmtDt(nota.dataFine)}`;
  } else if (start) {
    rangeLabel = `📅 ${fmtDt(nota.data)}`;
  }

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      background: isPast ? "#f8fafc" : "#faf5ff",
      border: `1px solid ${isPast ? "#e2e8f0" : "#e9d5ff"}`,
      borderLeft: `4px solid ${isPast ? "#94a3b8" : "#7C3AED"}`,
      borderRadius: 8, padding: "12px 14px", opacity: isPast ? 0.75 : 1,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.5, wordBreak: "break-word" }}>
          {nota.testo}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {isAdmin && nota.cliente && (
            <Link href={`/clienti/${nota.cliente.id}`} style={{ textDecoration: "none" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: "#dbeafe", color: "#1d4ed8",
                fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
              }}>
                👤 {nota.cliente.nomeReferente}
              </span>
            </Link>
          )}
          {rangeLabel && (
            <span style={{
              background: isPast ? "#f1f5f9" : "#ede9fe",
              color: isPast ? "#64748b" : "#6d28d9",
              fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 12,
            }}>
              {rangeLabel}{isPast ? " (passata)" : ""}
            </span>
          )}
        </div>
      </div>
      {isAdmin && (
        <div style={{ flexShrink: 0, display: "flex", gap: 4 }}>
          {confirmDelete ? (
            <>
              <button onClick={onDelete}
                style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Elimina
              </button>
              <button onClick={() => setConfirmDelete(false)}
                style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>
                No
              </button>
            </>
          ) : (
            <>
              <button onClick={onEdit} title="Modifica"
                style={{ background: "#f5f3ff", color: "#7C3AED", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                ✏️
              </button>
              <button onClick={() => setConfirmDelete(true)} title="Elimina"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, padding: "2px 6px", borderRadius: 4 }}>
                ✕
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── pagina ───────────────────────────────────────────────────────────────────

export default function ProfiloPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [calView, setCalView] = useState("week");
  const [note, setNote] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [noteLoading, setNoteLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { nota: null | <obj> }

  const isAdmin = ["admin", "operatore"].includes(session?.user?.role);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.replace("/signin");
  }, [status, session, router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/note")
      .then(r => r.ok ? r.json() : [])
      .then(data => setNote(Array.isArray(data) ? sortNote(data) : []))
      .catch(() => {})
      .finally(() => setNoteLoading(false));

    if (isAdmin) {
      fetch("/api/clienti")
        .then(r => r.ok ? r.json() : [])
        .then(data => setClienti(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [session, isAdmin]);

  function handleSave(nuove, editing) {
    if (editing) {
      setNote(prev => sortNote(prev.map(n => n.id === nuove[0].id ? nuove[0] : n)));
    } else {
      setNote(prev => sortNote([...prev, ...nuove]));
    }
    setModal(null);
  }

  async function handleDelete(id) {
    await fetch(`/api/note/${id}`, { method: "DELETE" });
    setNote(prev => prev.filter(n => n.id !== id));
  }

  if (status === "loading" || !session) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f8ff" }}>
        <Navbar />
        <div style={{ textAlign: "center", padding: 50 }}>Caricamento…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f8ff", fontFamily: "'Segoe UI','Arial','Helvetica',sans-serif" }}>
      <Navbar />

      {modal !== null && (
        <NotaModal
          nota={modal.nota}
          clienti={clienti}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      <main style={{
        maxWidth: 1200, margin: "50px auto 40px",
        background: "#fff", borderRadius: 22, padding: "36px 34px 40px",
        boxShadow: "0 4px 28px rgba(32,72,154,0.12)", color: "#20489a",
      }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 34, fontWeight: 800, margin: 0, letterSpacing: ".6px" }}>
            {isAdmin ? "Pannello" : "Il tuo spazio"}
          </h1>
          <p style={{ color: "#64748b", marginTop: 6, fontSize: 16 }}>
            {session.user?.name || session.user?.email}
          </p>
        </div>

        {/* Azioni rapide (solo admin) */}
        {isAdmin && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 32 }}>
            {[
              { href: "/attivita",  label: "➕ Nuova lezione" },
              { href: "/clienti",   label: "👤 Clienti" },
              { href: "/pacchetti", label: "📦 Pacchetti" },
              { href: "/calendario",label: "📅 Calendario" },
              { href: "/richieste", label: "📋 Richieste" },
              { href: "/storico",   label: "📊 Storico" },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", background: "#e3eefe", color: "#20489a",
                borderRadius: 10, fontWeight: 600, fontSize: 13,
                textDecoration: "none", border: "1px solid #b2ccfc",
              }}>{label}</Link>
            ))}
          </div>
        )}

        {/* ── NOTE ── */}
        <section style={{ marginBottom: 36 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 14, paddingBottom: 10, borderBottom: "2px solid #e3eefe",
          }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
              📌 {isAdmin ? "Note e promemoria" : "Note dal docente"}
            </h2>
            {isAdmin && (
              <button onClick={() => setModal({ nota: null })}
                style={{
                  background: "#7C3AED", color: "#fff", border: "none",
                  borderRadius: 8, padding: "7px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}>
                + Aggiungi
              </button>
            )}
          </div>

          {noteLoading ? (
            <div style={{ color: "#94a3b8", textAlign: "center", padding: 20 }}>Caricamento…</div>
          ) : note.length === 0 ? (
            <div style={{ color: "#94a3b8", textAlign: "center", padding: 28, fontStyle: "italic" }}>
              {isAdmin ? "Nessuna nota. Usa il pulsante + per aggiungerne una." : "Nessuna nota dal docente."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {note.map(n => (
                <NotaCard key={n.id} nota={n} isAdmin={isAdmin}
                  onEdit={() => setModal({ nota: n })}
                  onDelete={() => handleDelete(n.id)} />
              ))}
            </div>
          )}
        </section>

        {/* ── CALENDARIO ── */}
        <section>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 14, paddingBottom: 10, borderBottom: "2px solid #e3eefe",
          }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
              📅 Calendario {isAdmin ? "attività" : "lezioni"}
            </h2>
            <button onClick={() => setCalView(v => v === "week" ? "month" : "week")}
              style={{
                background: "#e3eefe", color: "#20489a", border: "none", borderRadius: 8,
                fontWeight: 700, fontSize: 14, padding: "7px 18px", cursor: "pointer",
              }}>
              {calView === "week" ? "Vista mensile" : "Vista settimanale"}
            </button>
          </div>
          <CalendarioAttivita
            externalMode={calView}
            allowModeSwitch={false}
            allowNavigation={true}
            forceClienteId={isAdmin ? undefined : session.user?.clienteId}
            showLegend={true}
            enableStudentRequests={!isAdmin}
            enableAdminRequests={isAdmin}
          />
        </section>
      </main>
    </div>
  );
}
