"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import jsPDF from "jspdf";
import "jspdf-autotable";
import html2canvas from "html2canvas";

import { useRichiesteModifica } from "../components/modifiche/useRichiesteModifica";
import AttivitaDettaglioModal from "../components/attivita/AttivitaDettaglioModal";
import RichiestaModificaModal from "../components/modifiche/RichiestaModificaModal";
import ApprovaRichiestaModal from "../admin/modifiche/ApprovaRichiestaModal";
import PacchettoSummaryPanel from "../components/pacchetti/PacchettoSummaryPanel";

const GRACE_MS = 5 * 60 * 1000;
const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 3600 * 1000);

export default function PacchettiLezioniPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [attivita, setAttivita] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState(null);

  const [attivitaSelezionata, setAttivitaSelezionata] = useState(null);
  const [editingAttivita, setEditingAttivita] = useState(null);
  const [attivitaPerRichiesta, setAttivitaPerRichiesta] = useState(null);
  const [showRichiesta, setShowRichiesta] = useState(false);

  const [selectedRichiesta, setSelectedRichiesta] = useState(null);
  const [showModalApprova, setShowModalApprova] = useState(false);
  // Selezione multipla per eliminazione di gruppo
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Filtri Admin
  const [clienti, setClienti] = useState([]);
  const [pacchetti, setPacchetti] = useState([]);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroPacchetto, setFiltroPacchetto] = useState("");
  const [filtroAdminDa, setFiltroAdminDa] = useState("");
  const [filtroAdminA, setFiltroAdminA] = useState("");
  const [filtroMese, setFiltroMese] = useState("");
  const [ordinamento, setOrdinamento] = useState("cronologico"); // cronologico | alfabetico
  
  // Filtri Cliente
  const [filtroTipologia, setFiltroTipologia] = useState(""); // svolta | programmata | cancellata
  const [filtroDataDa, setFiltroDataDa] = useState("");
  const [filtroDataA, setFiltroDataA] = useState("");

  const contentRef = useRef(null);

  const isCliente = session?.user?.role === "cliente";
  const isAdmin = !isCliente;

  async function fetchAttivita() {
    try {
      const r = await fetch("/api/attivita", { cache: "no-store" });
      if (!r.ok) throw new Error("Err " + r.status);
      const js = await r.json();
      setAttivita(Array.isArray(js) ? js : []);
      setErrore(null);
    } catch (e) {
      setErrore(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchClienti() {
    if (!isAdmin) return;
    try {
      const r = await fetch("/api/clienti?tipo=STUDENTE");
      if (r.ok) {
        const js = await r.json();
        setClienti(Array.isArray(js.clienti) ? js.clienti : Array.isArray(js) ? js : []);
      }
    } catch (e) {
      console.error("Errore caricamento clienti:", e);
    }
  }

  async function fetchPacchetti() {
    if (!isAdmin) return;
    try {
      const r = await fetch("/api/pacchetti");
      if (r.ok) {
        const js = await r.json();
        const lista = Array.isArray(js) ? js : [];
        // Ordina alfabeticamente per titolo
        lista.sort((a, b) => {
          const tA = (a.titolo || `Pacchetto #${a.id}`).toLowerCase();
          const tB = (b.titolo || `Pacchetto #${b.id}`).toLowerCase();
          return tA.localeCompare(tB);
        });
        setPacchetti(lista);
      }
    } catch (e) {
      console.error("Errore caricamento pacchetti:", e);
    }
  }

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/signin");
      return;
    }
    fetchAttivita();
    if (isAdmin) {
      fetchClienti();
      fetchPacchetti();
    }
  }, [status, session, router, isAdmin]);

  // Pulizia selezione quando si disattiva il multi-select
  useEffect(() => {
    if (!multiSelect && selectedIds.size) {
      setSelectedIds(new Set());
    }
  }, [multiSelect, selectedIds]);

  const richiesteHook = useRichiesteModifica({ auto: isCliente || isAdmin });
  const richiesteSafe = Array.isArray(richiesteHook?.richieste) ? richiesteHook.richieste : [];
  const byAttivita = richiesteHook?.byAttivita || {};
  const refetchRichieste = richiesteHook?.refetch || (() => Promise.resolve());

  function parseStart(a) {
    return a?.orario ? new Date(a.orario) : new Date(a.createdAt);
  }
  function isPast(a) { return parseStart(a).getTime() < (Date.now() - GRACE_MS); }
  function isFuture(a) { return !isPast(a); }
  function isCancelled(a) { return (a?.stato || "").toLowerCase() === "cancellata"; }
  function formatDateFromValue(val) {
    if (!val) return "—";
    const d = new Date(val);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("it-IT", {
      day: "2-digit", month: "2-digit", year: "numeric"
    }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  function formatDate(a) { return formatDateFromValue(parseStart(a)); }
  function hasOpenRequest(aId) {
    const list = byAttivita[aId] || [];
    return list.some(r => ["pending", "in_review"].includes(r.stato));
  }
  function displayStato(a) {
    const raw = (a?.stato || "").trim();
    if (isCancelled(a)) return "Cancellata";
    if (isPast(a) && (!raw || raw.toLowerCase() === "prenotata")) return "Svolta";
    if (raw) return raw;
    return "Prenotata";
  }
  function canShowRequestButton(a) {
    if (!isCliente) return false;
    if (hasOpenRequest(a.id)) return false;
    if (isCancelled(a)) return false;
    if (!isFuture(a)) return false;
    return true;
  }
  function isModificata(a) {
    return a?.orarioOriginale && a?.orario && a.orarioOriginale !== a.orario;
  }
  
  function renderBadgeRiprogrammata(a) {
    if (!isModificata(a)) return null;
    return (
      <span style={badgeRiprogrammata}>
        Riprogrammata: {formatDateFromValue(a.orarioOriginale)} → {formatDateFromValue(a.orario)}
      </span>
    );
  }

  function getRichiestaDisplayDate(r, att) {
    if (att && ["approved", "archived"].includes(r.stato || "")) {
      return formatDateFromValue(att.orario);
    }
    if (r.nuovoOrario) return formatDateFromValue(r.nuovoOrario);
    if (r.nuovaData) {
      const base = (att?.orarioOriginale) ? new Date(att.orarioOriginale) :
                   (att?.orario ? new Date(att.orario) : null);
      const nuova = new Date(r.nuovaData);
      if (!isNaN(nuova.getTime())) {
        if (base && !isNaN(base.getTime())) {
          const local = new Date(
            nuova.getFullYear(),
            nuova.getMonth(),
            nuova.getDate(),
            base.getHours(),
            base.getMinutes(), 0, 0
          );
          return formatDateFromValue(local);
        }
        return formatDateFromValue(new Date(
          nuova.getFullYear(), nuova.getMonth(), nuova.getDate(), 0,0,0,0
        ));
      }
    }
    if (att) return formatDateFromValue(att.orario);
    return r.attivitaId;
  }

  const { prenotate, svolte, cancellate } = useMemo(() => {
    let filtered = [...(attivita || [])];
    
    // Applica filtri ADMIN
    if (isAdmin) {
      if (filtroCliente) {
        filtered = filtered.filter(a => String(a.clienteId) === String(filtroCliente));
      }
      if (filtroPacchetto) {
        filtered = filtered.filter(a => String(a.pacchettoId) === String(filtroPacchetto));
      }
      if (filtroAdminDa) {
        const da = new Date(filtroAdminDa);
        filtered = filtered.filter(a => parseStart(a) >= da);
      }
      if (filtroAdminA) {
        const a = new Date(filtroAdminA);
        a.setHours(23, 59, 59, 999);
        filtered = filtered.filter(att => parseStart(att) <= a);
      }
    }
    
    // Applica filtri CLIENTE
    if (isCliente) {
      if (filtroTipologia) {
        if (filtroTipologia === "svolta") {
          filtered = filtered.filter(a => !isCancelled(a) && isPast(a));
        } else if (filtroTipologia === "programmata") {
          filtered = filtered.filter(a => !isCancelled(a) && isFuture(a));
        } else if (filtroTipologia === "cancellata") {
          filtered = filtered.filter(a => isCancelled(a));
        }
      }
      if (filtroDataDa) {
        const da = new Date(filtroDataDa);
        filtered = filtered.filter(a => parseStart(a) >= da);
      }
      if (filtroDataA) {
        const a = new Date(filtroDataA);
        a.setHours(23, 59, 59, 999);
        filtered = filtered.filter(att => parseStart(att) <= a);
      }
      if (filtroAdminDa) {
        const da = new Date(filtroAdminDa);
        filtered = filtered.filter(a => parseStart(a) >= da);
      }
      if (filtroAdminA) {
        const a = new Date(filtroAdminA);
        a.setHours(23, 59, 59, 999);
        filtered = filtered.filter(att => parseStart(att) <= a);
      }
    }
    
    const future = [];
    const past = [];
    const canc = [];
    filtered.forEach(a => {
      if (isCancelled(a)) {
        if (isFuture(a)) future.push(a); else canc.push(a);
      } else {
        if (isFuture(a)) future.push(a); else past.push(a);
      }
    });
    
    // Ordinamento ADMIN
    if (isAdmin && ordinamento === "alfabetico") {
      const sortAlpha = (a, b) => {
        const nomeA = a.cliente?.nomeReferente || a.cliente?.email || "";
        const nomeB = b.cliente?.nomeReferente || b.cliente?.email || "";
        return nomeA.localeCompare(nomeB);
      };
      future.sort(sortAlpha);
      past.sort(sortAlpha);
      canc.sort(sortAlpha);
    } else {
      future.sort((a, b) => parseStart(a) - parseStart(b));
      past.sort((a, b) => parseStart(b) - parseStart(a));
      canc.sort((a, b) => parseStart(b) - parseStart(a));
    }
    
    return { prenotate: future, svolte: past, cancellate: canc };
  }, [attivita, filtroCliente, filtroPacchetto, filtroAdminDa, filtroAdminA, filtroTipologia, filtroMese, filtroDataDa, filtroDataA, ordinamento, isAdmin, isCliente]);

  function exportToPDF(categoria = null) {
    console.log("exportToPDF chiamata, categoria:", categoria);
    console.log("prenotate:", prenotate?.length, "svolte:", svolte?.length, "cancellate:", cancellate?.length);
    
    const doc = new jsPDF();
    let dataToExport = [];
    let title = "Pacchetti e Lezioni";
    
    if (categoria === "prenotate") {
      dataToExport = prenotate;
      title = "Lezioni Prenotate";
    } else if (categoria === "svolte") {
      dataToExport = svolte;
      title = "Lezioni Svolte";
    } else if (categoria === "cancellate") {
      dataToExport = cancellate;
      title = "Lezioni Cancellate";
    } else {
      dataToExport = [...prenotate, ...svolte, ...cancellate];
    }
    
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    
    let y = 25;
    if (isAdmin) {
      doc.setFontSize(10);
      if (filtroCliente) {
        const cli = clienti.find(c => c.id === parseInt(filtroCliente));
        if (cli) doc.text(`Cliente: ${cli.nomeReferente || cli.email}`, 14, y);
        y += 6;
      }
      if (filtroPacchetto) {
        const pac = pacchetti.find(p => p.id === parseInt(filtroPacchetto));
        if (pac) doc.text(`Pacchetto: ${pac.titolo || pac.id}`, 14, y);
        y += 6;
      }
      if (filtroAdminDa || filtroAdminA) {
        doc.text(`Periodo: ${filtroAdminDa || "inizio"} - ${filtroAdminA || "fine"}`, 14, y);
        y += 6;
      }
    } else {
      doc.setFontSize(10);
      if (filtroTipologia) doc.text(`Tipologia: ${filtroTipologia}`, 14, y);
      if (filtroMese) doc.text(`Mese: ${filtroMese}`, 14, y + 6);
      if (filtroDataDa || filtroDataA) {
        doc.text(`Periodo: ${filtroDataDa || "inizio"} - ${filtroDataA || "fine"}`, 14, y + 12);
      }
    }
    
    const tableData = dataToExport.map(a => {
      const row = [formatDate(a)];
      if (isAdmin) row.push(a.descrizione || `Lezione #${a.id}`);
      row.push(a.oreConsumate ?? a.durataOre ?? "—");
      row.push(displayStato(a));
      if (isModificata(a)) {
        row.push(`Riprogrammata: ${formatDateFromValue(a.orarioOriginale)} → ${formatDateFromValue(a.orario)}`);
      } else {
        row.push("");
      }
      return row;
    });
    
    const headers = [["Data/Ora", ...(isAdmin ? ["Descrizione"] : []), "Ore", "Stato", "Modifiche"]];
    
    doc.autoTable({
      head: headers,
      body: tableData,
      startY: y + 10,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [32, 72, 154] }
    });
    
    const fileName = categoria ? `${categoria}_${new Date().toISOString().split('T')[0]}.pdf` : `lezioni_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }

  function exportToTXT(categoria = null) {
    console.log("exportToTXT chiamata, categoria:", categoria);
    
    let dataToExport = [];
    let title = "Pacchetti e Lezioni";
    
    if (categoria === "prenotate") {
      dataToExport = prenotate;
      title = "Lezioni Prenotate";
    } else if (categoria === "svolte") {
      dataToExport = svolte;
      title = "Lezioni Svolte";
    } else if (categoria === "cancellate") {
      dataToExport = cancellate;
      title = "Lezioni Cancellate";
    } else {
      dataToExport = [...prenotate, ...svolte, ...cancellate];
    }
    
    let text = `${title}\n${'='.repeat(title.length)}\n\n`;
    
    // Aggiungi informazioni filtri
    if (isAdmin) {
      if (filtroCliente) {
        const cli = clienti.find(c => c.id === parseInt(filtroCliente));
        if (cli) text += `Cliente: ${cli.nomeReferente || cli.email}\n`;
      }
      if (filtroPacchetto) {
        const pac = pacchetti.find(p => p.id === parseInt(filtroPacchetto));
        if (pac) text += `Pacchetto: ${pac.titolo || pac.id}\n`;
      }
      if (filtroAdminDa || filtroAdminA) {
        text += `Periodo: ${filtroAdminDa || "inizio"} - ${filtroAdminA || "fine"}\n`;
      }
    } else {
      if (filtroTipologia) text += `Tipologia: ${filtroTipologia}\n`;
      if (filtroMese) text += `Mese: ${filtroMese}\n`;
      if (filtroDataDa || filtroDataA) {
        text += `Periodo: ${filtroDataDa || "inizio"} - ${filtroDataA || "fine"}\n`;
      }
    }
    
    text += `\nTotale lezioni: ${dataToExport.length}\n\n`;
    
    // Aggiungi righe dati
    dataToExport.forEach((a, idx) => {
      text += `${idx + 1}. ${formatDate(a)}\n`;
      if (isAdmin) text += `   Descrizione: ${a.descrizione || `Lezione #${a.id}`}\n`;
      text += `   Ore: ${a.oreConsumate ?? a.durataOre ?? "—"}\n`;
      text += `   Stato: ${displayStato(a)}\n`;
      if (isModificata(a)) {
        text += `   Riprogrammata: ${formatDateFromValue(a.orarioOriginale)} → ${formatDateFromValue(a.orario)}\n`;
      }
      text += '\n';
    });
    
    // Download
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = categoria ? `${categoria}_${new Date().toISOString().split('T')[0]}.txt` : `lezioni_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportToPNG(categoria = null) {
    console.log("exportToPNG chiamata, categoria:", categoria);
    console.log("contentRef.current:", contentRef?.current);
    
    if (!contentRef.current) return;
    
    try {
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = categoria ? `${categoria}_${new Date().toISOString().split('T')[0]}.png` : `lezioni_${new Date().toISOString().split('T')[0]}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    } catch (err) {
      console.error('Errore export PNG:', err);
      alert('Errore durante l\'export PNG');
    }
  }

  function openDettaglio(a) { setAttivitaSelezionata(a); }
  function openRichiesta(a) {
    setAttivitaPerRichiesta(a);
    setShowRichiesta(true);
  }
  async function handleRichiestaSuccess() {
    await Promise.all([refetchRichieste(), fetchAttivita()]);
  }

  function getBadgeForStato(r) {
    return (
      <Badge
        color={
          r.stato === "rejected" ? "#F8D7DA"
            : r.stato === "approved" ? "#C7F7D7"
            : r.stato === "in_review" ? "#D4F0FC"
            : r.stato === "archived" ? "#E5E7EB"
            : "#FFF3B0"
        }
        text={
          r.stato === "rejected" ? "#721C24"
            : r.stato === "approved" ? "#12753A"
            : r.stato === "in_review" ? "#20489A"
            : r.stato === "archived" ? "#374151"
            : "#8C7800"
        }
      >
        {r.stato}
      </Badge>
    );
  }

  const colsPrenotate = isCliente
    ? ["Data / Orario", "Ore", "Richiesta Aperta", "Stato", "Azioni"]
    : ["Data / Orario", "Descrizione", "Ore", "Richiesta Aperta", "Stato"];
  const colsSvolte = isCliente
    ? ["Data / Orario", "Ore", "Stato"]
    : ["Data / Orario", "Descrizione", "Ore", "Stato"];
  const colsCancellate = colsSvolte;
  const colsRichiesteCliente = ["Data / Orario Lezione", "Orario originario", "Tipo", "Stato", "Creata"];
  const colsRichiesteAdminRecenti = ["Data / Orario Lezione", "Orario originario", "Descrizione", "Tipo", "Stato", "Creata", "Azioni"];

  function buildClienteRichiesteRows() {
    return richiesteSafe
      .filter(r => r && r.stato !== "archived")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(r => {
        const att = attivita.find(a => a.id === r.attivitaId);
        const dateStr = getRichiestaDisplayDate(r, att);
        let orarioOriginarioCell = "—";
        if (
          r.stato === "approved" &&
          r.tipo !== "cancellazione" &&
          att?.orarioOriginale &&
          att?.orarioOriginale !== att?.orario
        ) {
          orarioOriginarioCell = formatDateFromValue(att.orarioOriginale);
        }
        const rowCells = [
          dateStr,
          orarioOriginarioCell,
          r.tipo,
          getBadgeForStato(r),
          new Date(r.createdAt).toLocaleString("it-IT", {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
          })
        ];
        return { key: r.id, cells: rowCells };
      });
  }

  function buildAdminRecentiRows() {
    return richiesteSafe
      .filter(r => {
        if (!r?.createdAt) return false;
        const d = new Date(r.createdAt);
        return d >= THIRTY_DAYS_AGO;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(r => {
        const att = attivita.find(a => a.id === r.attivitaId);
        const dateStr = getRichiestaDisplayDate(r, att);
        let orarioOriginarioCell = "—";
        if (
          ["approved", "archived"].includes(r.stato) &&
          r.tipo !== "cancellazione" &&
          att?.orarioOriginale &&
          att?.orarioOriginale !== att?.orario
        ) {
          orarioOriginarioCell = formatDateFromValue(att.orarioOriginale);
        }
        const descr = att
          ? (att.descrizione || `Lezione #${att.id}`)
          : `Lezione #${r.attivitaId}`;

        const canGestisci = ["pending", "in_review"].includes(r.stato);

        const rowCells = [
          dateStr,
          orarioOriginarioCell,
          descr,
          r.tipo,
          getBadgeForStato(r),
          new Date(r.createdAt).toLocaleString("it-IT", {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
          }),
          canGestisci
            ? <button
                onClick={() => { setSelectedRichiesta(r); setShowModalApprova(true); }}
                style={btnMiniPrimary}
              >
                Gestisci
              </button>
            : <span style={{ fontSize: 11, opacity: 0.6 }}>—</span>
        ];
        return { key: r.id, cells: rowCells };
      });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f8ff" }}>
      <Navbar />
      <main
        ref={contentRef}
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

        {/* Filtri */}
        {!loading && !errore && (
          <div style={{
            background: "#e3eefe",
            border: "1px solid #4268b3",
            borderRadius: 16,
            padding: "20px 24px",
            marginBottom: 24
          }}>
            {isAdmin ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
                <div style={{ flex: "1 1 200px" }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                    Cliente
                  </label>
                  <select
                    value={filtroCliente}
                    onChange={(e) => setFiltroCliente(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">Tutti i clienti</option>
                    {clienti.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nomeReferente || c.email || `Cliente #${c.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: "1 1 200px" }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                    Pacchetto
                  </label>
                  <select
                    value={filtroPacchetto}
                    onChange={(e) => setFiltroPacchetto(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">Tutti i pacchetti</option>
                    {pacchetti.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.titolo || `Pacchetto #${p.id}`} ({p.oreAcquistate}h)
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: "1 1 130px" }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                    Da
                  </label>
                  <input
                    type="date"
                    value={filtroAdminDa}
                    onChange={(e) => setFiltroAdminDa(e.target.value)}
                    style={selectStyle}
                  />
                </div>
                <div style={{ flex: "1 1 130px" }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                    A
                  </label>
                  <input
                    type="date"
                    value={filtroAdminA}
                    onChange={(e) => setFiltroAdminA(e.target.value)}
                    style={selectStyle}
                  />
                </div>
                <div style={{ flex: "1 1 150px" }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                    Ordine
                  </label>
                  <select
                    value={ordinamento}
                    onChange={(e) => setOrdinamento(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="cronologico">Cronologico</option>
                    <option value="alfabetico">Alfabetico (Cliente)</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    setFiltroCliente("");
                    setFiltroPacchetto("");
                    setFiltroAdminDa(""); setFiltroAdminA("");
                    setOrdinamento("cronologico");
                  }}
                  style={{...btnStyle, flex: "0 0 auto"}}
                >
                  Reset Filtri
                </button>
                <button
                  onClick={() => exportToPDF()}
                  style={{...btnStyle, background: "#28a745", flex: "0 0 auto"}}
                  title="Esporta in PDF"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => exportToTXT()}
                  style={{...btnStyle, background: "#17a2b8", flex: "0 0 auto"}}
                  title="Esporta in TXT"
                >
                  📝 TXT
                </button>
                <button
                  onClick={() => exportToPNG()}
                  style={{...btnStyle, background: "#6c757d", flex: "0 0 auto"}}
                  title="Esporta in PNG"
                >
                  🖼️ PNG
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
                  <div style={{ flex: "1 1 150px" }}>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                      Tipologia
                    </label>
                    <select
                      value={filtroTipologia}
                      onChange={(e) => setFiltroTipologia(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="">Tutte</option>
                      <option value="programmata">Programmate</option>
                      <option value="svolta">Svolte</option>
                      <option value="cancellata">Cancellate</option>
                    </select>
                  </div>
                  <div style={{ flex: "1 1 130px" }}>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                      Da
                    </label>
                    <input
                      type="date"
                      value={filtroDataDa}
                      onChange={(e) => setFiltroDataDa(e.target.value)}
                      style={selectStyle}
                    />
                  </div>
                  <div style={{ flex: "1 1 130px" }}>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                      A
                    </label>
                    <input
                      type="date"
                      value={filtroDataA}
                      onChange={(e) => setFiltroDataA(e.target.value)}
                      style={selectStyle}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 16 }}>
                  <button
                    onClick={() => {
                      setFiltroTipologia("");
                      setFiltroDataDa("");
                      setFiltroDataA("");
                    }}
                    style={{...btnStyle, flex: "0 0 auto"}}
                  >
                    Reset Filtri
                  </button>
                  <button
                    onClick={() => exportToPDF()}
                    style={{...btnStyle, background: "#28a745", flex: "0 0 auto"}}
                    title="Esporta in PDF"
                  >
                    📄 PDF
                  </button>
                  <button
                    onClick={() => exportToTXT()}
                    style={{...btnStyle, background: "#17a2b8", flex: "0 0 auto"}}
                    title="Esporta in TXT"
                  >
                    📝 TXT
                  </button>
                  <button
                    onClick={() => exportToPNG()}
                    style={{...btnStyle, background: "#6c757d", flex: "0 0 auto"}}
                    title="Esporta in PNG"
                  >
                    🖼️ PNG
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>Caricamento…</div>
        ) : errore ? (
          <div style={errBox}>Errore: {errore}</div>
        ) : (
          <>
            <PacchettoSummaryPanel attivita={attivita} />

            {isAdmin && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 20px'
              }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={multiSelect}
                    onChange={(e)=> setMultiSelect(e.target.checked)}
                  />
                  <span style={{ fontWeight: 700 }}>Selezione multipla</span>
                </label>
                {multiSelect && (
                  <button
                    disabled={selectedIds.size === 0}
                    onClick={async () => {
                      if (selectedIds.size === 0) return;
                      const count = selectedIds.size;
                      if (!confirm(`Confermi l'eliminazione di ${count} attività selezionate?`)) return;
                      // Elimina una ad una usando l'endpoint esistente (gestisce anche pacchetto/lavagna)
                      const ids = Array.from(selectedIds);
                      let ok = 0, fail = 0;
                      for (const id of ids) {
                        try {
                          const r = await fetch('/api/attivita', {
                            method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
                          });
                          if (r.ok) ok++; else fail++;
                        } catch (_) { fail++; }
                      }
                      await fetchAttivita();
                      setSelectedIds(new Set());
                      if (fail) alert(`Eliminazione completata: ${ok} ok, ${fail} fallite.`);
                    }}
                    style={{
                      background: selectedIds.size ? '#ff6464' : '#ffb3b3', color: '#fff', border: 0,
                      borderRadius: 10, padding: '6px 12px', fontWeight: 800, cursor: selectedIds.size ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Elimina selezionate ({selectedIds.size})
                  </button>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <SectionTitle>Lezioni Prenotate</SectionTitle>
              <button
                onClick={() => exportToPDF("prenotate")}
                style={{...btnStyle, background: "#28a745", padding: "6px 12px", fontSize: 12}}
                title="Esporta solo lezioni prenotate"
              >
                📄 Esporta
              </button>
            </div>
            <TableWrapper>
              <MainTable
                emptyLabel="Nessuna lezione prenotata"
                columns={(() => {
                  if (!(isAdmin && multiSelect)) return colsPrenotate;
                  const ids = prenotate.map(a => a.id);
                  const all = ids.length > 0 && ids.every(id => selectedIds.has(id));
                  return [
                    { key: 'sel-pren', content: (
                      <input
                        type="checkbox"
                        checked={all}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) ids.forEach(id => next.add(id)); else ids.forEach(id => next.delete(id));
                          setSelectedIds(next);
                        }}
                        title={all ? 'Deseleziona tutte' : 'Seleziona tutte'}
                      />
                    )},
                    ...colsPrenotate
                  ];
                })()}
                rows={prenotate.map(a => {
                  const reqList = byAttivita[a.id] || [];
                  const openReq = reqList.find(r => ["pending", "in_review"].includes(r.stato));
                  const cells = [];
                  if (isAdmin && multiSelect) {
                    cells.push({ content: (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(a.id)}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(a.id); else next.delete(a.id);
                          setSelectedIds(next);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title={selectedIds.has(a.id) ? 'Deseleziona' : 'Seleziona'}
                      />
                    )});
                  }
                  cells.push({ content: formatDate(a), clickable: true, onClick: () => openDettaglio(a) });
                  if (isAdmin) cells.push(a.descrizione || `Lezione #${a.id}`);
                  cells.push(a.oreConsumate ?? a.durataOre ?? "—");

                  if (openReq) {
                    const badge = (
                      <Badge color="#FFF3B0" text="#8C7800">
                        {openReq.stato}
                      </Badge>
                    );
                    if (isAdmin) {
                      cells.push(
                        <span
                          style={{ cursor: "pointer" }}
                          title="Gestisci richiesta"
                          onClick={() => {
                            setSelectedRichiesta(openReq);
                            setShowModalApprova(true);
                          }}
                        >
                          {badge}
                        </span>
                      );
                    } else {
                      cells.push(badge);
                    }
                  } else {
                    cells.push("—");
                  }

                  const statoEl = (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span>{displayStato(a)}</span>
                      {renderBadgeRiprogrammata(a)}
                    </div>
                  );
                  cells.push(statoEl);

                  if (!isAdmin) {
                    cells.push(
                      canShowRequestButton(a)
                        ? <button onClick={() => openRichiesta(a)} style={btnMiniPrimary}>Richiedi modifica</button>
                        : <span style={{ fontSize: 12, opacity: 0.55 }}>—</span>
                    );
                  }

                  return { key: a.id, cells };
                })}
              />
            </TableWrapper>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <SectionTitle>Lezioni Svolte</SectionTitle>
              <button
                onClick={() => exportToPDF("svolte")}
                style={{...btnStyle, background: "#28a745", padding: "6px 12px", fontSize: 12}}
                title="Esporta solo lezioni svolte"
              >
                📄 Esporta
              </button>
            </div>
            <TableWrapper>
              <MainTable
                emptyLabel="Nessuna lezione svolta"
                columns={(() => {
                  if (!(isAdmin && multiSelect)) return colsSvolte;
                  const ids = svolte.map(a => a.id);
                  const all = ids.length > 0 && ids.every(id => selectedIds.has(id));
                  return [
                    { key: 'sel-svolte', content: (
                      <input
                        type="checkbox"
                        checked={all}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) ids.forEach(id => next.add(id)); else ids.forEach(id => next.delete(id));
                          setSelectedIds(next);
                        }}
                        title={all ? 'Deseleziona tutte' : 'Seleziona tutte'}
                      />
                    )},
                    ...colsSvolte
                  ];
                })()}
                rows={svolte.map(a => {
                  const cells = [];
                  if (isAdmin && multiSelect) {
                    cells.push({ content: (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(a.id)}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(a.id); else next.delete(a.id);
                          setSelectedIds(next);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title={selectedIds.has(a.id) ? 'Deseleziona' : 'Seleziona'}
                      />
                    )});
                  }
                  cells.push({ content: formatDate(a), clickable: true, onClick: () => openDettaglio(a) });
                  if (isAdmin) cells.push(a.descrizione || `Lezione #${a.id}`);
                  const statoEl = (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span>{displayStato(a)}</span>
                      {renderBadgeRiprogrammata(a)}
                    </div>
                  );
                  cells.push(a.oreConsumate ?? a.durataOre ?? "—");
                  cells.push(statoEl);
                  return { key: a.id, cells };
                })}
              />
            </TableWrapper>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <SectionTitle>Lezioni Cancellate</SectionTitle>
              <button
                onClick={() => exportToPDF("cancellate")}
                style={{...btnStyle, background: "#28a745", padding: "6px 12px", fontSize: 12}}
                title="Esporta solo lezioni cancellate"
              >
                📄 Esporta
              </button>
            </div>
            <TableWrapper>
              <MainTable
                emptyLabel="Nessuna lezione cancellata"
                columns={(() => {
                  if (!(isAdmin && multiSelect)) return colsCancellate;
                  const ids = cancellate.map(a => a.id);
                  const all = ids.length > 0 && ids.every(id => selectedIds.has(id));
                  return [
                    { key: 'sel-canc', content: (
                      <input
                        type="checkbox"
                        checked={all}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) ids.forEach(id => next.add(id)); else ids.forEach(id => next.delete(id));
                          setSelectedIds(next);
                        }}
                        title={all ? 'Deseleziona tutte' : 'Seleziona tutte'}
                      />
                    )},
                    ...colsCancellate
                  ];
                })()}
                rows={cancellate.map(a => {
                  const cells = [];
                  if (isAdmin && multiSelect) {
                    cells.push({ content: (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(a.id)}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(a.id); else next.delete(a.id);
                          setSelectedIds(next);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title={selectedIds.has(a.id) ? 'Deseleziona' : 'Seleziona'}
                      />
                    )});
                  }
                  cells.push({ content: formatDate(a), clickable: true, onClick: () => openDettaglio(a) });
                  if (isAdmin) cells.push(a.descrizione || `Lezione #${a.id}`);
                  const statoEl = (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{displayStato(a)}</span>
                      {renderBadgeRiprogrammata(a)}
                    </div>
                  );
                  cells.push(a.oreConsumate ?? a.durataOre ?? "—");
                  cells.push(statoEl);
                  return { key: a.id, cells };
                })}
              />
            </TableWrapper>

<div style={{ marginTop: 24, fontSize: 11.5, color: "#5a6d90" }}>
              <strong>Legenda:</strong> <span style={badgeRiprogrammata}>Riprogrammata</span> = lezione spostata rispetto all’orario originario.
            </div>
          </>
        )}
      </main>

      {attivitaSelezionata && (
        <AttivitaDettaglioModal
          attivita={attivitaSelezionata}
          isCliente={isCliente}
          onClose={() => setAttivitaSelezionata(null)}
          onEdit={(a) => { setEditingAttivita(a); setAttivitaSelezionata(null); }}
          onDelete={async (a) => {
            if (!confirm('Confermi eliminazione lezione?')) return;
            try {
              const r = await fetch('/api/attivita', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: a.id })
              });
              let js = null;
              try { js = await r.json(); } catch (e) { js = null; }
              if (!r.ok) {
                // Try to refresh list anyway — sometimes the backend returns non-OK but the deletion happened
                await fetchAttivita();
                setAttivitaSelezionata(null);
                throw new Error(js?.error || `Errore server (${r.status})`);
              }
              // Success
              await fetchAttivita();
              setAttivitaSelezionata(null);
            } catch (err) {
              // Ensure UI is refreshed even on unexpected failures
              try { await fetchAttivita(); } catch (_) {}
              setAttivitaSelezionata(null);
              alert('Impossibile eliminare: ' + (err.message || err));
            }
          }}
        />
      )}

      {editingAttivita && (
        <AttivitaForm
          initialData={editingAttivita}
          onClose={() => setEditingAttivita(null)}
          onSuccess={async () => { setEditingAttivita(null); await fetchAttivita(); }}
        />
      )}

      {isCliente && showRichiesta && attivitaPerRichiesta && (
        <RichiestaModificaModal
          open={showRichiesta}
          attivita={attivitaPerRichiesta}
          existingRichieste={byAttivita[attivitaPerRichiesta.id] || []}
          onSuccess={handleRichiestaSuccess}
          onClose={() => {
            setShowRichiesta(false);
            setAttivitaPerRichiesta(null);
          }}
        />
      )}

      {isAdmin && showModalApprova && selectedRichiesta && (
        <ApprovaRichiestaModal
          richiesta={selectedRichiesta}
          onClose={() => {
            setShowModalApprova(false);
            setSelectedRichiesta(null);
          }}
          onApproved={async () => {
            await Promise.all([refetchRichieste(), fetchAttivita()]);
          }}
          onRejected={async () => {
            await Promise.all([refetchRichieste(), fetchAttivita()]);
          }}
        />
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 16px", color: "#20489a" }}>{children}</h2>;
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
function MainTable({ columns = [], rows = [], emptyLabel }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeCols = Array.isArray(columns) ? columns : [];
  return (
    <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
      <thead>
        <tr>
          {safeCols.map((c, idx) => {
            if (c && typeof c === 'object' && 'content' in c) {
              return <Th key={c.key || `col-${idx}`}>{c.content}</Th>;
            }
            return <Th key={String(c)}>{c}</Th>;
          })}
        </tr>
      </thead>
      <tbody>
        {safeRows.length === 0 && (
          <tr>
            <td colSpan={safeCols.length || 1} style={{ textAlign: "center", padding: 30, color: "#5e6b85" }}>
              {emptyLabel}
            </td>
          </tr>
        )}
        {safeRows.map(r => (
          <tr key={r.key} style={{ background: Number(r.key) % 2 ? "#fff" : "#f7fafd" }}>
            {r.cells.map((cell, idx) => {
              if (cell && typeof cell === "object" && "content" in cell) {
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
const badgeMod = {
  background: "#FFEED5",
  color: "#924400",
  padding: "2px 8px",
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1
};
const badgeRiprogrammata = {
  background: "#FFF4E5",
  color: "#C75400",
  padding: "3px 8px",
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1.2,
  whiteSpace: "nowrap"
};
const selectStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #4268b3",
  background: "#fff",
  color: "#20489a",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "'Inter','Segoe UI',Arial,sans-serif"
};
const btnStyle = {
  background: "#20489a",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'Inter','Segoe UI',Arial,sans-serif"
};
