// @ts-nocheck
"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import Navbar from "../components/Navbar";
import AuthGuard from "../components/AuthGuard";

function formatDataOra(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export default function LavagnaListPage() {
  const { data: session, status } = useSession();
  const [lavagne, setLavagne] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [clienti, setClienti] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState(null);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [mostraTutte, setMostraTutte] = useState(false);
  const [cercaQuery, setCercaQuery] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<null | {
    softDeletedRemoved: { tratti: number; forme: number };
    srcNullati: number;
    lavagneVecchie: { count: number; tratti: number; forme: number; soglia: string };
  }>(null);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [dbStats, setDbStats] = useState<null | {
    dbBytes: number;
    tables: {
      tratti: { bytes: number; rows: number; softDeleted: number };
      forme: { bytes: number; rows: number; softDeleted: number };
      lavagne: { bytes: number; rows: number };
    };
  }>(null);
  const [dbStatsLoading, setDbStatsLoading] = useState(false);

  // Form crea
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [attivitaList, setAttivitaList] = useState([]);
  const [attivitaLoading, setAttivitaLoading] = useState(false);
  const [selectedAttivitaId, setSelectedAttivitaId] = useState(""); // "" | "ad-hoc" | "123"
  const [newTitle, setNewTitle] = useState("");

  const isAdmin = /^(admin|operatore)$/i.test(session?.user?.role || "");

  // ── Carica studenti (solo admin) ──────────────────────────────────────────
  useEffect(() => {
    if (status !== "authenticated" || !isAdmin) return;
    fetch("/api/clienti?tipo=STUDENTE")
      .then(r => r.json())
      .then(d => setClienti(Array.isArray(d) ? d : Array.isArray(d.clienti) ? d.clienti : []))
      .catch(() => setClienti([]));
  }, [status, isAdmin]);

  // ── Carica attività quando cambia lo studente ─────────────────────────────
  useEffect(() => {
    if (!selectedClienteId) { setAttivitaList([]); setSelectedAttivitaId(""); return; }
    setAttivitaLoading(true);
    setSelectedAttivitaId("");
    setNewTitle("");
    fetch(`/api/attivita/list?clienteId=${selectedClienteId}`)
      .then(r => r.json())
      .then(d => setAttivitaList(Array.isArray(d.attivita) ? d.attivita : []))
      .catch(() => setAttivitaList([]))
      .finally(() => setAttivitaLoading(false));
  }, [selectedClienteId]);

  // ── Pre-compila titolo quando si seleziona un'attività ────────────────────
  useEffect(() => {
    if (!selectedAttivitaId || selectedAttivitaId === "ad-hoc") {
      setNewTitle("");
      return;
    }
    const att = attivitaList.find(a => String(a.id) === selectedAttivitaId);
    if (att?.orario) {
      const nomeStudente = clienti.find(c => String(c.id) === selectedClienteId)?.nomeReferente || "";
      const base = formatDataOra(new Date(att.orario));
      setNewTitle(nomeStudente ? `${base} – ${nomeStudente}` : base);
    }
  }, [selectedAttivitaId, attivitaList, clienti, selectedClienteId]);

  // ── Carica lista lavagne ───────────────────────────────────────────────────
  const fetchLavagne = (filtroId = "", tutte = false) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroId) params.set("clienteId", filtroId);
    if (!tutte) params.set("days", "1");
    const qs = params.toString() ? `?${params}` : "";
    fetch(`/api/lavagna-v2/list${qs}`)
      .then(r => r.ok ? r.json() : { lavagne: [] })
      .then(d => setLavagne(Array.isArray(d.lavagne) ? d.lavagne : []))
      .catch(() => setLavagne([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchLavagne();
    if (isAdmin) fetchDbStats();
  }, [status, isAdmin]);

  // ── Crea lavagna ───────────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();
    if (!selectedClienteId) { alert("Seleziona uno studente."); return; }
    if (!selectedAttivitaId) { alert("Seleziona un'attività o scegli 'Crea ad-hoc'."); return; }

    const nomeStudente = clienti.find(c => String(c.id) === selectedClienteId)?.nomeReferente || "";
    const titoloAuto = `${formatDataOra(new Date())}${nomeStudente ? ` – ${nomeStudente}` : ""}`;

    const titoloFinale = newTitle.trim() || titoloAuto;

    setCreating(true);
    try {
      const res = await fetch("/api/lavagna-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titolo: titoloFinale,
          clienteId: Number(selectedClienteId),
        }),
      });
      const js = await res.json();
      if (res.ok) {
        setLavagne(prev => [js.lavagna, ...prev]);
        closeCreate();
        window.open(`/lavagna/canvas?lavagnaId=${js.lavagna.id}`, "_blank");
      } else {
        alert(js.error || "Errore nella creazione");
      }
    } catch {
      alert("Errore di rete");
    } finally {
      setCreating(false);
    }
  }

  async function fetchDbStats() {
    if (!isAdmin) return;
    setDbStatsLoading(true);
    try {
      const res = await fetch("/api/db-stats");
      if (res.ok) setDbStats(await res.json());
    } catch {}
    finally { setDbStatsLoading(false); }
  }

  async function handleCleanup() {
    if (!window.confirm("Eliminare definitivamente tutte le lavagne collegate a lezioni svolte più di 6 mesi fa?\n\nQuesta operazione è irreversibile.")) return;
    setCleaning(true);
    setCleanupResult(null);
    setCleanupError(null);
    try {
      const res = await fetch("/api/lavagna/cleanup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setCleanupError(data.error || "Errore durante la pulizia"); return; }
      setCleanupResult(data);
      fetchDbStats();
    } catch {
      setCleanupError("Errore di rete");
    } finally {
      setCleaning(false);
    }
  }

  function closeCreate() {
    setShowCreate(false);
    setSelectedClienteId("");
    setSelectedAttivitaId("");
    setNewTitle("");
    setAttivitaList([]);
  }

  // ── Elimina lavagna ────────────────────────────────────────────────────────
  async function handleDelete(id) {
    if (!window.confirm("Eliminare questa lavagna? L'azione è irreversibile.")) return;
    try {
      const res = await fetch(`/api/lavagna-v2?id=${id}`, { method: "DELETE" });
      if (res.ok) setLavagne(prev => prev.filter(l => l.id !== id));
      else alert("Errore nell'eliminazione");
    } catch {
      alert("Errore di rete");
    }
  }

  // ── Filtra per ricerca ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lavagne;
    return lavagne.filter(l =>
      (l.titolo || "").toLowerCase().includes(q) ||
      (l.cliente?.nomeReferente || l.cliente?.email || "").toLowerCase().includes(q)
    );
  }, [lavagne, search]);

  // ── Filtra lavagne precedenti per query ───────────────────────────────────
  const filteredCerca = useMemo(() => {
    const q = cercaQuery.trim().toLowerCase();
    if (!q) return lavagne;
    return lavagne.filter(l =>
      (l.titolo || "").toLowerCase().includes(q) ||
      (l.cliente?.nomeReferente || l.cliente?.email || "").toLowerCase().includes(q)
    );
  }, [lavagne, cercaQuery]);

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f8ff" }}>
        <Navbar />
        <div style={{ padding: 50, color: "#6b7280" }}>Caricamento…</div>
      </div>
    );
  }

  const nomeStudenteSelezionato = clienti.find(c => String(c.id) === selectedClienteId)?.nomeReferente || "";

  return (
    <AuthGuard>
      <div style={{ minHeight: "100vh", background: "#f5f8ff" }}>
        <Navbar />
        <main style={{ maxWidth: 900, margin: "40px auto 60px", background: "#fff", borderRadius: 24, padding: "36px 40px 48px", boxShadow: "0 6px 34px rgba(32,72,154,0.13)", fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#20489a" }}>
                Lavagna
              </h1>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                {mostraTutte ? "Tutte le lavagne" : "Oggi"} · {filtered.length} lavagn{filtered.length === 1 ? "a" : "e"}
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => showCreate ? closeCreate() : setShowCreate(true)}
                style={{ background: "#1cb0f6", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 2px 8px rgba(28,176,246,0.3)" }}
              >
                {showCreate ? "Annulla" : "+ Nuova lavagna"}
              </button>
            )}
          </div>

          {/* ── Form crea ─────────────────────────────────────────────────── */}
          {showCreate && (
            <form onSubmit={handleCreate} style={{ background: "#f0f7ff", border: "1px solid #bfdbfe", borderRadius: 14, padding: "20px 22px", marginBottom: 28 }}>

              {/* 1. Seleziona studente */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#1e40af", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  1. Studente *
                </label>
                <select
                  value={selectedClienteId}
                  onChange={e => setSelectedClienteId(e.target.value)}
                  required
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #93c5fd", fontSize: 14, outline: "none", background: "#fff" }}
                >
                  <option value="">Seleziona studente…</option>
                  {clienti.map(c => (
                    <option key={c.id} value={c.id}>{c.nomeReferente || c.email}</option>
                  ))}
                </select>
              </div>

              {/* 2. Seleziona attività */}
              {selectedClienteId && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#1e40af", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    2. Associa a lezione
                  </label>
                  {attivitaLoading ? (
                    <div style={{ fontSize: 13, color: "#6b7280" }}>Caricamento lezioni…</div>
                  ) : (
                    <select
                      value={selectedAttivitaId}
                      onChange={e => setSelectedAttivitaId(e.target.value)}
                      required
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #93c5fd", fontSize: 14, outline: "none", background: "#fff" }}
                    >
                      <option value="">Seleziona lezione…</option>
                      {attivitaList.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.orario ? formatDataOra(new Date(a.orario)) : "—"}{a.descrizione ? ` · ${a.descrizione}` : ""}
                        </option>
                      ))}
                      <option value="ad-hoc">── Crea lavagna ad-hoc (senza lezione)</option>
                    </select>
                  )}
                </div>
              )}

              {/* 3. Titolo personalizzato */}
              {selectedAttivitaId && (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#1e40af", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    3. Titolo (opzionale)
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder={
                      selectedAttivitaId === "ad-hoc"
                        ? `${formatDataOra(new Date())}${nomeStudenteSelezionato ? ` – ${nomeStudenteSelezionato}` : ""}`
                        : newTitle || `${formatDataOra(new Date())}${nomeStudenteSelezionato ? ` – ${nomeStudenteSelezionato}` : ""}`
                    }
                    style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "1px solid #93c5fd", fontSize: 14, outline: "none" }}
                  />
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                    Se vuoto verrà usato: <em>{newTitle || (selectedAttivitaId !== "ad-hoc" ? (attivitaList.find(a => String(a.id) === selectedAttivitaId)?.orario ? `${formatDataOra(new Date(attivitaList.find(a => String(a.id) === selectedAttivitaId).orario))} – ${nomeStudenteSelezionato}` : "") : `${formatDataOra(new Date())}${nomeStudenteSelezionato ? ` – ${nomeStudenteSelezionato}` : ""}`)}</em>
                  </div>
                </div>
              )}

              {selectedAttivitaId && (
                <button
                  type="submit"
                  disabled={creating}
                  style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "9px 22px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                >
                  {creating ? "Creazione…" : "Crea e apri"}
                </button>
              )}
            </form>
          )}

          {/* Filtro + Ricerca */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            {isAdmin && clienti.length > 0 && (
              <select
                value={clienteFiltro}
                onChange={e => { setClienteFiltro(e.target.value); fetchLavagne(e.target.value, mostraTutte); }}
                style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
              >
                <option value="">Tutti gli studenti</option>
                {clienti.map(c => (
                  <option key={c.id} value={c.id}>{c.nomeReferente || c.email}</option>
                ))}
              </select>
            )}
            {lavagne.length > 4 && (
              <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
                <input
                  type="text"
                  placeholder="Cerca…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", padding: "7px 12px 7px 32px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", background: "#f8fbff" }}
                />
                <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="#9ab0d4" strokeWidth="2"/>
                  <path d="M16.5 16.5L21 21" stroke="#9ab0d4" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            )}
          </div>

          {/* Lista (solo in modalità 7 giorni) */}
          {!mostraTutte && loading ? (
            <div style={{ color: "#9ab0d4", fontSize: 14, padding: "20px 0" }}>Caricamento lavagne…</div>
          ) : !mostraTutte && filtered.length === 0 ? (
            <div style={{ background: "#f0f5ff", border: "1px solid #d4dff6", color: "#20489a", padding: "16px 20px", borderRadius: 12, fontSize: 14, fontWeight: 500 }}>
              {lavagne.length === 0
                ? (isAdmin ? "Nessuna lavagna. Creane una nuova." : "Nessuna lavagna disponibile.")
                : `Nessun risultato per "${search}".`}
            </div>
          ) : !mostraTutte ? (
            <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map(l => {
                const nomeStudente = l.cliente?.nomeReferente || l.cliente?.email || null;
                return (
                  <li
                    key={l.id}
                    onMouseEnter={() => setHoveredId(l.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      background: hoveredId === l.id ? "#eef4ff" : "#f8fbff",
                      border: hoveredId === l.id ? "1px solid #b0c8f5" : "1px solid #dbe6f5",
                      borderRadius: 12, padding: "12px 16px",
                      display: "flex", alignItems: "center", gap: 12,
                      transition: "background 0.15s, border-color 0.15s",
                      boxShadow: hoveredId === l.id ? "0 2px 8px rgba(20,53,120,0.09)" : "none",
                    }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2"/>
                        <path d="M8 21h8M12 17v4"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "#1e3a5f", fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {l.titolo || "Lavagna"}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {nomeStudente && isAdmin && (
                          <span style={{ background: "#e0f2fe", color: "#0369a1", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>
                            {nomeStudente}
                          </span>
                        )}
                        <span>Creata {new Date(l.createdAt).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => window.open(`/lavagna/canvas?lavagnaId=${l.id}`, "_blank")}
                        style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                      >
                        Apri
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(l.id)}
                          style={{ background: "transparent", color: "#ef4444", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 10px", fontWeight: 600, fontSize: 12, cursor: "pointer", opacity: hoveredId === l.id ? 1 : 0, transition: "opacity 0.15s" }}
                        >
                          Elimina
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {/* ── Sezione lavagne precedenti ────────────────────────────────── */}
          {!mostraTutte ? (
            <div style={{ marginTop: 28, borderTop: "1px solid #e9f0fb", paddingTop: 20 }}>
              <button
                onClick={() => {
                  setMostraTutte(true);
                  fetchLavagne(clienteFiltro, true);
                }}
                style={{ background: "none", border: "1px solid #b0c8f5", color: "#2563eb", borderRadius: 8, padding: "8px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/>
                </svg>
                Cerca lavagne precedenti
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 28, borderTop: "1px solid #e9f0fb", paddingTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                  <input
                    type="text"
                    placeholder="Cerca per titolo o studente…"
                    value={cercaQuery}
                    onChange={e => setCercaQuery(e.target.value)}
                    autoFocus
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px 8px 34px", borderRadius: 8, border: "1px solid #b0c8f5", fontSize: 13, outline: "none", background: "#f8fbff" }}
                  />
                  <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="#9ab0d4" strokeWidth="2"/>
                    <path d="M16.5 16.5L21 21" stroke="#9ab0d4" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <button
                  onClick={() => { setMostraTutte(false); setCercaQuery(""); fetchLavagne(clienteFiltro, false); }}
                  style={{ background: "none", border: "1px solid #e2e8f0", color: "#6b7280", borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                >
                  Torna alle lavagne di oggi
                </button>
              </div>
              {loading ? (
                <div style={{ color: "#9ab0d4", fontSize: 14 }}>Caricamento…</div>
              ) : filteredCerca.length === 0 ? (
                <div style={{ color: "#6b7280", fontSize: 13 }}>
                  {cercaQuery ? `Nessun risultato per "${cercaQuery}".` : "Nessuna lavagna trovata."}
                </div>
              ) : (
                <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredCerca.map(l => {
                    const nomeStudente = l.cliente?.nomeReferente || l.cliente?.email || null;
                    return (
                      <li key={l.id} onMouseEnter={() => setHoveredId(l.id)} onMouseLeave={() => setHoveredId(null)}
                        style={{ background: hoveredId === l.id ? "#eef4ff" : "#f8fbff", border: hoveredId === l.id ? "1px solid #b0c8f5" : "1px solid #dbe6f5", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, transition: "background 0.15s, border-color 0.15s" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: "#1e3a5f", fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.titolo || "Lavagna"}</div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {nomeStudente && isAdmin && <span style={{ background: "#e0f2fe", color: "#0369a1", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>{nomeStudente}</span>}
                            <span>Creata {new Date(l.createdAt).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => window.open(`/lavagna/canvas?lavagnaId=${l.id}`, "_blank")}
                          style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 }}
                        >
                          Apri
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
          {/* ── Manutenzione (solo admin) ─────────────────────────────────── */}
          {isAdmin && (
            <div style={{ marginTop: 36, borderTop: "1px solid #e9f0fb", paddingTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>
                Manutenzione
              </div>

              {/* ── Stato storage DB ── */}
              <div style={{ background: "#f8fbff", border: "1px solid #dbe6f5", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e3a5f" }}>Storage database (Neon free tier)</div>
                  <button
                    onClick={fetchDbStats}
                    disabled={dbStatsLoading}
                    title="Aggiorna statistiche"
                    style={{ background: "none", border: "1px solid #b0c8f5", color: "#2563eb", borderRadius: 6, padding: "3px 10px", fontSize: 12, cursor: dbStatsLoading ? "not-allowed" : "pointer", fontWeight: 600 }}
                  >
                    {dbStatsLoading ? "…" : "↻ Aggiorna"}
                  </button>
                </div>

                {dbStats ? (() => {
                  const LIMIT_BYTES = 512 * 1024 * 1024;
                  const used = dbStats.dbBytes;
                  const pct = Math.min(100, Math.round((used / LIMIT_BYTES) * 100));
                  const usedMB = (used / (1024 * 1024)).toFixed(1);
                  const barColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#22c55e";

                  const fmtMB = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

                  return (
                    <div>
                      {/* progress bar */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <div style={{ flex: 1, height: 12, background: "#e2e8f0", borderRadius: 6, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 6, transition: "width 0.4s" }} />
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: pct >= 90 ? "#ef4444" : "#334155", whiteSpace: "nowrap" }}>
                          {usedMB} MB / 512 MB ({pct}%)
                        </div>
                      </div>

                      {/* per-table breakdown */}
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                        {[
                          { label: "Tratti", data: dbStats.tables.tratti, icon: "✏️" },
                          { label: "Forme", data: dbStats.tables.forme, icon: "⬜" },
                          { label: "Lavagne", data: dbStats.tables.lavagne, icon: "🖼️" },
                        ].map(({ label, data, icon }) => (
                          <div key={label} style={{ flex: 1, minWidth: 120, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px" }}>
                            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 3 }}>{icon} {label}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e3a5f" }}>{fmtMB(data.bytes)}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{data.rows} righe{data.softDeleted ? ` · ${data.softDeleted} cancellati` : ""}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })() : (
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>{dbStatsLoading ? "Caricamento statistiche…" : "Statistiche non disponibili"}</div>
                )}
              </div>

              {/* ── Bottone pulizia ── */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={handleCleanup}
                  disabled={cleaning}
                  style={{
                    background: cleaning ? "#f1f5f9" : "#fee2e2",
                    color: cleaning ? "#94a3b8" : "#991b1b",
                    border: "1.5px solid",
                    borderColor: cleaning ? "#e2e8f0" : "#fca5a5",
                    borderRadius: 8, padding: "8px 18px",
                    fontWeight: 700, fontSize: 13, cursor: cleaning ? "not-allowed" : "pointer",
                  }}
                >
                  {cleaning ? "Pulizia in corso…" : "🗑️ Pulisci lavagne > 6 mesi"}
                </button>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                  Rimuove tratti/forme eliminati e cancella le lavagne di lezioni risalenti a oltre 6 mesi fa
                </span>
              </div>

              {cleanupResult && (
                <div style={{ marginTop: 12, background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#166534", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>✓ Pulizia completata</div>
                  <div>· Tratti/forme soft-deleted rimossi: <b>{cleanupResult.softDeletedRemoved.tratti}</b> tratti, <b>{cleanupResult.softDeletedRemoved.forme}</b> forme</div>
                  <div>· Immagini (src) svuotate: <b>{cleanupResult.srcNullati}</b></div>
                  <div>· Lavagne vecchie eliminate: <b>{cleanupResult.lavagneVecchie.count}</b> ({cleanupResult.lavagneVecchie.tratti} tratti, {cleanupResult.lavagneVecchie.forme} forme)</div>
                  <div style={{ fontSize: 11, color: "#4ade80", marginTop: 2 }}>Soglia: lezioni precedenti al {new Date(cleanupResult.lavagneVecchie.soglia).toLocaleDateString("it-IT")}</div>
                </div>
              )}
              {cleanupError && (
                <div style={{ marginTop: 12, background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: "#991b1b" }}>
                  Errore: {cleanupError}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
