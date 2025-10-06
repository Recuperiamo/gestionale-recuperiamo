"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import Navbar from "../components/Navbar";

export default function MaterialePage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [search, setSearch] = useState("");
  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    if (status !== "authenticated") return;
    // Placeholder (in futuro: fetch /api/materiali)
    const fake = [
      { id: 1, titolo: "Esercizi Equazioni", tipo: "pdf", categoria: "Algebra", clienteId: 10, pubblico: true, updatedAt: "2025-09-25T10:00:00Z" },
      { id: 2, titolo: "Sintesi Pitagora", tipo: "pdf", categoria: "Geometria", clienteId: 11, pubblico: true, updatedAt: "2025-09-26T11:30:00Z" },
      { id: 3, titolo: "Compiti settimana 40", tipo: "docx", categoria: "Compiti", clienteId: 10, pubblico: false, updatedAt: "2025-09-29T08:00:00Z" }
    ];
    setItems(fake);
  }, [status]);

  const myClienteId = session?.user?.clienteId;

  const visible = useMemo(() => {
    let list = [...items];
    if (!isAdmin) {
      list = list.filter(it => it.pubblico || Number(it.clienteId) === Number(myClienteId));
    }
    if (filtroTipo) {
      list = list.filter(it => it.tipo === filtroTipo);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(it =>
        it.titolo.toLowerCase().includes(q) ||
        (it.categoria || "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [items, isAdmin, myClienteId, filtroTipo, search]);

  if (status === "loading") {
    return <div><Navbar /><div style={{ padding: 40 }}>Caricamento…</div></div>;
  }
  if (!session) return null;

  const tipi = Array.from(new Set(items.map(i => i.tipo)));

  return (
    <div style={{ minHeight: "100vh", background: "#f5f8ff" }}>
      <Navbar />
      <main style={mainStyle}>
        <h1 style={titleStyle}>Materiale Didattico</h1>
        <p style={descStyle}>Repository condivisa stile “classroom”. Funzionalità avanzate (upload, assegnazioni, permessi) in arrivo.</p>

        <div style={filtersBar}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <label style={filterLabel}>Tipo:</label>
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              style={selectStyle}
            >
              <option value="">Tutti</option>
              {tipi.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
            <input
              placeholder="Cerca titolo o categoria..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={searchInput}
            />
          </div>
          {isAdmin && (
            <button style={btnPrimary} onClick={() => alert("TODO: upload materiale")}>
              Carica Materiale
            </button>
          )}
        </div>

        {visible.length === 0 && (
          <div style={emptyBox}>Nessun materiale corrisponde ai filtri.</div>
        )}

        <div style={gridStyle}>
          {visible.map(m => (
            <div key={m.id} style={card}>
              <div style={cardHead}>
                <h3 style={cardTitle}>{m.titolo}</h3>
                <span style={badgeTipo(m.tipo)}>{m.tipo.toUpperCase()}</span>
              </div>
              <div style={metaRow}>
                <span style={categoria}>{m.categoria}</span>
                {isAdmin && <span style={clientePill}>Cliente #{m.clienteId}</span>}
              </div>
              <div style={pubblicoRow}>
                {m.pubblico ? <span style={pillGreen}>Pubblico</span> : <span style={pillAmber}>Assegnato</span>}
              </div>
              <div style={updatedTxt}>
                Agg.: {new Date(m.updatedAt).toLocaleString("it-IT", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })}
              </div>
              <div style={{ display:"flex", gap:10, marginTop:12 }}>
                <button style={btnGhost} onClick={() => alert("TODO: download")}>Scarica</button>
                {isAdmin && <button style={btnOutline} onClick={() => alert("TODO: gestisci")}>Gestisci</button>}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/* Styles */
const mainStyle = {
  maxWidth: 1200,
  margin: "50px auto",
  background: "#fff",
  borderRadius: 28,
  padding: "42px 46px 56px",
  boxShadow: "0 6px 34px rgba(32,72,154,0.15)",
  fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
  color: "#20489a"
};
const titleStyle = { marginTop: 0, fontSize: 36, fontWeight: 800 };
const descStyle = { fontSize: 15, margin: "6px 0 24px", lineHeight: 1.4 };
const filtersBar = { display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:20, marginBottom:26 };
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
  minWidth:260,
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
const gridStyle = {
  display:"grid",
  gap:22,
  gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",
  marginTop:10
};
const card = {
  background:"#f8fbff",
  border:"1px solid #dbe6f5",
  borderRadius:18,
  padding:"18px 20px 22px",
  display:"flex",
  flexDirection:"column",
  minHeight:200
};
const cardHead = { display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 };
const cardTitle = { margin:0, fontSize:17, fontWeight:700, lineHeight:1.2 };
const badgeTipo = tipo => ({
  background:"#1e3a8a",
  color:"#fff",
  fontSize:10,
  fontWeight:700,
  padding:"4px 8px",
  borderRadius:6,
  letterSpacing:".5px"
});
const metaRow = { display:"flex", gap:10, alignItems:"center", marginTop:8 };
const categoria = { background:"#e3eefe", color:"#20489a", fontSize:11, padding:"4px 8px", borderRadius:6, fontWeight:600 };
const clientePill = { background:"#FFE3BE", color:"#8C5800", fontSize:11, padding:"4px 8px", borderRadius:6, fontWeight:600 };
const pubblicoRow = { marginTop:10 };
const pillGreen = { background:"#C7F7D7", color:"#12753A", fontSize:11, padding:"4px 10px", borderRadius:999, fontWeight:700 };
const pillAmber = { background:"#FFF3B0", color:"#8C7800", fontSize:11, padding:"4px 10px", borderRadius:999, fontWeight:700 };
const updatedTxt = { fontSize:11, color:"#5a6d90", fontWeight:600, marginTop:10 };
const btnGhost = {
  background:"#e3eefe",
  color:"#20489a",
  border:"none",
  borderRadius:8,
  padding:"8px 12px",
  fontWeight:600,
  fontSize:12,
  cursor:"pointer"
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