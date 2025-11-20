"use client";
console.log('[INIT] AulaContent');
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import Navbar from "../components/Navbar";
import ProgrammaPreview from './ProgrammaPreview';
import CalendarioAttivita from '../components/calendario/CalendarioAttivita';
import ProgrammaPanel from './ProgrammaPanel';
import { MATERIE_AULA as materieLiceo } from "../../lib/materie";
import { getAblyChannelAsync } from "../lib/realtime/ablyClient";

// Componente per zoom e pan delle immagini
function ImagePreviewWithZoom({ src, alt, coloreTema }) {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.max(0.5, Math.min(5, prev + delta)));
  };

  // Aggiungi event listener nativo per bloccare lo scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const wheelHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale(prev => Math.max(0.5, Math.min(5, prev + delta)));
    };
    
    container.addEventListener('wheel', wheelHandler, { passive: false });
    return () => container.removeEventListener('wheel', wheelHandler);
  }, []);

  const isPannable = () => {
    if (!containerRef.current || !imageDimensions.width || !imageDimensions.height) return false;
    const container = containerRef.current.getBoundingClientRect();
    const scaledWidth = imageDimensions.width * scale;
    const scaledHeight = imageDimensions.height * scale;
    // Allow pan if image is larger than container in either dimension
    return scaledWidth > container.width || scaledHeight > container.height;
  };

  const handleMouseDown = (e) => {
    if (!isPannable()) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const zoomIn = () => {
    setScale(prev => Math.min(5, prev + 0.25));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.25));
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Controlli zoom */}
      <div style={{
        position: 'absolute',
        top: 16,
        right: 16,
        display: 'flex',
        gap: 8,
        zIndex: 10,
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <button
          type="button"
          onClick={zoomOut}
          disabled={scale <= 0.5}
          style={{
            background: scale <= 0.5 ? '#e0e0e0' : coloreTema,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 16,
            fontWeight: 700,
            cursor: scale <= 0.5 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          −
        </button>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          minWidth: 60,
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 600,
          color: '#333'
        }}>
          {Math.round(scale * 100)}%
        </div>
        <button
          type="button"
          onClick={zoomIn}
          disabled={scale >= 5}
          style={{
            background: scale >= 5 ? '#e0e0e0' : coloreTema,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 16,
            fontWeight: 700,
            cursor: scale >= 5 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          +
        </button>
        {scale !== 1 && (
          <button
            type="button"
            onClick={resetZoom}
            style={{
              background: '#6b7b9a',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Hint per utente */}
      {isPannable() && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.75)',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: 6,
          fontSize: 12,
          zIndex: 10,
          pointerEvents: 'none'
        }}>
          Trascina per spostare l'immagine
        </div>
      )}

      {/* Container immagine con zoom e pan */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isPannable() ? (isDragging ? 'grabbing' : 'grab') : 'default',
          overflow: 'hidden'
        }}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          onLoad={(e) => {
            setImageDimensions({
              width: e.target.naturalWidth,
              height: e.target.naturalHeight
            });
          }}
          style={{
            maxWidth: '100%',
            maxHeight: '80vh',
            borderRadius: 8,
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            userSelect: 'none',
            pointerEvents: 'none'
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}

// Componente per visualizzazione PDF con controlli
function PDFPreviewWithControls({ src, title, coloreTema }) {
  const iframeRef = useRef(null);
  const [scale, setScale] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);

  // Costruisce URL con parametri per controllo PDF
  const pdfUrl = useMemo(() => {
    const baseUrl = src;
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', currentPage.toString());
    params.set('zoom', scale.toString());
    const query = params.toString();
    return query ? `${baseUrl}#${query}` : baseUrl;
  }, [src, currentPage, scale]);

  const zoomIn = () => setScale(prev => Math.min(200, prev + 25));
  const zoomOut = () => setScale(prev => Math.max(50, prev - 25));
  const resetZoom = () => setScale(100);
  const nextPage = () => setCurrentPage(prev => prev + 1);
  const prevPage = () => setCurrentPage(prev => Math.max(1, prev - 1));

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Barra controlli PDF */}
      <div style={{
        display: 'flex',
        gap: 12,
        padding: '12px 16px',
        background: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 12,
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {/* Navigazione pagine */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={prevPage}
            disabled={currentPage <= 1}
            style={{
              background: currentPage <= 1 ? '#e0e0e0' : coloreTema,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 600,
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            ← Prec
          </button>
          <div style={{
            padding: '6px 12px',
            background: '#fff',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            minWidth: 80,
            textAlign: 'center',
            border: '1px solid #e0e0e0'
          }}>
            Pag. {currentPage}
          </div>
          <button
            type="button"
            onClick={nextPage}
            style={{
              background: coloreTema,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Succ →
          </button>
        </div>

        {/* Controlli zoom */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={zoomOut}
            disabled={scale <= 50}
            style={{
              background: scale <= 50 ? '#e0e0e0' : '#6b7b9a',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 16,
              fontWeight: 700,
              cursor: scale <= 50 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            −
          </button>
          <div style={{
            padding: '6px 12px',
            background: '#fff',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            minWidth: 70,
            textAlign: 'center',
            border: '1px solid #e0e0e0'
          }}>
            {scale}%
          </div>
          <button
            type="button"
            onClick={zoomIn}
            disabled={scale >= 200}
            style={{
              background: scale >= 200 ? '#e0e0e0' : '#6b7b9a',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 16,
              fontWeight: 700,
              cursor: scale >= 200 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            +
          </button>
          {scale !== 100 && (
            <button
              type="button"
              onClick={resetZoom}
              style={{
                background: '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Hint utente */}
      <div style={{
        fontSize: 11,
        color: '#6b7b9a',
        textAlign: 'center',
        marginBottom: 8,
        fontStyle: 'italic',
        flexShrink: 0
      }}>
        Usa i controlli sopra per navigare e ingrandire il PDF
      </div>

      {/* Iframe PDF */}
      <div style={{ flex: 1, overflow: 'hidden', borderRadius: 8, border: '1px solid #e0e0e0', minHeight: 0 }}>
        <iframe
          ref={iframeRef}
          title={title || 'PDF'}
          src={pdfUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 0,
            borderRadius: 8
          }}
        />
      </div>
    </div>
  );
}

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

// --- COMPONENTE UPLOAD MODALE (MULTIFILE) ---
function UploadMaterialeModal({ open, onClose, onUploaded, clienteId, materieStudente = [], coloreTema = "#1cb0f6" }) {
  const [files, setFiles] = useState([]);
  const [materia, setMateria] = useState("");
  const [sezione, setSezione] = useState("MATERIALE");
  const [sottocategoria, setSottocategoria] = useState("TEORIA"); // Default for MATERIALE
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
    setSezione("MATERIALE");
    setSottocategoria("TEORIA");
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
    const errors = [];
    
    // Genera uploadBatchId solo se ci sono più file
    const uploadBatchId = files.length > 1 ? `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null;
    
    for (const file of files) {
      try {
        const titolo = nome.trim() ? nome.trim() : getDatalogString();
        const formData = new FormData();
        formData.append("file", file);
        formData.append("titolo", titolo);
  if (materia) formData.append("materia", materia);
  if (sezione) formData.append("sezione", sezione);
        // Add sottocategoria only for MATERIALE section
        if (sezione === "MATERIALE" && sottocategoria) formData.append("sottocategoria", sottocategoria);
        formData.append("clienteId", clienteId);
        if (uploadBatchId) formData.append("uploadBatchId", uploadBatchId);
        const res = await fetch("/api/materiale", { method: "POST", body: formData });
        if (!res.ok) {
          let msg = `Errore caricamento ${file.name}`;
          try { const js = await res.json(); if (js && js.error) msg += `: ${js.error}`; } catch {}
          errors.push(msg);
        }
      } catch (err) {
        errors.push(`Errore caricamento ${file.name}: ${err.message}`);
      }
    }
    if (errors.length > 0) {
      alert("Alcuni file non sono stati caricati:\n" + errors.join("\n"));
    }
    resetForm();
    onUploaded && onUploaded();
    onClose && onClose();
    // Emit realtime notification to other clients via Socket.IO
    try {
      if (clienteId) {
        const ch = await getAblyChannelAsync(`materiale:${clienteId}`);
        if (ch) ch.publish('new-material', { clienteId: Number(clienteId), count: files.length });
      }
    } catch (_) {}
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
        <h2 style={{marginTop:0, marginBottom:14, fontWeight:700, fontSize:22, color: coloreTema}}>Carica materiale</h2>
        <div style={{marginBottom:14}}>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.bmp,.webp,.svg,.txt,.csv"
            required
            multiple
            ref={fileInputRef}
            onChange={e => setFiles(Array.from(e.target.files))}
            style={{marginBottom:10}}
          />
          <div style={{fontSize:12,color:"#5a6d90",marginTop:4}}>
            Tipi di file supportati: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, PNG, JPG, JPEG, GIF, BMP, WEBP, SVG, TXT, CSV
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{fontWeight:600, fontSize:14, marginBottom:3, display:"block", color: coloreTema}}>Nome (opzionale)</label>
          <input
            type="text"
            placeholder=""
            value={nome}
            onChange={e => setNome(e.target.value)}
            style={{...inputStyle, borderColor: coloreTema}}
          />
        </div>
        {materieStudente.length > 1 && (
          <div style={{marginBottom:12}}>
            <label style={{fontWeight:600, fontSize:14, marginBottom:3, display:"block", color: coloreTema}}>Materia</label>
            <select
              value={materia}
              onChange={e => setMateria(e.target.value)}
              style={{...inputStyle, borderColor: coloreTema}}
            >
              <option value="">- Nessuna -</option>
              {materieStudente.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}
        <div style={{marginBottom:12}}>
          <label style={{fontWeight:600, fontSize:14, marginBottom:3, display:"block", color: coloreTema}}>Sezione</label>
          <select
            value={sezione}
            onChange={e => setSezione(e.target.value)}
            style={{...inputStyle, borderColor: coloreTema}}
          >
            <option value="MATERIALE">Materiale</option>
            <option value="COMPITI">Compiti</option>
            <option value="VOTI">Voti</option>
          </select>
        </div>
        {sezione === "MATERIALE" && (
          <div style={{marginBottom:12}}>
            <label style={{fontWeight:600, fontSize:14, marginBottom:3, display:"block", color: coloreTema}}>Tipo materiale</label>
            <select
              value={sottocategoria}
              onChange={e => setSottocategoria(e.target.value)}
              style={{...inputStyle, borderColor: coloreTema}}
            >
              <option value="TEORIA">Teoria</option>
              <option value="SIMULAZIONI">Simulazioni di verifica</option>
              <option value="ESERCIZI">Esercizi</option>
            </select>
          </div>
        )}
        {/* Rimosso: Assegna a studente (assegnato automaticamente) */}
        <div style={{textAlign:"right"}}>
          <button type="button" onClick={onClose} style={btnGhost}>Annulla</button>
          <button type="submit" disabled={!files.length || loading} style={{...btnPrimary, background: coloreTema, boxShadow: `0 2px 6px ${coloreTema}55`}}>
            {loading ? "Caricamento..." : "Carica"}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- COMPONENTE ELIMINA TUTTI (solo admin/operator) ---
function EliminaTuttiMateriali({ clienteId, onDeleted, sezione }) {
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
    if (sezione) url += `&sezione=${encodeURIComponent(sezione)}`;
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
        {sezione === 'VOTI' ? 'Elimina voti' : 'Elimina tutti'}
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

// --- GROUP BY DAY AND BATCH ---
function groupByDay(list) {
  const days = {};
  for (const item of list) {
    const dateObj = new Date(item.updatedAt);
    const dayKey = dateObj.toISOString().slice(0,10);
    if (!days[dayKey]) days[dayKey] = [];
    days[dayKey].push(item);
  }
  // Ordina per giorno decrescente
  const sortedDays = Object.entries(days).sort((a,b)=>b[0].localeCompare(a[0]));
  
  // Raggruppa per uploadBatchId all'interno di ogni giorno
  return sortedDays.map(([day, items]) => {
    // ensure day items are sorted by updatedAt: most recent first
    items.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const batches = {};
    const singles = [];
    
    for (const item of items) {
      if (item.uploadBatchId) {
        if (!batches[item.uploadBatchId]) batches[item.uploadBatchId] = [];
        batches[item.uploadBatchId].push(item);
      } else {
        singles.push(item);
      }
    }
    
    // Crea array con batch (se > 1 file) e singoli
    const grouped = [];
    Object.values(batches).forEach(batchItems => {
      // sort files in a batch by updatedAt (most recent first)
      batchItems.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      if (batchItems.length > 1) {
        grouped.push({ isBatch: true, items: batchItems });
      } else {
        grouped.push(...batchItems);
      }
    });
    grouped.push(...singles);
    
    return [day, grouped];
  });
}

// --- MAIN PAGE ---
export default function AulaContent({ initialClienteId = null, hideSidebar = false }) {
  const { data: session, status } = useSession();
  const [items, setItems] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroMateria, setFiltroMateria] = useState("");
  const [filtroSottocategoria, setFiltroSottocategoria] = useState(null); // obbligatoria
  const [search, setSearch] = useState("");
  // Stato modale Voti
  const [showVoto, setShowVoto] = useState(false);
  const [votoData, setVotoData] = useState(() => new Date().toISOString().slice(0,10));
  const [votoMateria, setVotoMateria] = useState("");
  const [votoVal, setVotoVal] = useState("");
  const [votoArgomento, setVotoArgomento] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [previewBatch, setPreviewBatch] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("bacheca"); // imposta default a "bacheca"
  const headerRef = useRef(null);
  const [asideTop, setAsideTop] = useState(96);
  // Move sidebar refs near header ref to avoid referential TDZ issues in useEffect
  const sidebarTagRef = useRef(null);
  const [rightAsideMarginTop, setRightAsideMarginTop] = useState(36);

  // Debug: print the computed sticky offsets on each render (only in dev)
  if (process.env.NODE_ENV !== 'production') {
    try { console.log('[AulaContent] render asideTop', asideTop, 'rightAsideMarginTop', rightAsideMarginTop); } catch (e) { }
  }

  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "operatore";
  const myClienteId = session?.user?.clienteId ? String(session.user.clienteId) : "";
  const initialClienteIdStr = initialClienteId ? String(initialClienteId) : "";
  const targetClienteId = isAdmin ? initialClienteIdStr : myClienteId;
  const hasTarget = Boolean(targetClienteId);

  // --- COMMENTI
  const [commenti, addCommento] = useCommenti(items);

  // --- FETCH LISTA REALE ---
  async function fetchMateriali(clienteIdToFetch, attempt = 1) {
    setLoading(true);
    try {
      let url = "/api/materiale";
      if (clienteIdToFetch) {
        url += `?clienteId=${clienteIdToFetch}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setItems(list);

      // quick retry once in case of transient empty result (reduces need for multiple F5)
      if (attempt === 1 && clienteIdToFetch && list.length === 0) {
        setTimeout(() => fetchMateriali(clienteIdToFetch, 2), 700);
      }
    } catch (err) {
      console.warn('[AulaContent] fetchMateriali error', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      if (targetClienteId) {
        fetchMateriali(targetClienteId);
      } else {
        setItems([]);
      }
    }
  }, [status, targetClienteId]);

  // --- REALTIME: Auto-refresh quando viene caricato nuovo materiale ---
  useEffect(() => {
    if (!targetClienteId || status !== "authenticated") return;

    let cleanupAbly = () => {};

    (async () => {
      try {
        const ch = await getAblyChannelAsync(`materiale:${targetClienteId}`);
        if (ch) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[AulaContent] Ably channel attached materiale:' + targetClienteId);
          }
          
          const onNewMaterial = ({ data }) => {
            if (process.env.NODE_ENV !== 'production') {
              console.log('[AulaContent] received new-material', data);
            }
            // Ricarica automaticamente la lista
            fetchMateriali(targetClienteId);
          };

          const onDeleteMaterial = ({ data }) => {
            if (process.env.NODE_ENV !== 'production') {
              console.log('[AulaContent] received delete-material', data);
            }
            // Ricarica automaticamente la lista
            fetchMateriali(targetClienteId);
          };

          ch.subscribe('new-material', onNewMaterial);
          ch.subscribe('delete-material', onDeleteMaterial);

          cleanupAbly = () => {
            ch.unsubscribe('new-material', onNewMaterial);
            ch.unsubscribe('delete-material', onDeleteMaterial);
            ch.detach();
          };
        }
      } catch (err) {
        console.error('[AulaContent] Ably setup error:', err);
      }
    })();

    return () => cleanupAbly();
  }, [targetClienteId, status]);

  // Keyboard handlers for batch preview navigation (attach only when previewBatch is open)
  useEffect(() => {
    if (!previewBatch) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setPreviewBatch(null);
      } else if (e.key === 'ArrowLeft') {
        setPreviewIndex(i => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        setPreviewIndex(i => Math.min(previewBatch.length - 1, i + 1));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [previewBatch]);

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
    
    // Filtro per tab attiva
    if (activeTab === "compiti") {
      list = list.filter(it => (it.sezione || '').toUpperCase() === "COMPITI");
    } else if (activeTab === "materiale") {
      list = list.filter(it => (it.sezione || '').toUpperCase() === "MATERIALE");
    } else if (activeTab === "programma") {
      list = list.filter(it => (it.sezione || '').toUpperCase() === "PROGRAMMA");
    } else if (activeTab === "voti") {
      list = list.filter(it => (it.sezione || '').toUpperCase() === "VOTI");
    }
    // bacheca mostra tutto, quindi non filtriamo
    
    if (filtroTipo) {
      list = list.filter(it => it.tipo === filtroTipo);
    }
    if (filtroMateria) {
      list = list.filter(it => it.materia === filtroMateria);
    }
    const hasAnySotto = items.some(it => it.sottocategoria);
    if (filtroSottocategoria) {
      list = list.filter(it => it.sottocategoria === filtroSottocategoria);
    } else if (hasAnySotto) {
      // se ci sono sottocategorie ma non è selezionata: vuoto (obbligatoria)
      list = [];
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(it =>
        (it.titolo || "").toLowerCase().includes(q) ||
        (it.materia || "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [items, filtroTipo, filtroMateria, filtroSottocategoria, search, activeTab]);

  // Tipi di file mostrati come tag in ordine fisso
  const TIPI_TAG_ORDER = [
    'pdf','doc','docx','xls','xlsx','ppt','pptx','png','jpg','jpeg','txt'
  ];

  // Recupera nome studente da lista clienti (solo per admin/operator)
  const [clienti, setClienti] = useState([]);
  const [studenteCorrente, setStudenteCorrente] = useState(null);
  
  useEffect(() => {
    if (isAdmin) {
      fetch("/api/clienti?tipo=STUDENTE")
        .then(r => r.json())
        .then(data => setClienti(Array.isArray(data) ? data : []))
        .catch(() => setClienti([]));
    }
  }, [isAdmin]);
  
  // Recupera i dati dello studente corrente (per ottenere le sue materie)
  useEffect(() => {
    if (targetClienteId) {
      fetch(`/api/clienti/${targetClienteId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => setStudenteCorrente(data))
        .catch(() => setStudenteCorrente(null));
    } else {
      setStudenteCorrente(null);
    }
  }, [targetClienteId]);
  
  function getStudenteLabel(clienteId) {
    const c = clienti.find(x => String(x.id) === String(clienteId));
    if (!c) return "";
    return c.nomeReferente || c.email || `Studente #${clienteId}`;
  }
  
  // Materie dello studente (fallback a array vuoto se non disponibili)
  const materieStudente = studenteCorrente?.materie || [];
  
  // Colore tema dello studente (default blu se non impostato)
  const coloreTema = studenteCorrente?.coloreTema || "#1cb0f6";

  // Enforce mandatory sottocategoria selection when available for current section (materiale/compiti)
  useEffect(() => {
    const sez = (activeTab || '').toUpperCase();
    if (sez !== 'MATERIALE' && sez !== 'COMPITI') return;
    const cats = Array.from(new Set(items
      .filter(it => (it.sezione || '').toUpperCase() === sez)
      .map(it => it.sottocategoria)
      .filter(Boolean)));
    if (cats.length === 0) {
      if (filtroSottocategoria !== null) setFiltroSottocategoria(null);
      return;
    }
    if (!cats.includes(filtroSottocategoria)) {
      setFiltroSottocategoria(cats[0]);
    }
  }, [items, activeTab]);

  // Measure header height to apply as sticky offset for right aside and other sticky elements
  useEffect(() => {
    function updateTop() {
      try {
        const h = headerRef?.current ? headerRef.current.getBoundingClientRect().height : 96;
        // add a small gap to place the sticky aside below the header (pixel tweak)
        const offset = Math.round(h + 10);
        console.log('[AulaContent] updateTop headerHeight', h, 'asideTop', offset);
        setAsideTop(offset);
      } catch (e) {
        setAsideTop(96);
      }
    }
    updateTop();
    // Also re-measure after a frame and a short delay to catch layout changes
    const raf = requestAnimationFrame(() => updateTop());
    const t1 = setTimeout(() => updateTop(), 150);
    const t2 = setTimeout(() => updateTop(), 500);
    window.addEventListener('resize', updateTop);
    // Combined cleanup: remove listener and cancel timers/RAF
    return () => { window.removeEventListener('resize', updateTop); cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); };
  }, [headerRef, coloreTema]);

  // Measure position of 'Tag' heading and set rightAside marginTop to match it
  useEffect(() => {
    function alignRightAside() {
      try {
        if (!sidebarTagRef?.current || !headerRef?.current) return setRightAsideMarginTop(36);
        const headerRect = headerRef.current.getBoundingClientRect();
        const tagRect = sidebarTagRef.current.getBoundingClientRect();
        const delta = Math.max(0, Math.round(tagRect.top - headerRect.bottom));
        console.log('[AulaContent] alignRightAside headerRect.bottom', headerRect.bottom, 'tagRect.top', tagRect.top, 'delta', delta);
        // add a small fallback if delta is too small
        setRightAsideMarginTop(delta || 36);
      } catch (_) { setRightAsideMarginTop(36); }
    }
    alignRightAside();
    // Reevaluate after paint & short delays to ensure Tag/ header positions are stable
    requestAnimationFrame(() => alignRightAside());
    const tA = setTimeout(() => alignRightAside(), 80);
    const tB = setTimeout(() => alignRightAside(), 250);
    window.addEventListener('resize', alignRightAside);
    return () => { window.removeEventListener('resize', alignRightAside); clearTimeout(tA); clearTimeout(tB); };
  }, [sidebarTagRef, headerRef]);

  async function handleDeleteMateriale(fileId) {
    if (!window.confirm("Sei sicuro di voler eliminare questo materiale?")) return;
    const res = await fetch(`/api/materiale?fileId=${fileId}`, { method: "DELETE" });
    if (res.ok) {
      if (targetClienteId) {
        fetchMateriali(targetClienteId);
      } else {
        setItems([]);
      }
      // Emit realtime delete notification for other clients
      try {
        if (targetClienteId) {
          const ch = await getAblyChannelAsync(`materiale:${targetClienteId}`);
          if (ch) ch.publish('delete-material', { clienteId: Number(targetClienteId), materialeId: Number(fileId) });
        }
      } catch (_) {}
    } else {
      alert("Errore durante l'eliminazione del materiale");
    }
  }

  if (status === "loading") {
    return <div><Navbar /><div style={{ padding: 40 }}>Caricamento…</div></div>;
  }
  if (!session) return null;

  // Materie da mostrare nella sidebar: usa quelle dello studente se disponibili, altrimenti quelle nei materiali
  const materieSidebar = materieStudente.length > 0 ? materieStudente : materieEffettive;

  // Helper per scurire/schiarire un colore
  function adjustColorBrightness(hex, percent) {
    // Rimuove il # se presente
    hex = hex.replace('#', '');
    
    // Converte hex in RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    
    // Applica la percentuale
    r = Math.min(255, Math.max(0, r + (r * percent / 100)));
    g = Math.min(255, Math.max(0, g + (g * percent / 100)));
    b = Math.min(255, Math.max(0, b + (b * percent / 100)));
    
    // Converte di nuovo in hex
    const rr = Math.round(r).toString(16).padStart(2, '0');
    const gg = Math.round(g).toString(16).padStart(2, '0');
    const bb = Math.round(b).toString(16).padStart(2, '0');
    
    return `#${rr}${gg}${bb}`;
  }


  // ---- SIDEBAR (desktop) con ricerca e filtri spostati a sinistra ----
  const sidebar = (
    <aside style={sidebarStyle}>
      {/* Bottone videolezione a sinistra, sopra i tag, allineato con le sezioni */}
      {targetClienteId && studenteCorrente && (
        <button
          style={{
            ...videoLinkButton,
            background: coloreTema,
            boxShadow: `0 4px 12px ${coloreTema}40`,
            width: '100%',
            justifyContent: 'center',
            marginTop: 24,
            marginBottom: 18
          }}
          onClick={() => {
            const link = studenteCorrente.linkVideolezione;
            if (link) {
              window.open(link, '_blank', 'noopener,noreferrer');
            } else {
              alert('Link videolezione non configurato per questo studente');
            }
          }}
          title="Apri videolezione"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
          <span>Videolezione</span>
        </button>
      )}
      {/* TAG UNIFICATI */}
      <div style={sidebarBox}>
        <div ref={sidebarTagRef} style={{fontWeight:700, color: coloreTema, marginBottom:10}}>Tag</div>
        
        {/* Sezioni */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:600,color:"#5a6d90",marginBottom:6}}>SEZIONI</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {["materiale", "compiti"].map(sez => {
              const isActive = activeTab === sez;
              return (
                <button
                  key={sez}
                  onClick={() => setActiveTab(sez)}
                  style={{
                    ...tagButton,
                    background: isActive ? coloreTema : `${coloreTema}15`,
                    color: isActive ? "#fff" : coloreTema,
                    borderColor: isActive ? coloreTema : `${coloreTema}40`
                  }}
                >
                  {sez.charAt(0).toUpperCase() + sez.slice(1)}
                </button>
              );
            })}
            {/* Rimosso 'Tutto' per rendere obbligatoria la selezione materiale/compiti */}
          </div>
        </div>

        {/* Materie */}
        {materieSidebar.length > 0 && (
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:600,color:"#5a6d90",marginBottom:6}}>MATERIE</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              <button
                onClick={() => setFiltroMateria("")}
                style={{
                  ...tagButton,
                  background: filtroMateria === "" ? coloreTema : `${coloreTema}15`,
                  color: filtroMateria === "" ? "#fff" : coloreTema,
                  borderColor: filtroMateria === "" ? coloreTema : `${coloreTema}40`
                }}
              >
                Tutte
              </button>
              {materieSidebar.map(materia => (
                <button
                  key={materia}
                  onClick={() => setFiltroMateria(materia)}
                  style={{
                    ...tagButton,
                    background: filtroMateria === materia ? coloreTema : `${coloreTema}15`,
                    color: filtroMateria === materia ? "#fff" : coloreTema,
                    borderColor: filtroMateria === materia ? coloreTema : `${coloreTema}40`
                  }}
                >
                  {materia}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tipi di file (solo set consentito) */}
        {tipi.length > 0 && (
          <div>
            <div style={{fontSize:12,fontWeight:600,color:"#5a6d90",marginBottom:6}}>TIPI FILE</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              <button
                onClick={() => setFiltroTipo("")}
                style={{
                  ...tagButton,
                  background: filtroTipo === "" ? coloreTema : `${coloreTema}15`,
                  color: filtroTipo === "" ? "#fff" : coloreTema,
                  borderColor: filtroTipo === "" ? coloreTema : `${coloreTema}40`
                }}
              >
                Tutti
              </button>
              {TIPI_TAG_ORDER.filter(t => tipi.includes(t)).map(tipo => (
                <button
                  key={tipo}
                  onClick={() => setFiltroTipo(tipo)}
                  style={{
                    ...tagButton,
                    background: filtroTipo === tipo ? coloreTema : `${coloreTema}15`,
                    color: filtroTipo === tipo ? "#fff" : coloreTema,
                    borderColor: filtroTipo === tipo ? coloreTema : `${coloreTema}40`
                  }}
                >
                  {tipo.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Filtro Sottocategoria (obbligatorio se presenti sottocategorie) */}
        {hasTarget && items.some(it => it.sottocategoria) && (
          <div style={{...sidebarBox, marginTop: 0}}>
            <div style={{fontWeight:700, color: coloreTema, marginBottom:10}}>Tipo materiale</div>
            <div style={{display:"flex", flexWrap:"wrap", gap:"8px"}}>
              {['TEORIA', 'SIMULAZIONI', 'ESERCIZI'].map(sottocat => {
                const hasItems = items.some(it => it.sottocategoria === sottocat);
                if (!hasItems) return null;
                const label = sottocat === 'TEORIA' ? 'Teoria' : 
                             sottocat === 'SIMULAZIONI' ? 'Simulazioni' : 'Esercizi';
                return (
                  <button
                    key={sottocat}
                    onClick={() => setFiltroSottocategoria(sottocat)}
                    style={{
                      ...tagButton,
                      background: filtroSottocategoria === sottocat ? coloreTema : `${coloreTema}15`,
                      color: filtroSottocategoria === sottocat ? "#fff" : coloreTema,
                      borderColor: filtroSottocategoria === sottocat ? coloreTema : `${coloreTema}40`
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {/* Ricerca e filtri */}
      <div style={sidebarBox}>
        <div style={{fontWeight:700, color: coloreTema, marginBottom:10}}>Ricerca</div>
        <input
          placeholder="Cerca titolo o materia..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{...searchInput, width:'100%', borderColor: coloreTema}}
        />
        <div style={{height:10}}/>
        <button
          style={{...btnPrimary, background: coloreTema, boxShadow: `0 2px 6px ${coloreTema}55`, width:'100%'}}
          onClick={()=>{ /* i filtri sono live; bottone solo per UX */ }}
        >Cerca</button>
      </div>
    </aside>
  );

  // Raggruppa per giorno
  const grouped = groupByDay(visible);

  // --- HEADER LOGICA CORRETTA
  let titoloAula = "Aula";
  if (isAdmin && targetClienteId && getStudenteLabel(targetClienteId)) {
    titoloAula = `Aula di ${getStudenteLabel(targetClienteId)}`;
  } else if (!isAdmin && session?.user?.nome) {
    titoloAula = `Aula di ${session.user.nome}`;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f8ff" }}>
      <Navbar />
      {/* HEADER stile classroom con gradiente coloreTema */}
      <header ref={headerRef} style={{
        ...headerStyle, 
        background: `linear-gradient(135deg, ${coloreTema} 0%, ${adjustColorBrightness(coloreTema, -30)} 100%)`
      }}>
        <div style={headerBanner}>
          <div style={{ fontSize:32, fontWeight:800, color:"#fff" }}>
            {titoloAula}
          </div>
          <div style={{ fontSize:16, color:"#e7ecfa", marginTop:6 }}>
            Spazio Aula per condividere e scaricare materiali didattici.
          </div>
        </div>
      </header>

      <div style={pageGrid}>
        {hasTarget && !hideSidebar && activeTab !== 'programma' && <div style={sidebarWrap}>{sidebar}</div>}
        <main style={mainStyle}>
          {(!hasTarget && isAdmin) ? (
            <div style={{ ...emptyBox, marginTop: 0 }}>
              Seleziona uno studente dalla pagina <a href="/aule" style={{ color: "#20489a", textDecoration: "underline" }}>Aule</a>
              {" "}per visualizzare l'aula dedicata e gestire i materiali.
            </div>
          ) : (
            <>
          {/* TABS CLASSROOM */}
          {targetClienteId && (
            <div style={{
              display: "flex",
              gap: "8px",
              marginTop: "24px",
              marginBottom: "8px",
              borderBottom: "2px solid #e0e4f0",
              paddingBottom: "0"
            }}>
                {["bacheca", "compiti", "materiale", "programma", "voti"].map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        background: "transparent",
                        border: "none",
                        borderBottom: isActive ? `3px solid ${coloreTema}` : "3px solid transparent",
                        color: isActive ? coloreTema : "#5a6c8f",
                        padding: "12px 20px",
                        fontSize: "15px",
                        fontWeight: isActive ? 700 : 500,
                        cursor: "pointer",
                        textTransform: "capitalize",
                        transition: "all 0.2s ease",
                        marginBottom: "-2px"
                      }}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  );
                })}
            </div>
          )}

          {/* BAR: azioni principali a destra */}
          <div style={barFlex}>
            <div />
            <div style={filtersBarRight}>
              {/* Show action buttons based on activeTab: material/compiti -> Carica Materiale, admin Elimina tutti
                  bacheca -> no buttons
                  programma -> no buttons
                  voti -> show registra voto + delete votes (admin) */}
              {targetClienteId && (activeTab === 'materiale' || activeTab === 'compiti') && (
                <>
                  <button style={{...btnPrimary, background: coloreTema, boxShadow: `0 2px 6px ${coloreTema}55`}} onClick={() => setShowUpload(true)}>
                    Carica materiale
                  </button>
                </>
              )}

              {activeTab === 'voti' && targetClienteId && (
                <>
                  <button style={{...btnOutline, borderColor: coloreTema, color: coloreTema, fontWeight:700}} onClick={()=>setShowVoto(true)}>
                    Registra voto
                  </button>
                  {isAdmin && targetClienteId && (
                    <EliminaTuttiMateriali
                      clienteId={targetClienteId}
                      sezione={'VOTI'}
                      onDeleted={() => fetchMateriali(targetClienteId)}
                    />
                  )}
                </>
              )}
              {isAdmin && targetClienteId && (activeTab === 'materiale' || activeTab === 'compiti') && (
                <EliminaTuttiMateriali
                  clienteId={targetClienteId}
                  onDeleted={() => fetchMateriali(targetClienteId)}
                />
              )}
            </div>
          </div>
          {loading && <div style={{margin:30}}>Caricamento…</div>}
          {/* ProgrammaPreview will be rendered as a right-side aside in Bacheca */}

          {activeTab === 'programma' && targetClienteId && (
            <div style={{ marginTop: 14 }}>
                <ProgrammaPanel clienteId={targetClienteId} coloreTema={coloreTema} isAdmin={isAdmin} materie={materieStudente} hideAside={true} asideTop={asideTop} />
            </div>
          )}
          {visible.length === 0 && !loading && activeTab !== 'programma' && (
            <div style={emptyBox}>Nessun materiale trovato.</div>
          )}

          {/* STREAM stile classroom con giorni e batch */}
          <div style={streamWrap}>
            {grouped.map(([giorno, items]) => (
              <React.Fragment key={giorno}>
                <div style={{...dayHeaderStyle, color: coloreTema}}>{formatDayHeader(giorno)}</div>
                {items.map((item, idx) => {
                  // Batch di file multipli
                  if (item.isBatch) {
                    const batchItems = item.items;
                    const firstItem = batchItems[0];
                    return (
                      <div key={`batch-${firstItem.uploadBatchId}`} style={streamCard}>
                        <div style={streamCardHead}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <h3 style={{...streamCardTitle, color: coloreTema}}>{firstItem.titolo}</h3>
                            {firstItem.sezione && (
                              <span style={{...badgeTipo(firstItem.sezione), background: coloreTema}}>
                                {String(firstItem.sezione).toUpperCase()}
                              </span>
                            )}
                            <span style={{fontSize:13,color:"#5a6d90"}}>({batchItems.length} file)</span>
                          </div>
                          {isAdmin && (
                            <button
                              style={streamMenuBtn}
                              title="Elimina tutti"
                              onClick={() => {
                                if (window.confirm(`Eliminare tutti i ${batchItems.length} file?`)) {
                                  batchItems.forEach(m => handleDeleteMateriale(m.id));
                                }
                              }}
                            >✕</button>
                          )}
                        </div>
                        <div style={streamCardBody}>
                          {/* Griglia immagini batch */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: batchItems.length === 2 ? 'repeat(2, 1fr)' : batchItems.length === 3 ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: 10,
                            marginBottom: 12
                          }}>
                            {batchItems.slice(0, 4).map((m, idx) => {
                              const isImage = ["jpg","jpeg","png","gif","bmp","webp"].includes((m.tipo||"").toLowerCase());
                              return (
                                <div 
                                  key={m.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => { setPreviewBatch(batchItems); setPreviewIndex(idx); }}
                                  onKeyDown={(e)=>{ if(e.key==='Enter') { setPreviewBatch(batchItems); setPreviewIndex(idx); } }}
                                  style={{
                                    cursor: 'pointer',
                                    position: 'relative',
                                    aspectRatio: '1',
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                    background: '#f5f7fa',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid #e0e0e0'
                                  }}
                                >
                                  {isImage ? (
                                    <img
                                      src={`/api/materiale?fileId=${m.id}`}
                                      alt={m.nomeOriginale}
                                      style={{width:'100%',height:'100%',objectFit:'cover'}}
                                    />
                                  ) : (
                                    <div style={{textAlign:'center',padding:10}}>
                                      <FileIcon tipo={m.tipo} />
                                      <div style={{fontSize:11,color:'#5a6d90',marginTop:5,wordBreak:'break-word'}}>
                                        {m.nomeOriginale}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {batchItems.length > 4 && (
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => { setPreviewBatch(batchItems); setPreviewIndex(4); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { setPreviewBatch(batchItems); setPreviewIndex(4); } }}
                                style={{
                                cursor: 'pointer',
                                position: 'relative',
                                aspectRatio: '1',
                                borderRadius: 8,
                                background: '#f5f7fa',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #e0e0e0',
                                fontSize: 24,
                                fontWeight: 700,
                                color: coloreTema
                              }}>
                                +{batchItems.length - 4}
                              </div>
                            )}
                          </div>
                          
                          <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                            {firstItem.materia && <span style={{...categoria, background: `${coloreTema}20`, color: coloreTema}}>{firstItem.materia}</span>}
                            {firstItem.sottocategoria && <span style={{...categoria, background: `${coloreTema}15`, color: coloreTema, fontSize: 11, fontWeight: 500}}>{
                              firstItem.sottocategoria === 'TEORIA' ? 'Teoria' :
                              firstItem.sottocategoria === 'SIMULAZIONI' ? 'Simulazioni' :
                              firstItem.sottocategoria === 'ESERCIZI' ? 'Esercizi' : firstItem.sottocategoria
                            }</span>}
                            {isAdmin && <span style={clientePill}>{getStudenteLabel(firstItem.clienteId)}</span>}
                          </div>
                          <div style={{fontSize:13,color:"#5a6d90",marginBottom:7}}>
                            Caricato il {formatAggDate(firstItem.updatedAt)}
                          </div>
                          <div style={{ display:"flex", gap:10, marginBottom:12 }}>
                                  {((firstItem.sezione || '').toUpperCase() !== 'PROGRAMMA' && activeTab !== 'programma') && (
                                    <button type="button" style={btnGhost} onClick={() => { setPreviewBatch(batchItems); setPreviewIndex(0); }}>
                                Vedi file
                              </button>
                                  )}
                          </div>
                          
                          {/* Commenti batch */}
                          <CommentiBox
                            materialeId={firstItem.id}
                            lista={commenti[firstItem.id] || []}
                            user={session?.user}
                            addCommento={addCommento}
                            coloreTema={coloreTema}
                          />
                        </div>
                      </div>
                    );
                  }
                  
                  // File singolo
                  const m = item;
                  return (
                  <div key={m.id} style={streamCard}>
                    <div style={streamCardHead}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <h3 style={{...streamCardTitle, color: coloreTema}}>{m.titolo}</h3>
                        {m.sezione && (
                          <span style={{...badgeTipo(m.sezione), background: coloreTema}}>{String(m.sezione).toUpperCase()}</span>
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
                      {(["jpg","jpeg","png","gif","bmp","webp"].includes((m.tipo||"").toLowerCase()) && ((m.sezione || '').toUpperCase() !== 'PROGRAMMA') && activeTab !== 'programma') && (
                        <div role="button" tabIndex={0} onClick={() => setPreviewItem(m)} onKeyDown={(e)=>{ if(e.key==='Enter') setPreviewItem(m); }} style={{cursor:'pointer'}}>
                          <img
                            src={`/api/materiale?fileId=${m.id}`}
                            alt={m.titolo}
                            style={{maxWidth:"100%",maxHeight:240,borderRadius:12,marginBottom:10,boxShadow:"0 2px 10px #20489a22"}}
                          />
                        </div>
                      )}
                      <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                        {m.materia && <span style={{...categoria, background: `${coloreTema}20`, color: coloreTema}}>{m.materia}</span>}
                        {m.sottocategoria && <span style={{...categoria, background: `${coloreTema}15`, color: coloreTema, fontSize: 11, fontWeight: 500}}>{
                          m.sottocategoria === 'TEORIA' ? 'Teoria' :
                          m.sottocategoria === 'SIMULAZIONI' ? 'Simulazioni' :
                          m.sottocategoria === 'ESERCIZI' ? 'Esercizi' : m.sottocategoria
                        }</span>}
                        {isAdmin && <span style={clientePill}>{getStudenteLabel(m.clienteId)}</span>}
                        {typeof m.tipo === "string" && m.tipo.trim() && m.tipo !== "undefined" && !["jpg","jpeg","png","gif","bmp","webp"].includes(m.tipo.toLowerCase()) &&
                          <FileIcon tipo={m.tipo} />
                        }
                      </div>
                      <div style={{fontSize:13,color:"#5a6d90",marginBottom:7}}>
                        Caricato il {formatAggDate(m.updatedAt)}
                      </div>
                      <div style={{ display:"flex", gap:10, marginBottom:12 }}>
                        {((m.sezione || '').toUpperCase() !== 'PROGRAMMA' && activeTab !== 'programma') && (
                          <button type="button" style={btnGhost} onClick={() => setPreviewItem(m)}>Anteprima</button>
                        )}
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
                        coloreTema={coloreTema}
                      />
                    </div>
                  </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
            </>
          )}
        </main>

        {activeTab === 'bacheca' && targetClienteId && (
          <div style={{ ...rightAsideWrap, margin: `0 24px 0 0`, position: 'sticky', top: asideTop + rightAsideMarginTop }}>
            <div style={{ background: '#fff', padding: 12, borderRadius: 12, boxShadow: '0 2px 10px #20489a15', marginBottom: 24 }}> {/* Added marginBottom */}
              <ProgrammaPreview clienteId={targetClienteId} coloreTema={coloreTema} materie={materieStudente} onOpenProgramma={() => setActiveTab('programma')} noTopPadding={true} />
            </div>
            {/* Mini-calendar */}
            <div style={{ background: '#fff', padding: 12, borderRadius: 12, boxShadow: '0 2px 10px #20489a15' }}>
              <CalendarioAttivita
                clienteId={targetClienteId}
                initialMode="month"
                allowModeSwitch={false}
                allowNavigation={false}
                showLegend={false}
                enableStudentRequests={false}
                enableAdminRequests={false}
              />
            </div>
          </div>
        )}

      </div>
      {/* Modale upload */}
      {/* Modale preview materiale */}
      {previewItem && (
        <div style={{position:'fixed',inset:0,background:'rgba(16,24,64,0.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1100,padding:20}} onClick={() => setPreviewItem(null)} onWheel={(e) => e.stopPropagation()}>
          <div role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()} style={{background:'#fff',borderRadius:12,maxWidth:'95%',maxHeight:'95vh',width:1000,height:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 10px 40px rgba(0,0,0,0.4)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:12,borderBottom:`2px solid ${coloreTema}`,flexShrink:0}}>
              <div style={{fontWeight:700,color: coloreTema}}>{previewItem.titolo || previewItem.nomeOriginale}</div>
              <div>
                <a href={`/api/materiale?fileId=${previewItem.id}`} style={{...btnGhost, marginRight:8}} download={previewItem.nomeOriginale}>Scarica</a>
                <button type="button" style={{...btnOutline, borderColor: coloreTema, color: coloreTema}} onClick={() => setPreviewItem(null)}>Chiudi</button>
              </div>
            </div>
            <div style={{padding:16,display:'flex',alignItems:'center',justifyContent:'center',flex:1,overflow:'hidden',minHeight:0}}>
              {(() => {
                const tipo = (previewItem.tipo || '').toLowerCase();
                if (['jpg','jpeg','png','gif','bmp','webp'].includes(tipo)) {
                  return <ImagePreviewWithZoom src={`/api/materiale?fileId=${previewItem.id}`} alt={previewItem.titolo} coloreTema={coloreTema} />;
                }
                if (tipo === 'pdf') {
                  return <PDFPreviewWithControls src={`/api/materiale?fileId=${previewItem.id}`} title={previewItem.titolo} coloreTema={coloreTema} />;
                }
                // other files: show icon + info
                return (
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:64,fontWeight:700,color: coloreTema,marginBottom:12}}>{previewItem.tipo ? previewItem.tipo.toUpperCase() : 'FILE'}</div>
                    <div style={{marginBottom:8,fontWeight:700}}>{previewItem.nomeOriginale || previewItem.titolo}</div>
                    <div style={{color:'#6b7b9a',marginBottom:12}}>{previewItem.materia}</div>
                    <a href={`/api/materiale?fileId=${previewItem.id}`} download={previewItem.nomeOriginale} style={{...btnPrimary, background: coloreTema, boxShadow: `0 2px 6px ${coloreTema}55`}}>Scarica file</a>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      {/* Modale preview batch (carousel) */}
      {previewBatch && (
        <div style={{position:'fixed',inset:0,background:'rgba(16,24,64,0.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1110,padding:20}} onClick={() => setPreviewBatch(null)}>
          <div role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()} style={{background:'#fff',borderRadius:12,maxWidth:'95%',maxHeight:'95vh',width:1100,height:'92vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 10px 40px rgba(0,0,0,0.45)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:12,borderBottom:`2px solid ${coloreTema}`,flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{fontWeight:700,color: coloreTema}}>{(previewBatch[previewIndex] && (previewBatch[previewIndex].titolo || previewBatch[previewIndex].nomeOriginale)) || 'Anteprima'}</div>
                <div style={{fontSize:13,color:'#5a6d90'}}>{previewIndex + 1} / {previewBatch.length}</div>
              </div>
              <div>
                {previewBatch[previewIndex] && (
                  <a href={`/api/materiale?fileId=${previewBatch[previewIndex].id}`} style={{...btnGhost, marginRight:8}} download={previewBatch[previewIndex].nomeOriginale}>Scarica</a>
                )}
                <button type="button" style={{...btnOutline, borderColor: coloreTema, color: coloreTema}} onClick={() => setPreviewBatch(null)}>Chiudi</button>
              </div>
            </div>

            <div style={{position:'relative',padding:16,display:'flex',alignItems:'center',justifyContent:'center',flex:1,overflow:'hidden',minHeight:0}}>
              {/* Prev / Next side buttons */}
              <button
                type="button"
                onClick={(e)=>{ e.stopPropagation(); setPreviewIndex(i => Math.max(0, i-1)); }}
                disabled={previewIndex <= 0}
                style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',zIndex:20,background:'transparent',border:'none',fontSize:40,color: previewIndex <= 0 ? '#ccc' : coloreTema, cursor: previewIndex <= 0 ? 'not-allowed' : 'pointer'}}
                aria-label="Prev"
              >◀</button>
              <button
                type="button"
                onClick={(e)=>{ e.stopPropagation(); setPreviewIndex(i => Math.min(previewBatch.length - 1, i + 1)); }}
                disabled={previewIndex >= previewBatch.length - 1}
                style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',zIndex:20,background:'transparent',border:'none',fontSize:40,color: previewIndex >= previewBatch.length - 1 ? '#ccc' : coloreTema, cursor: previewIndex >= previewBatch.length - 1 ? 'not-allowed' : 'pointer'}}
                aria-label="Next"
              >▶</button>

              <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                {(() => {
                  const cur = previewBatch[previewIndex];
                  if (!cur) return null;
                  const tipo = (cur.tipo || '').toLowerCase();
                  if (['jpg','jpeg','png','gif','bmp','webp'].includes(tipo)) {
                    return <ImagePreviewWithZoom src={`/api/materiale?fileId=${cur.id}`} alt={cur.titolo} coloreTema={coloreTema} />;
                  }
                  if (tipo === 'pdf') {
                    return <PDFPreviewWithControls src={`/api/materiale?fileId=${cur.id}`} title={cur.titolo} coloreTema={coloreTema} />;
                  }
                  return (
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:64,fontWeight:700,color: coloreTema,marginBottom:12}}>{cur.tipo ? cur.tipo.toUpperCase() : 'FILE'}</div>
                      <div style={{marginBottom:8,fontWeight:700}}>{cur.nomeOriginale || cur.titolo}</div>
                      <div style={{color:'#6b7b9a',marginBottom:12}}>{cur.materia}</div>
                      <a href={`/api/materiale?fileId=${cur.id}`} download={cur.nomeOriginale} style={{...btnPrimary, background: coloreTema, boxShadow: `0 2px 6px ${coloreTema}55`}}>Scarica file</a>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      
      <UploadMaterialeModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={() => targetClienteId ? fetchMateriali(targetClienteId) : undefined}
        clienteId={targetClienteId}
        materieStudente={materieStudente}
        coloreTema={coloreTema}
      />

      {/* MODALE VOTI */}
      {showVoto && (
        <div style={{position:'fixed',inset:0,background:'rgba(32,72,154,0.15)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',borderRadius:14,padding:22,minWidth:320,boxShadow:'0 8px 28px #2563eb35'}}>
            <h3 style={{marginTop:0,marginBottom:14,color: coloreTema}}>Registra voto</h3>
            <div style={{display:'grid',gap:10}}>
              <div>
                <label style={{fontWeight:600,fontSize:14,color: coloreTema}}>Data</label>
                <input type="date" value={votoData} onChange={e=>setVotoData(e.target.value)} style={{...inputStyle, borderColor: coloreTema}}/>
              </div>
              {materieSidebar.length > 1 && (
                <div>
                  <label style={{fontWeight:600,fontSize:14,color: coloreTema}}>Materia</label>
                  <select value={votoMateria} onChange={e=>setVotoMateria(e.target.value)} style={{...inputStyle, borderColor: coloreTema}}>
                    <option value="">- Seleziona -</option>
                    {materieSidebar.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{fontWeight:600,fontSize:14,color: coloreTema}}>Argomento</label>
                <input 
                  type="text" 
                  placeholder="Es: Equazioni di secondo grado, Guerra Fredda..." 
                  value={votoArgomento} 
                  onChange={e=>setVotoArgomento(e.target.value)} 
                  style={{...inputStyle, borderColor: coloreTema}}
                />
              </div>
              <div>
                <label style={{fontWeight:600,fontSize:14,color: coloreTema}}>Voto</label>
                <input type="number" step="0.5" min="0" max="10" value={votoVal} onChange={e=>setVotoVal(e.target.value)} style={{...inputStyle, borderColor: coloreTema}}/>
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:14}}>
              <button style={btnGhost} onClick={()=>setShowVoto(false)}>Annulla</button>
              <button
                style={{...btnPrimary, background: coloreTema, boxShadow: `0 2px 6px ${coloreTema}55`}}
                onClick={async ()=>{
                  if (!targetClienteId) return;
                  const finalMateria = materieSidebar.length === 1 ? materieSidebar[0] : votoMateria;
                  if (!votoData || !finalMateria || !votoVal) { alert('Compila tutti i campi obbligatori'); return; }
                  // Crea un piccolo file testo JSON e usa la stessa API materiale con sezione=VOTI
                  const payload = { data: votoData, materia: finalMateria, voto: votoVal, argomento: votoArgomento || '' };
                  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                  const file = new File([blob], `voto_${votoData}_${finalMateria}.json`, { type: 'application/json' });
                  const fd = new FormData();
                  fd.append('file', file);
                  const titoloVoto = votoArgomento 
                    ? `Voto ${votoVal} · ${finalMateria} · ${votoArgomento} · ${votoData}`
                    : `Voto ${votoVal} · ${finalMateria} · ${votoData}`;
                  fd.append('titolo', titoloVoto);
                  fd.append('materia', finalMateria);
                  fd.append('sezione', 'VOTI');
                  fd.append('clienteId', targetClienteId);
                  const res = await fetch('/api/materiale', { method:'POST', body: fd });
                  if (!res.ok) { alert('Errore salvataggio voto'); return; }
                  setShowVoto(false);
                  setVotoArgomento('');
                  fetchMateriali(targetClienteId);
                }}
              >Salva voto</button>
            </div>
          </div>
        </div>
      )}
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
function CommentiBox({ materialeId, lista, addCommento, user, coloreTema = "#1cb0f6" }) {
  const [testo, setTesto] = useState("");
  function submitCommento(e) {
    e.preventDefault();
    if (!testo.trim() || !user) return;
    addCommento(materialeId, user.nome || user.email || "Utente", testo.trim());
    setTesto("");
  }
  return (
    <div style={{...streamCommentBox, borderColor: `${coloreTema}20`}}>
      <div style={{marginBottom:3,fontWeight:700,color: coloreTema,fontSize:14}}>
        Commenti ({lista.length})
      </div>
      {lista.length === 0 && (
        <div style={{fontSize:12,color:"#7d8dab",marginBottom:6}}>Nessun commento ancora. Scrivi il primo commento…</div>
      )}
      <div>
        {lista.map((c,i)=>(
          <div key={i} style={{marginBottom:7}}>
            <span style={{fontWeight:600,color: coloreTema,fontSize:13}}>{c.autore}</span>
            <span style={{color:"#8399b2",fontSize:12,marginLeft:7}}>{formatAggDate(c.createdAt)}</span>
            <div style={{fontSize:13}}>{c.testo}</div>
          </div>
        ))}
      </div>
      {user && (
        <form onSubmit={submitCommento} style={{display:"flex",gap:8,marginTop:8}}>
          <input
            style={{...streamCommentInput, color: coloreTema}}
            placeholder="Aggiungi un commento..."
            value={testo}
            onChange={e=>setTesto(e.target.value)}
            maxLength={500}
          />
          <button
            type="submit"
            style={{...btnPrimary,padding:"7px 15px",fontSize:15,margin:0, background: coloreTema, boxShadow: `0 2px 6px ${coloreTema}55`}}
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
const pageGrid = {display:"flex",flexDirection:"row",maxWidth:1600,margin:"0 auto",padding:"0 2vw", alignItems: 'flex-start'};
const sidebarWrap = {minWidth:260,maxWidth:320,margin:"36px 0 0 0",display:"block", alignSelf:'flex-start'};
  const rightAsideWrap = {minWidth:280,maxWidth:360,margin:"36px 24px 0 0",display:"block", alignSelf: 'flex-start'};
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
const videoLinkBox = {
  marginBottom:20,
  display:"flex",
  justifyContent:"center"
};
const videoLinkButton = {
  background:"#1cb0f6",
  color:"#fff",
  border:"none",
  borderRadius:14,
  padding:"14px 28px",
  fontWeight:700,
  fontSize:16,
  cursor:"pointer",
  boxShadow:"0 6px 20px rgba(28,176,246,0.40)",
  display:"flex",
  alignItems:"center",
  gap:12,
  transition:"all 0.2s ease"
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
const tagButton = {
  padding:"6px 12px",
  borderRadius:20,
  border:"1.5px solid",
  fontSize:13,
  fontWeight:600,
  cursor:"pointer",
  transition:"all 0.2s ease",
  whiteSpace:"nowrap"
};