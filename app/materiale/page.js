"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import Navbar from "../components/Navbar";

// Materie liceo scientifico (senza Disegno/Arte, Educazione fisica)
const materieLiceo = [
  "Matematica", "Fisica", "Chimica", "Biologia", "Scienze naturali", "Scienze della Terra",
  "Informatica", "Italiano", "Latino", "Inglese", "Filosofia", "Storia", "Geografia"
];

// --- COMMENTI: gestione locale (per demo, sostituire con API per DB/file persistente) ---
function useCommenti(materiali) {
  const [commenti, setCommenti] = useState({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem("materiali_commenti");
      if (raw) setCommenti(JSON.parse(raw));
    } catch {}
  }, []);
  function addCommento(materialeId, autore, testo) {
    const nuovo = { ...commenti };
    if (!nuovo[materialeId]) nuovo[materialeId] = [];
    nuovo[materialeId].push({
      autore,
      testo,
      createdAt: new Date().toISOString()
    });
    setCommenti(nuovo);
    localStorage.setItem("materiali_commenti", JSON.stringify(nuovo));
  }
  return [commenti, addCommento];
}

// --- COMPONENTE SELECT CLIENTE (solo admin/operator) ---
function ClienteSelect({ value, onChange }) {
  const [clienti, setClienti] = useState([]);
  useEffect(() => {
    fetch("/api/clienti")
      .then(r => r.json())
      .then(setClienti)
      .catch(() => setClienti([]));
  }, []);
  return (
    <select value={value || ""} onChange={e => onChange(e.target.value)} style={selectStyle}>
      <option value="">Seleziona studente...</option>
      {clienti.map(c =>
        <option key={c.id} value={c.id}>{c.nome} {c.cognome ? c.cognome : ""} ({c.email || c.id})</option>
      )}
    </select>
  );
}

// --- COMPONENTE UPLOAD MODALE (MULTIFILE) ---
function UploadMaterialeModal({ open, onClose, onUploaded, clienteId }) {
  const [files, setFiles] = useState([]);
  const [materia, setMateria] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();

  function getDatalogString() {
    const now = new Date();
    const datalog = now.toISOString().slice(0,19).replace(/[-:T]/g,"_");
    return datalog;
  }

  function resetForm() {
    setFiles([]);
    setMateria("");
    setNome("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!files.length || !clienteId) {
      alert("Seleziona almeno un file e uno studente.");
      return;
    }
    setLoading(true);
    await Promise.all(files.map(async (file) => {
      const titolo = nome.trim() ? nome.trim() : getDatalogString();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("titolo", titolo);
      if (materia) formData.append("materia", materia);
      formData.append("clienteId", clienteId);
      await fetch("/api/materiale", { method: "POST", body: formData });
    }));
    resetForm();
    onUploaded && onUploaded();
    onClose && onClose();
    setLoading(false);
  }

  if (!open) return null;
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(32,72,154,0.15)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000
    }}>
      <form onSubmit={handleSubmit} style={{
        background:"#fff", borderRadius:18, padding:"32px 28px", boxShadow:"0 8px 28px #2563eb35",
        minWidth:340, maxWidth:440
      }}>
        <h2 style={{marginTop:0, marginBottom:14, fontWeight:700, fontSize:22, color:"#20489a"}}>Carica materiale</h2>
        <div style={{marginBottom:14}}>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg,.zip"
            required
            multiple
            ref={fileInputRef}
            onChange={e => setFiles(Array.from(e.target.files))}
            style={{marginBottom:10}}
          />
        </div>
        <div style={{marginBottom:12}}>
          <label style={{fontWeight:600, fontSize:14, marginBottom:3, display:"block"}}>Nome (opzionale)</label>
          <input
            type="text"
            placeholder=""
            value={nome}
            onChange={e => setNome(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{marginBottom:12}}>
          <label style={{fontWeight:600, fontSize:14, marginBottom:3, display:"block"}}>Materia (opzionale)</label>
          <select
            value={materia}
            onChange={e => setMateria(e.target.value)}
            style={inputStyle}
          >
            <option value="">- Nessuna -</option>
            {materieLiceo.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div style={{marginBottom:16, fontSize:13, fontWeight:600}}>
          <span>Assegna a studente: </span>
          <span style={{fontWeight:700, color:"#1e3a8a"}}>{clienteId}</span>
        </div>
        <div style={{textAlign:"right"}}>
          <button type="button" onClick={onClose} style={btnGhost}>Annulla</button>
          <button type="submit" disabled={!files.length || loading} style={btnPrimary}>
            {loading ? "Caricamento..." : "Carica"}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- COMPONENTE ELIMINA TUTTI (solo admin/operator) ---
function EliminaTuttiMateriali({ clienteId, onDeleted }) {
  const [show, setShow] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDeleteAll() {
    if (!clienteId) return;
    if (!window.confirm("Sei sicuro di voler eliminare tutti i materiali di questo studente?")) return;
    setLoading(true);
    let url = `/api/materiale?clienteId=${clienteId}&all=true`;
    if (from) url += `&from=${encodeURIComponent(from)}`;
    if (to) url += `&to=${encodeURIComponent(to)}`;
    const res = await fetch(url, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      onDeleted && onDeleted();
      setShow(false);
    } else {
      alert("Errore durante l'eliminazione massiva");
    }
  }
  return (
    <div style={{marginRight:16, display:"inline-block"}}>
      <button
        style={{...btnOutline, color:"#c33", borderColor:"#ea8484", fontWeight:700, marginRight:10}}
        onClick={() => setShow(!show)}
        disabled={!clienteId}
      >
        Elimina tutti
      </button>
      {show && (
        <div style={{
          background:"#fff6f7", border:"1px solid #f9b1b1",
          borderRadius:10, padding:16, marginTop:6, position:"absolute", zIndex:10
        }}>
          <div style={{marginBottom:10}}>
            <label>Da data (opzionale): </label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={inputStyle} />
          </div>
          <div style={{marginBottom:12}}>
            <label>A data (opzionale): </label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={inputStyle} />
          </div>
          <button type="button" onClick={handleDeleteAll} disabled={loading} style={btnPrimary}>
            Conferma elimina tutti
          </button>
        </div>
      )}
    </div>
  );
}

// --- ICONA FILE ---
function FileIcon({ tipo }) {
  if (!tipo) return null;
  const t = tipo.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(t)) return null;
  if (t === "pdf") return <span style={{...badgeTipo("pdf"), background:"#e53935"}}>PDF</span>;
  if (["doc", "docx"].includes(t)) return <span style={{...badgeTipo("doc"), background:"#1976d2"}}>DOC</span>;
  if (["xlsx", "xls"].includes(t)) return <span style={{...badgeTipo("xls"), background:"#43a047"}}>XLS</span>;
  if (t === "zip") return <span style={{...badgeTipo("zip"), background:"#fbc02d", color:"#0a0a0a"}}>ZIP</span>;
  return <span style={{...badgeTipo("altro"), background:"#bdbdbd", color:"#20489a"}}>{t.toUpperCase()}</span>;
}

// --- GROUP BY DAY ---
function groupByDay(list) {
  const days = {};
  for (const item of list) {
    const dateObj = new Date(item.updatedAt);
    const dayKey = dateObj.toISOString().slice(0,10);
    if (!days[dayKey]) days[dayKey] = [];
    days[dayKey].push(item);
  }
  // Ordina per giorno decrescente
  return Object.entries(days)
    .sort((a,b)=>b[0].localeCompare(a[0]));
}

// --- MAIN PAGE ---
export default function MaterialePage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroMateria, setFiltroMateria] = useState("");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState("");

  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "operatore";
  const myClienteId = session?.user?.clienteId;

  // --- COMMENTI
  const [commenti, addCommento] = useCommenti(items);

  // --- FETCH LISTA REALE ---
  async function fetchMateriali(clienteIdToFetch) {
    setLoading(true);
    try {
      let url = "/api/materiale";
      if (clienteIdToFetch) {
        url += `?clienteId=${clienteIdToFetch}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      if (isAdmin) {
        if (selectedCliente) fetchMateriali(selectedCliente);
        else setItems([]);
      } else {
        fetchMateriali(myClienteId);
      }
    }
  }, [status, selectedCliente, isAdmin, myClienteId]);

  // Materie effettive nei materiali filtrati
  const materieEffettive = useMemo(
    () => Array.from(new Set(items.map(i => i.materia).filter(x => x && x.trim()))).sort(),
    [items]
  );
  const tipi = useMemo(() =>
    Array.from(new Set(items
      .map(i => i.tipo)
      .filter(t => typeof t === "string" && t.trim() && t !== "undefined")
    )), [items]
  );

  const visible = useMemo(() => {
    let list = [...items];
    if (filtroTipo) {
      list = list.filter(it => it.tipo === filtroTipo);
    }
    if (filtroMateria) {
      list = list.filter(it => it.materia === filtroMateria);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(it =>
        (it.titolo || "").toLowerCase().includes(q) ||
        (it.materia || "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [items, filtroTipo, filtroMateria, search]);

  // Recupera nome studente da lista clienti (solo per admin/operator)
  const [clienti, setClienti] = useState([]);
  useEffect(() => {
    if (isAdmin) {
      fetch("/api/clienti")
        .then(r => r.json())
        .then(setClienti)
        .catch(() => setClienti([]));
    }
  }, [isAdmin]);
  function getStudenteLabel(clienteId) {
    const c = clienti.find(x => String(x.id) === String(clienteId));
    // Solo se nome e cognome esistono
    if (!c || (!c.nome && !c.cognome)) return "";
    return `${c.nome || ""} ${c.cognome || ""}`.trim();
  }

  async function handleDeleteMateriale(fileId) {
    if (!window.confirm("Sei sicuro di voler eliminare questo materiale?")) return;
    const res = await fetch(`/api/materiale?fileId=${fileId}`, { method: "DELETE" });
    if (res.ok) {
      isAdmin ? fetchMateriali(selectedCliente) : fetchMateriali(myClienteId);
    } else {
      alert("Errore durante l'eliminazione del materiale");
    }
  }

  if (status === "loading") {
    return <div><Navbar /><div style={{ padding: 40 }}>Caricamento…</div></div>;
  }
  if (!session) return null;

  // ---- SIDEBAR (desktop) ----
  const sidebar = (
    <aside style={sidebarStyle}>
      <div style={sidebarBox}>
        <div style={{fontWeight:700, color:"#20489a", marginBottom:6}}>Materie</div>
        <button style={sidebarBtn} onClick={()=>setFiltroMateria("")}>Tutte</button>
        {materieEffettive.map(materia=>
          <button key={materia} style={sidebarBtn} onClick={()=>setFiltroMateria(materia)}>{materia}</button>
        )}
      </div>
    </aside>
  );

  // Raggruppa per giorno
  const grouped = groupByDay(visible);

  // --- HEADER LOGICA CORRETTA
  let titoloMateriale = "Materiale";
  if (isAdmin && selectedCliente && getStudenteLabel(selectedCliente)) {
    titoloMateriale = `Materiale di ${getStudenteLabel(selectedCliente)}`;
  } else if (!isAdmin && session?.user?.nome) {
    titoloMateriale = `Materiale di ${session.user.nome}`;
  }
  // fallback: solo "Materiale"

  return (
    <div style={{ minHeight: "100vh", background: "#f5f8ff" }}>
      <Navbar />
      {/* HEADER stile classroom */}
      <header style={headerStyle}>
        <div style={headerBanner}>
          <div style={{ fontSize:32, fontWeight:800, color:"#fff" }}>
            {titoloMateriale}
          </div>
          <div style={{ fontSize:16, color:"#e7ecfa", marginTop:6 }}>
            Archivio dei materiali condivisi.
          </div>
        </div>
      </header>

      <div style={pageGrid}>
        <div style={sidebarWrap}>{sidebar}</div>
        <main style={mainStyle}>
          {/* BAR: Carica materiale a sinistra, filtri e ricerca a destra */}
          <div style={barFlex}>
            {((isAdmin && selectedCliente) || (!isAdmin && myClienteId)) && (
              <button style={btnPrimary} onClick={() => setShowUpload(true)}>
                Carica materiale
              </button>
            )}
            <div style={filtersBarRight}>
              {isAdmin && (
                <ClienteSelect value={selectedCliente} onChange={cid => setSelectedCliente(cid)} />
              )}
              <input
                placeholder="Cerca titolo o materia..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={searchInput}
              />
              <select
                value={filtroTipo}
                onChange={e => setFiltroTipo(e.target.value)}
                style={selectStyle}
              >
                <option value="">Tutti i tipi</option>
                {tipi.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
              <select
                value={filtroMateria}
                onChange={e => setFiltroMateria(e.target.value)}
                style={selectStyle}
              >
                <option value="">Tutte le materie</option>
                {materieEffettive.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {isAdmin && selectedCliente && (
                <EliminaTuttiMateriali
                  clienteId={selectedCliente}
                  onDeleted={() => fetchMateriali(selectedCliente)}
                />
              )}
            </div>
          </div>
          {loading && <div style={{margin:30}}>Caricamento…</div>}
          {visible.length === 0 && !loading && (
            <div style={emptyBox}>Nessun materiale trovato.</div>
          )}

          {/* STREAM stile classroom con giorni */}
          <div style={streamWrap}>
            {grouped.map(([giorno, materiali]) => (
              <React.Fragment key={giorno}>
                <div style={dayHeaderStyle}>{formatDayHeader(giorno)}</div>
                {materiali.map(m => (
                  <div key={m.id} style={streamCard}>
                    <div style={streamCardHead}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <h3 style={streamCardTitle}>{m.titolo}</h3>
                        {typeof m.tipo === "string" && m.tipo.trim() && m.tipo !== "undefined" && (
                          <span style={badgeTipo(m.tipo)}>{m.tipo.toUpperCase()}</span>
                        )}
                      </div>
                      {isAdmin && (
                        <button
                          style={streamMenuBtn}
                          title="Azioni"
                          onClick={()=>handleDeleteMateriale(m.id)}
                        >✕</button>
                      )}
                    </div>
                    <div style={streamCardBody}>
                      {/* Preview immagini */}
                      {["jpg","jpeg","png","gif","bmp","webp"].includes((m.tipo||"").toLowerCase()) && (
                        <a href={`/api/materiale?fileId=${m.id}`} target="_blank" rel="noopener noreferrer">
                          <img
                            src={`/api/materiale?fileId=${m.id}`}
                            alt={m.titolo}
                            style={{maxWidth:"100%",maxHeight:240,borderRadius:12,marginBottom:10,boxShadow:"0 2px 10px #20489a22"}}
                          />
                        </a>
                      )}
                      <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                        {m.materia && <span style={categoria}>{m.materia}</span>}
                        {isAdmin && <span style={clientePill}>{getStudenteLabel(m.clienteId)}</span>}
                        {typeof m.tipo === "string" && m.tipo.trim() && m.tipo !== "undefined" && !["jpg","jpeg","png","gif","bmp","webp"].includes(m.tipo.toLowerCase()) &&
                          <FileIcon tipo={m.tipo} />
                        }
                      </div>
                      <div style={{fontSize:13,color:"#5a6d90",marginBottom:7}}>
                        Caricato il {formatAggDate(m.updatedAt)}
                      </div>
                      <div style={{ display:"flex", gap:10, marginBottom:12 }}>
                        <a
                          href={`/api/materiale?fileId=${m.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={btnGhost}
                          download={m.nomeOriginale}
                        >
                          Scarica
                        </a>
                        {isAdmin && (
                          <button
                            style={{...btnOutline, color:"#c33", borderColor:"#ea8484", fontWeight:700}}
                            onClick={()=>handleDeleteMateriale(m.id)}
                          >
                            Elimina
                          </button>
                        )}
                      </div>
                      {/* Commenti */}
                      <CommentiBox
                        materialeId={m.id}
                        lista={commenti[m.id] || []}
                        user={session?.user}
                        addCommento={addCommento}
                      />
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </main>
      </div>
      {/* Modale upload */}
      <UploadMaterialeModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={() => isAdmin ? fetchMateriali(selectedCliente) : fetchMateriali(myClienteId)}
        clienteId={isAdmin ? selectedCliente : myClienteId}
      />
    </div>
  );
}

// === UTILITY: Format Aggiornamento data con anno ===
function formatAggDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("it-IT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).replace(",", "");
}
function formatDayHeader(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString("it-IT", {weekday:"long",year:"numeric",month:"long",day:"numeric"});
}

// COMMENTI COMPONENT
function CommentiBox({ materialeId, lista, addCommento, user }) {
  const [testo, setTesto] = useState("");
  function submitCommento(e) {
    e.preventDefault();
    if (!testo.trim() || !user) return;
    addCommento(materialeId, user.nome || user.email || "Utente", testo.trim());
    setTesto("");
  }
  return (
    <div style={streamCommentBox}>
      <div style={{marginBottom:3,fontWeight:700,color:"#20489a",fontSize:14}}>
        Commenti ({lista.length})
      </div>
      {lista.length === 0 && (
        <div style={{fontSize:12,color:"#7d8dab",marginBottom:6}}>Nessun commento ancora. Scrivi il primo commento…</div>
      )}
      <div>
        {lista.map((c,i)=>(
          <div key={i} style={{marginBottom:7}}>
            <span style={{fontWeight:600,color:"#20489a",fontSize:13}}>{c.autore}</span>
            <span style={{color:"#8399b2",fontSize:12,marginLeft:7}}>{formatAggDate(c.createdAt)}</span>
            <div style={{fontSize:13}}>{c.testo}</div>
          </div>
        ))}
      </div>
      {user && (
        <form onSubmit={submitCommento} style={{display:"flex",gap:8,marginTop:8}}>
          <input
            style={streamCommentInput}
            placeholder="Aggiungi un commento..."
            value={testo}
            onChange={e=>setTesto(e.target.value)}
            maxLength={500}
          />
          <button
            type="submit"
            style={{...btnPrimary,padding:"7px 15px",fontSize:15,margin:0}}
            disabled={!testo.trim()}
            tabIndex={0}
          >Invia</button>
        </form>
      )}
    </div>
  );
}

/* --- STILI OTTIMIZZATI STREAM CLASSROOM + SIDEBAR --- */
const headerStyle = {background:"#20489a",padding:"0",marginBottom:0};
const headerBanner = {padding:"38px 6vw 28px",display:"flex",flexDirection:"column",alignItems:"start"};
const pageGrid = {display:"flex",flexDirection:"row",maxWidth:1600,margin:"0 auto",padding:"0 2vw"};
const sidebarWrap = {minWidth:260,maxWidth:320,margin:"36px 0 0 0",display:"block"};
const sidebarStyle = {display:"flex",flexDirection:"column",gap:22};
const sidebarBox = {
  background:"#fff",borderRadius:18,padding:"22px 18px",marginBottom:0,
  boxShadow:"0 2px 10px #20489a15",fontSize:15
};
const sidebarBtn = {
  display:"block",margin:"7px 0",padding:"8px 14px",border:"none",borderRadius:8,
  background:"#e3eefe",color:"#20489a",fontWeight:600,fontSize:13,cursor:"pointer"
};
const mainStyle = {
  flex:1,maxWidth:1100,minWidth:0,margin:"36px 0 0 36px",background:"none",padding:0
};
const barFlex = {display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,marginBottom:26};
const filtersBarRight = {display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"};
const filtersBar = { display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:20, marginBottom:28 };
const filterLabel = { fontSize: 13, fontWeight:700, color:"#20489a" };
const selectStyle = {
  padding:"8px 12px",
  borderRadius:10,
  border:"1.4px solid #4268b3",
  fontSize:14,
  fontWeight:600,
  background:"#fff",
  color:"#20489a"
};
const searchInput = {
  padding:"8px 14px",
  borderRadius:10,
  border:"1.4px solid #4268b3",
  fontSize:14,
  minWidth:200,
  background:"#fff",
  color:"#20489a"
};
const btnPrimary = {
  background:"#1cb0f6",
  color:"#fff",
  border:"none",
  borderRadius:10,
  padding:"10px 18px",
  fontWeight:700,
  fontSize:14,
  cursor:"pointer",
  boxShadow:"0 2px 6px rgba(28,176,246,0.35)"
};
const btnGhost = {
  background:"#e3eefe",
  color:"#20489a",
  border:"none",
  borderRadius:8,
  padding:"8px 12px",
  fontWeight:600,
  fontSize:12,
  cursor:"pointer",
  marginRight:8
};
const btnOutline = {
  background:"#fff",
  color:"#20489a",
  border:"1.4px solid #4268b3",
  borderRadius:8,
  padding:"8px 12px",
  fontWeight:600,
  fontSize:12,
  cursor:"pointer"
};
const inputStyle = {
  width:"100%",
  padding:"7px 10px",
  border:"1px solid #cbe5fc",
  borderRadius:5,
  background:"#f8fafd"
};
const emptyBox = {
  border:"1px dashed #b9c9e3",
  background:"#f1f6fc",
  padding:44,
  borderRadius:20,
  textAlign:"center",
  fontWeight:600,
  color:"#5a6d90",
  marginTop:10
};
const streamWrap = {
  display:"flex",
  flexDirection:"column",
  gap:34,
  marginTop:10
};
const dayHeaderStyle = {
  fontWeight:800,
  fontSize:18,
  color:"#20489a",
  margin:"34px 0 10px 0",
  paddingLeft:10,
  letterSpacing:".5px"
};
const streamCard = {
  background:"#fff",
  borderRadius:22,
  boxShadow:"0 3px 22px #20489a22",
  padding:"0 0 0",
  maxWidth:600,
  margin:"0 auto",
  border:"1.4px solid #eaeaf0"
};
const streamCardHead = {
  display:"flex",
  alignItems:"center",
  justifyContent:"space-between",
  padding:"22px 32px 0 32px"
};
const streamCardTitle = { margin:0, fontSize:19, fontWeight:700, lineHeight:1.25, color:"#20489a"};
const streamMenuBtn = {
  background:"none",
  border:"none",
  color:"#8399b2",
  fontSize:30,
  cursor:"pointer",
  padding:0,
  margin:0,
  lineHeight:1
};
const streamCardBody = {padding:"14px 32px 20px 32px"};
const badgeTipo = tipo => ({
  background:"#1e3a8a",
  color:"#fff",
  fontSize:12,
  fontWeight:700,
  padding:"5px 14px",
  borderRadius:8,
  letterSpacing:".5px"
});
const metaRow = { display:"flex", gap:10, alignItems:"center", marginTop:6, marginBottom:0 };
const categoria = { background:"#e3eefe", color:"#20489a", fontSize:13, padding:"4px 10px", borderRadius:6, fontWeight:600 };
const clientePill = { background:"#FFE3BE", color:"#8C5800", fontSize:13, padding:"4px 10px", borderRadius:6, fontWeight:600 };
const updatedTxt = { fontSize:13, color:"#5a6d90", fontWeight:600, marginTop:12, marginBottom:8 };
const streamCommentBox = {
  background:"#f7fafd",borderRadius:12,padding:"10px 14px",marginTop:10,border:"1.1px solid #e3eefe"
};
const streamCommentInput = {
  width:"100%",
  border:"none",
  background:"none",
  padding:"8px 0",
  fontSize:15,
  color:"#20489a",
  outline:"none"
};