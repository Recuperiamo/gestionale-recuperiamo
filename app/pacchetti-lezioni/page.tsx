// @ts-nocheck
"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

import { useRichiesteModifica } from "../components/modifiche/useRichiesteModifica";
import AttivitaDettaglioModal from "../components/attivita/AttivitaDettaglioModal";
import SpostaAttivitaModal from "../components/attivita/SpostaAttivitaModal";
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
  const [spostaAttivita, setSpostaAttivita] = useState(null);
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
  const [filtroPacchettiIds, setFiltroPacchettiIds] = useState<string[]>([]);
  const [pacchettoDropdownOpen, setPacchettoDropdownOpen] = useState(false);
  const [filtroStatoPacchetto, setFiltroStatoPacchetto] = useState(""); // attivo | sospeso | archiviato
  const [filtroAdminDa, setFiltroAdminDa] = useState("");
  const [filtroAdminA, setFiltroAdminA] = useState("");
  const [filtroMese, setFiltroMese] = useState("");
  const [filtroOreExtra, setFiltroOreExtra] = useState(""); // "" | "extra" | "normale"
  const [filtroSaldato, setFiltroSaldato] = useState(""); // "" | "saldato" | "non_saldato"
  const [ordinamento, setOrdinamento] = useState("cronologico"); // cronologico | alfabetico
  
  // Filtri Cliente
  const [filtroTipologia, setFiltroTipologia] = useState(""); // svolta | programmata | cancellata
  const [filtroDataDa, setFiltroDataDa] = useState("");
  const [filtroDataA, setFiltroDataA] = useState("");

  // Chiudi dropdown pacchetto al click fuori
  useEffect(() => {
    if (!pacchettoDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      const el = document.getElementById('pacchetto-multi-dropdown');
      if (el && !el.contains(e.target as Node)) setPacchettoDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pacchettoDropdownOpen]);

  // Dropdown export per sezioni
  const [exportMenuPrenotate, setExportMenuPrenotate] = useState(false);
  const [exportMenuSvolte, setExportMenuSvolte] = useState(false);
  const [exportMenuCancellate, setExportMenuCancellate] = useState(false);

  const contentRef = useRef(null);
  const contentRefPrenotate = useRef(null);
  const contentRefSvolte = useRef(null);
  const contentRefCancellate = useRef(null);

  const isCliente = session?.user?.role === "cliente";
  const isAdmin = !isCliente;

  // Derived labels for the compact Cliente / Pacchetto mini summary
  const selectedClienteLabel = (() => {
    if (filtroCliente) {
      const c = clienti.find(x => String(x.id) === String(filtroCliente));
      return c ? (c.nomeReferente || c.email || `Cliente #${c.id}`) : null;
    }
    // fallback to first activity's cliente
    const first = (attivita && attivita.length) ? attivita[0].cliente : null;
    return first ? (first.nomeReferente || first.email || `Cliente #${first.id}`) : null;
  })();

  const selectedPacchettoTitle = (() => {
    if (filtroPacchettiIds.length === 1) {
      const p = pacchetti.find(x => String(x.id) === filtroPacchettiIds[0]);
      if (p) return p.descrizione && p.descrizione.trim() ? p.descrizione : `Pacchetto #${p.id}`;
    } else if (filtroPacchettiIds.length > 1) {
      return `${filtroPacchettiIds.length} pacchetti selezionati`;
    }
    return null;
  })();

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
        // NON filtrare per stato - mostra TUTTI i pacchetti
        // Ordina alfabeticamente per descrizione
        lista.sort((a, b) => {
          const tA = (a.descrizione || `Pacchetto #${a.id}`).toLowerCase();
          const tB = (b.descrizione || `Pacchetto #${b.id}`).toLowerCase();
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

  // Reset filtro pacchetto quando cambia cliente
  useEffect(() => {
    if (filtroCliente) {
      setFiltroPacchettiIds([]);
    }
  }, [filtroCliente]);

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
    const dataNew = a.orario ? new Date(a.orario).toLocaleDateString('it-IT') : '?';
    return (
      <span className="inline-flex flex-col items-center justify-center gap-0.5 px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded whitespace-nowrap leading-none">
        <span>Riprog.</span>
        <span className="text-2xs">{dataNew}</span>
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
      if (filtroPacchettiIds.length > 0) {
        filtered = filtered.filter(a => filtroPacchettiIds.includes(String(a.pacchettoId)));
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
      if (filtroOreExtra === "extra") {
        filtered = filtered.filter(a => a.extraPacchetto === true);
      } else if (filtroOreExtra === "normale") {
        filtered = filtered.filter(a => !a.extraPacchetto);
      }
      if (filtroSaldato === "saldato") {
        filtered = filtered.filter(a => a.pacchetto?.saldato === true);
      } else if (filtroSaldato === "non_saldato") {
        filtered = filtered.filter(a => a.pacchetto?.saldato !== true);
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
  }, [attivita, filtroCliente, filtroPacchettiIds, filtroAdminDa, filtroAdminA, filtroTipologia, filtroMese, filtroDataDa, filtroDataA, filtroOreExtra, filtroSaldato, ordinamento, isAdmin, isCliente]);

  function slugify(str: string) {
    return (str || "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function buildExportFileName(ext: string) {
    const da = filtroAdminDa || filtroDataDa || "";
    const a  = filtroAdminA  || filtroDataA  || "";

    const cognome = (() => {
      if (!filtroCliente) return "";
      const c = clienti.find(x => String(x.id) === String(filtroCliente));
      const nome = c?.nomeReferente || c?.email || "";
      const parts = nome.trim().split(/\s+/);
      return slugify(parts[parts.length - 1] || nome);
    })();

    if (da || a) {
      const parts = [cognome, da, a].filter(Boolean);
      return `${parts.join("_")}.${ext}`;
    }

    if (filtroPacchettiIds.length > 0) {
      const names = filtroPacchettiIds.map(id => {
        const p = pacchetti.find(x => String(x.id) === id);
        return p ? slugify(p.descrizione || `pacchetto_${p.id}`) : `pacchetto_${id}`;
      });
      return `${names.join("-")}.${ext}`;
    }

    return `lezioni_${new Date().toISOString().split("T")[0]}.${ext}`;
  }

  // Helpers per il calcolo ore
  function oreFromAttivita(a) {
    const v = a?.oreConsumate ?? a?.durataOre ?? 0;
    const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  function sommaOre(list) {
    if (!Array.isArray(list)) return 0;
    const tot = list.reduce((acc, a) => acc + oreFromAttivita(a), 0);
    // Evita -0
    return Math.abs(tot) === 0 ? 0 : tot;
  }

  function exportToPDF(categoria = null) {
    try {
      const doc = new jsPDF();
      let y = 20;
      
      // Titolo principale
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text("Pacchetti & Lezioni", 14, y);
      y += 12;
      
      // Informazioni filtri
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(80, 80, 80);
      
      if (isAdmin) {
        if (filtroCliente) {
          const cli = clienti.find(c => c.id === parseInt(filtroCliente));
          if (cli) {
            doc.setFont(undefined, 'bold');
            const clienteLabel = `Cliente: `;
            doc.text(clienteLabel, 14, y);
            const labelWidth = doc.getTextWidth(clienteLabel);
            doc.setFont(undefined, 'normal');
            doc.text(cli.nomeReferente || cli.email, 14 + labelWidth, y);
            y += 6;
          }
        }
        else if (selectedClienteLabel) {
          // Se non c'è un filtro esplicito, mostra il cliente selezionato nella UI
          doc.setFont(undefined, 'bold');
          const clienteLabel = `Cliente: `;
          doc.text(clienteLabel, 14, y);
          const labelWidth = doc.getTextWidth(clienteLabel);
          doc.setFont(undefined, 'normal');
          doc.text(selectedClienteLabel, 14 + labelWidth, y);
          y += 6;
        }
        if (filtroPacchettiIds.length > 0) {
          const names = filtroPacchettiIds.map(id => {
            const pac = pacchetti.find(p => String(p.id) === id);
            return pac ? (pac.descrizione && pac.descrizione.trim() ? pac.descrizione : `Pacchetto #${pac.id}`) : `#${id}`;
          }).join(", ");
          doc.setFont(undefined, 'bold');
          const label = filtroPacchettiIds.length === 1 ? `Pacchetto: ` : `Pacchetti: `;
          doc.text(label, 14, y);
          const labelWidth = doc.getTextWidth(label);
          doc.setFont(undefined, 'normal');
          doc.text(names, 14 + labelWidth, y);
          y += 6;
        } else if (selectedPacchettoTitle) {
          doc.setFont(undefined, 'bold');
          const pacchettoLabel = `Pacchetto: `;
          doc.text(pacchettoLabel, 14, y);
          const labelWidth = doc.getTextWidth(pacchettoLabel);
          doc.setFont(undefined, 'normal');
          doc.text(selectedPacchettoTitle, 14 + labelWidth, y);
          y += 6;
        }
        if (filtroAdminDa || filtroAdminA) {
          doc.setFont(undefined, 'bold');
          doc.text(`Periodo: `, 14, y);
          doc.setFont(undefined, 'normal');
          doc.text(`${filtroAdminDa || "inizio"} - ${filtroAdminA || "fine"}`, 30, y);
          y += 6;
        }
      } else {
        if (filtroTipologia) {
  doc.setFont(undefined, 'bold');
  doc.text(`Tipologia: `, 14, y);
  doc.setFont(undefined, 'normal');
  doc.text(filtroTipologia, 35, y);
  y += 6;
        }
        if (filtroDataDa || filtroDataA) {
  doc.setFont(undefined, 'bold');
  doc.text(`Periodo: `, 14, y);
  doc.setFont(undefined, 'normal');
  doc.text(`${filtroDataDa || "inizio"} - ${filtroDataA || "fine"}`, 30, y);
  y += 6;
        }
      }
      
  doc.setTextColor(0, 0, 0);
  y += 5;
      
      // Funzione helper per verificare se c'è almeno una lezione riprogrammata
      const hasRiprogrammate = (attivitaList) => {
        return attivitaList.some(a => isModificata(a));
      };
      
      // Funzione helper per creare le righe della tabella
      const createTableRows = (attivitaList, includeRiprogrammata) => {
        return attivitaList.map(a => {
          const row = [];
          // Data/Ora
          row.push(formatDate(a));
          // Ore
          row.push(String(a.oreConsumate ?? a.durataOre ?? "—"));
          // Stato
          row.push(displayStato(a));
          // Note riprogrammazione (solo se la colonna è inclusa)
          if (includeRiprogrammata) {
            if (isModificata(a)) {
              const oldDate = formatDateFromValue(a.orarioOriginale);
              const newDate = formatDateFromValue(a.orario);
              row.push(`Da: ${oldDate}\nA: ${newDate}`);
            } else {
              row.push("—");
            }
          }
          return row;
        });
      };
      
      // Funzione per creare tabella con headers dinamici
      const createTable = (attivitaList, startY, color, sectionTitle) => {
        const hasRipr = hasRiprogrammate(attivitaList);
        const headers = hasRipr
          ? ["Data/Ora", "Ore", "Stato", "Riprogrammata"]
          : ["Data/Ora", "Ore", "Stato"];
        
        if (sectionTitle) {
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(color[0], color[1], color[2]);
          doc.text(sectionTitle, 14, startY);
          doc.setTextColor(0, 0, 0);
          startY += 6;
        }
        
        autoTable(doc, {
          head: [headers],
          body: createTableRows(attivitaList, hasRipr),
          startY: startY,
          styles: { 
            fontSize: 9, 
            cellPadding: 4,
            lineColor: [220, 220, 220],
            lineWidth: 0.1
          },
          headStyles: { 
            fillColor: color, 
            fontStyle: 'bold', 
            fontSize: 10,
            textColor: [255, 255, 255]
          },
          columnStyles: hasRipr ? {
            0: { cellWidth: 55 }, // Data/Ora
            1: { cellWidth: 22, halign: 'center' }, // Ore
            2: { cellWidth: 28, halign: 'center' }, // Stato
            3: { cellWidth: 'auto' } // Riprogrammata
          } : {
            0: { cellWidth: 65 }, // Data/Ora
            1: { cellWidth: 28, halign: 'center' }, // Ore
            2: { cellWidth: 38, halign: 'center' } // Stato
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 14, right: 14 }
        });
        
        // Stampa il totale ore della sezione, allineato a destra
        let endY = doc.lastAutoTable.finalY;
        const pageW = doc.internal.pageSize.width || doc.internal.pageSize.getWidth?.() || 210;
        const pageH = doc.internal.pageSize.height || doc.internal.pageSize.getHeight?.() || 297;
        const marginX = 14;
        const nextY = endY + 8;
        const needsNewPage = nextY > (pageH - 20);
        if (needsNewPage) {
          doc.addPage();
          endY = 20;
        } else {
          endY = nextY;
        }
        const totOre = sommaOre(attivitaList);
        const label = `Totale ore sezione: ${totOre}`;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        const textW = doc.getTextWidth(label);
        const x = (pageW - marginX) - textW;
        doc.text(label, x, endY);
        
        return endY;
      };
      
      // Se categoria specifica, esporta solo quella
      if (categoria === "selezionate") {
        const sel = attivita.filter(a => selectedIds.has(a.id));
        sel.sort((a, b) => parseStart(a) - parseStart(b));
        createTable(sel, y, [80, 40, 160], `LEZIONI SELEZIONATE (${sel.length})`);
      } else if (categoria === "prenotate") {
        createTable(prenotate, y, [32, 72, 154], "LEZIONI PRENOTATE");
      } else if (categoria === "svolte") {
        createTable(svolte, y, [18, 117, 58], "LEZIONI SVOLTE");
      } else if (categoria === "cancellate") {
        createTable(cancellate, y, [153, 27, 27], "LEZIONI CANCELLATE");
      } else {
        // Export tutte le sezioni separate
        
        // Sezione Prenotate
        if (prenotate.length > 0) {
          y = createTable(prenotate, y, [32, 72, 154], "LEZIONI PRENOTATE");
          y += 15;
        }
        
        // Sezione Svolte
        if (svolte.length > 0) {
          // Nuova pagina se necessario
          if (y > 240) {
            doc.addPage();
            y = 20;
          }
          
          y = createTable(svolte, y, [18, 117, 58], "LEZIONI SVOLTE");
          y += 15;
        }
        
        // Sezione Cancellate
        if (cancellate.length > 0) {
          // Nuova pagina se necessario
          if (y > 240) {
            doc.addPage();
            y = 20;
          }
          
          createTable(cancellate, y, [153, 27, 27], "LEZIONI CANCELLATE");
        }
      }
      
      // Footer con data generazione
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Generato il ${new Date().toLocaleDateString('it-IT')} - Pagina ${i} di ${totalPages}`,
          14,
          doc.internal.pageSize.height - 10
        );
      }
    
    doc.save(buildExportFileName("pdf"));
    } catch (err) {
      console.error("Errore export PDF:", err);
      alert("Errore durante l'export PDF: " + err.message);
    }
  }

  function exportToTXT(categoria = null) {

    try {
      const titoloBase = "Pacchetti e Lezioni";
      let text = `${titoloBase}\n${'='.repeat(titoloBase.length)}\n\n`;
    
    // Aggiungi informazioni filtri
      if (filtroCliente) {
        const cli = clienti.find(c => c.id === parseInt(filtroCliente));
        if (cli) text += `Cliente: ${cli.nomeReferente || cli.email}\n`;
      } else if (selectedClienteLabel) {
        text += `Cliente: ${selectedClienteLabel}\n`;
      }
      if (filtroPacchettiIds.length > 0) {
        const names = filtroPacchettiIds.map(id => {
          const pac = pacchetti.find(p => String(p.id) === id);
          return pac ? (pac.descrizione && pac.descrizione.trim() ? pac.descrizione : `Pacchetto #${pac.id}`) : `#${id}`;
        }).join(", ");
        text += `${filtroPacchettiIds.length === 1 ? 'Pacchetto' : 'Pacchetti'}: ${names}\n`;
      } else if (selectedPacchettoTitle) {
        text += `Pacchetto: ${selectedPacchettoTitle}\n`;
      }
      if (filtroAdminDa || filtroAdminA) {
        text += `Periodo: ${filtroAdminDa || "inizio"} - ${filtroAdminA || "fine"}\n`;
      }
      if (filtroTipologia) text += `Tipologia: ${filtroTipologia}\n`;
      if (filtroMese) text += `Mese: ${filtroMese}\n`;
      if (filtroDataDa || filtroDataA) {
        text += `Periodo: ${filtroDataDa || "inizio"} - ${filtroDataA || "fine"}\n`;
      }
    
    const renderSezioneTxt = (label, lista) => {
      text += `\n${label}\n${'-'.repeat(label.length)}\n`;
      if (!lista.length) {
        text += `(Nessuna voce)\n\n`;
        return;
      }
      lista.forEach((a, idx) => {
        text += `${idx + 1}. ${formatDate(a)}\n`;
        text += `   Descrizione: ${a.descrizione || `Lezione #${a.id}`}\n`;
        text += `   Ore: ${a.oreConsumate ?? a.durataOre ?? "—"}\n`;
        text += `   Stato: ${displayStato(a)}\n`;
        if (isModificata(a)) {
          text += `   Riprogrammata: ${formatDateFromValue(a.orarioOriginale)} → ${formatDateFromValue(a.orario)}\n`;
        }
        text += '\n';
      });
      const totOre = sommaOre(lista);
      text += `Totale ore sezione: ${totOre}\n`;
    };

    if (categoria === 'selezionate') {
      const sel = attivita.filter(a => selectedIds.has(a.id));
      sel.sort((a, b) => parseStart(a) - parseStart(b));
      renderSezioneTxt(`LEZIONI SELEZIONATE (${sel.length})`, sel);
    } else if (categoria === 'prenotate') {
      renderSezioneTxt('LEZIONI PRENOTATE', prenotate);
    } else if (categoria === 'svolte') {
      renderSezioneTxt('LEZIONI SVOLTE', svolte);
    } else if (categoria === 'cancellate') {
      renderSezioneTxt('LEZIONI CANCELLATE', cancellate);
    } else {
      renderSezioneTxt('LEZIONI PRENOTATE', prenotate);
      renderSezioneTxt('LEZIONI SVOLTE', svolte);
      renderSezioneTxt('LEZIONI CANCELLATE', cancellate);
    }
    
    // Download
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildExportFileName("txt");
    a.click();
    URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Errore export TXT:", err);
      alert("Errore durante l'export TXT: " + err.message);
    }
  }

  async function exportToPNG(categoria = null) {
    // Decide quale ref usare (se è stata passata una categoria usa il ref dedicato,
    // altrimenti usa il ref principale che avvolge l'intero main)
    const refToUse = categoria === "prenotate" ? contentRefPrenotate
      : categoria === "svolte" ? contentRefSvolte
      : categoria === "cancellate" ? contentRefCancellate
      : contentRef;

    if (!refToUse?.current) {
      alert("Errore: elemento da catturare non trovato");
      return;
    }

    try {
      // Inserisci dinamicamente i contatori ore per sezione (solo per l'export)
      const injected = [];
      const makeBadge = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        div.style.cssText = [
          'width:100%',
          'text-align:right',
          'margin:8px 0 12px 0',
          'font-weight:700',
          'font-size:12px',
          'color:#0f172a'
        ].join(';');
        return div;
      };

      const injectIf = (ref, list) => {
        if (ref?.current && Array.isArray(list)) {
          const tot = sommaOre(list);
          const el = makeBadge(`Totale ore sezione: ${tot}`);
          ref.current.appendChild(el);
          injected.push(el);
        }
      };

      if (categoria === 'prenotate') injectIf(contentRefPrenotate, prenotate);
      else if (categoria === 'svolte') injectIf(contentRefSvolte, svolte);
      else if (categoria === 'cancellate') injectIf(contentRefCancellate, cancellate);
      else {
        injectIf(contentRefPrenotate, prenotate);
        injectIf(contentRefSvolte, svolte);
        injectIf(contentRefCancellate, cancellate);
      }

      const canvas = await html2canvas(refToUse.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = buildExportFileName("png");
        a.click();
        URL.revokeObjectURL(url);
        // Pulisci i nodi iniettati
        injected.forEach(n => { try { n.remove(); } catch (_) {} });
      });
    } catch (err) {
      console.error('Errore export PNG:', err);
      alert('Errore durante l\'export PNG: ' + err.message);
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
    ? ["Data / Orario", "Ore", "Stato", "Azioni"]
    : ["Data / Orario", "Descrizione", "Ore", "Stato"];
  const colsSvolte = isCliente
    ? ["Data / Orario", "Ore", "Stato", "Azioni"]
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
  <h1 style={{ fontSize: 32, fontWeight: 800, textAlign: "center", margin: "0 0 33px" }}>
          Pacchetti & Lezioni
        </h1>

        {/* Compact Cliente / Pacchetto summary shown above the sections (not inside table columns) */}
        {(selectedClienteLabel || selectedPacchettoTitle) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '12px 0 20px 0', alignItems: 'flex-start', fontSize: 18 }}>
            {selectedClienteLabel && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700 }}>Cliente:</span>
                <span>{selectedClienteLabel}</span>
              </div>
            )}
            {selectedPacchettoTitle && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700 }}>Pacchetto:</span>
                <span>{selectedPacchettoTitle}</span>
              </div>
            )}
          </div>
        )}

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
                <div id="pacchetto-multi-dropdown" style={{ flex: "1 1 200px", position: "relative" }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                    Pacchetto
                  </label>
                  <button
                    type="button"
                    onClick={() => setPacchettoDropdownOpen(v => !v)}
                    style={{
                      ...selectStyle,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      cursor: "pointer", userSelect: "none", textAlign: "left",
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {filtroPacchettiIds.length === 0
                        ? "Tutti i pacchetti"
                        : filtroPacchettiIds.length === 1
                          ? (() => { const p = pacchetti.find(x => String(x.id) === filtroPacchettiIds[0]); return p ? (p.descrizione || `Pacchetto #${p.id}`) : "1 selezionato"; })()
                          : `${filtroPacchettiIds.length} pacchetti selezionati`}
                    </span>
                    <span style={{ fontSize: 10, marginLeft: 6, flexShrink: 0 }}>▼</span>
                  </button>
                  {pacchettoDropdownOpen && (
                    <div
                      style={{
                        position: "absolute", top: "100%", left: 0, right: 0, zIndex: 500,
                        background: "#fff", border: "1px solid #4268b3", borderRadius: 10,
                        boxShadow: "0 6px 20px rgba(32,72,154,0.18)", marginTop: 4,
                        maxHeight: 280, overflowY: "auto",
                      }}
                    >
                      <div
                        style={{ padding: "8px 12px", cursor: "pointer", fontWeight: 600, fontSize: 13, borderBottom: "1px solid #e2e8f0", color: filtroPacchettiIds.length === 0 ? "#20489a" : "#64748b" }}
                        onClick={() => { setFiltroPacchettiIds([]); setPacchettoDropdownOpen(false); }}
                      >
                        ✕ Tutti i pacchetti
                      </div>
                      {pacchetti
                        .filter(p => {
                          if (filtroCliente && String(p.clienteId) !== String(filtroCliente)) return false;
                          if (filtroStatoPacchetto && p.stato !== filtroStatoPacchetto) return false;
                          return true;
                        })
                        .map(p => {
                          const isChecked = filtroPacchettiIds.includes(String(p.id));
                          return (
                            <div
                              key={p.id}
                              style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "8px 12px", cursor: "pointer", fontSize: 13,
                                background: isChecked ? "#e8f0fe" : "transparent",
                                color: "#20489a",
                              }}
                              onClick={() => {
                                setFiltroPacchettiIds(prev =>
                                  isChecked ? prev.filter(id => id !== String(p.id)) : [...prev, String(p.id)]
                                );
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                readOnly
                                style={{ accentColor: "#20489a", width: 15, height: 15, flexShrink: 0 }}
                              />
                              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {p.descrizione || `Pacchetto #${p.id}`}
                              </span>
                              <span style={{ fontSize: 11, color: "#64748b", flexShrink: 0 }}>
                                {p.oreAcquistate}h · {p.stato}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
                <div style={{ flex: "1 1 150px" }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                    Stato Pacchetto
                  </label>
                  <select
                    value={filtroStatoPacchetto}
                    onChange={(e) => setFiltroStatoPacchetto(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">Tutti gli stati</option>
                    <option value="attivo">Attivo</option>
                    <option value="sospeso">Sospeso</option>
                    <option value="archiviato">Archiviato</option>
                  </select>
                </div>
                <div style={{ flex: "1 1 140px" }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                    Ore extra
                  </label>
                  <select
                    value={filtroOreExtra}
                    onChange={(e) => setFiltroOreExtra(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">Tutte le lezioni</option>
                    <option value="extra">Solo ore extra</option>
                    <option value="normale">Solo ore normali</option>
                  </select>
                </div>
                <div style={{ flex: "1 1 140px" }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                    Saldo pacchetto
                  </label>
                  <select
                    value={filtroSaldato}
                    onChange={(e) => setFiltroSaldato(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">Tutti</option>
                    <option value="saldato">Saldato</option>
                    <option value="non_saldato">Non saldato</option>
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
                    setFiltroPacchettiIds([]);
                    setPacchettoDropdownOpen(false);
                    setFiltroStatoPacchetto("");
                    setFiltroOreExtra("");
                    setFiltroSaldato("");
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

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <SectionTitle>Lezioni Prenotate</SectionTitle>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setExportMenuPrenotate(!exportMenuPrenotate)}
                  style={{...btnStyle, background: "#28a745", padding: "6px 12px", fontSize: 12}}
                  title="Esporta lezioni prenotate"
                >
                  📄 Esporta ▾
                </button>
                {exportMenuPrenotate && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    background: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 1000,
                    minWidth: 120,
                    marginTop: 4
                  }}>
                    <button
                      onClick={() => { exportToPDF("prenotate"); setExportMenuPrenotate(false); }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        background: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: 13
                      }}
                      onMouseEnter={(e) => e.target.style.background = "#f0f0f0"}
                      onMouseLeave={(e) => e.target.style.background = "transparent"}
                    >
                      📄 PDF
                    </button>
                    <button
                      onClick={() => { exportToTXT("prenotate"); setExportMenuPrenotate(false); }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        background: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: 13
                      }}
                      onMouseEnter={(e) => e.target.style.background = "#f0f0f0"}
                      onMouseLeave={(e) => e.target.style.background = "transparent"}
                    >
                      📝 TXT
                    </button>
                    <button
                      onClick={() => { exportToPNG("prenotate"); setExportMenuPrenotate(false); }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        background: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: 13,
                        borderRadius: "0 0 6px 6px"
                      }}
                      onMouseEnter={(e) => e.target.style.background = "#f0f0f0"}
                      onMouseLeave={(e) => e.target.style.background = "transparent"}
                    >
                      🖼️ PNG
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div ref={contentRefPrenotate}>
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

                  const statoEl = (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span>{displayStato(a)}</span>
                      {renderBadgeRiprogrammata(a)}
                    </div>
                  );
                  cells.push({ content: statoEl, style: { minWidth: 140 } });

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
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <SectionTitle>Lezioni Svolte</SectionTitle>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setExportMenuSvolte(!exportMenuSvolte)}
                  style={{...btnStyle, background: "#28a745", padding: "6px 12px", fontSize: 12}}
                  title="Esporta lezioni svolte"
                >
                  📄 Esporta ▾
                </button>
                {exportMenuSvolte && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    background: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 1000,
                    minWidth: 120,
                    marginTop: 4
                  }}>
                    <button
                      onClick={() => { exportToPDF("svolte"); setExportMenuSvolte(false); }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        background: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: 13
                      }}
                      onMouseEnter={(e) => e.target.style.background = "#f0f0f0"}
                      onMouseLeave={(e) => e.target.style.background = "transparent"}
                    >
                      📄 PDF
                    </button>
                    <button
                      onClick={() => { exportToTXT("svolte"); setExportMenuSvolte(false); }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        background: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: 13
                      }}
                      onMouseEnter={(e) => e.target.style.background = "#f0f0f0"}
                      onMouseLeave={(e) => e.target.style.background = "transparent"}
                    >
                      📝 TXT
                    </button>
                    <button
                      onClick={() => { exportToPNG("svolte"); setExportMenuSvolte(false); }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        background: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: 13,
                        borderRadius: "0 0 6px 6px"
                      }}
                      onMouseEnter={(e) => e.target.style.background = "#f0f0f0"}
                      onMouseLeave={(e) => e.target.style.background = "transparent"}
                    >
                      🖼️ PNG
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div ref={contentRefSvolte}>
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
                  cells.push(a.oreConsumate ?? a.durataOre ?? "—");

                  const statoEl = (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span>{displayStato(a)}</span>
                      {renderBadgeRiprogrammata(a)}
                    </div>
                  );
                  cells.push({ content: statoEl, style: { minWidth: 140 } });

                  return { key: a.id, cells };
                })}
              />
              </TableWrapper>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <SectionTitle>Lezioni Cancellate</SectionTitle>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setExportMenuCancellate(!exportMenuCancellate)}
                  style={{...btnStyle, background: "#28a745", padding: "6px 12px", fontSize: 12}}
                  title="Esporta lezioni cancellate"
                >
                  📄 Esporta ▾
                </button>
                {exportMenuCancellate && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    background: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 1000,
                    minWidth: 120,
                    marginTop: 4
                  }}>
                    <button
                      onClick={() => { exportToPDF("cancellate"); setExportMenuCancellate(false); }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        background: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: 13
                      }}
                      onMouseEnter={(e) => e.target.style.background = "#f0f0f0"}
                      onMouseLeave={(e) => e.target.style.background = "transparent"}
                    >
                      📄 PDF
                    </button>
                    <button
                      onClick={() => { exportToTXT("cancellate"); setExportMenuCancellate(false); }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        background: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: 13
                      }}
                      onMouseEnter={(e) => e.target.style.background = "#f0f0f0"}
                      onMouseLeave={(e) => e.target.style.background = "transparent"}
                    >
                      📝 TXT
                    </button>
                    <button
                      onClick={() => { exportToPNG("cancellate"); setExportMenuCancellate(false); }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        background: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: 13,
                        borderRadius: "0 0 6px 6px"
                      }}
                      onMouseEnter={(e) => e.target.style.background = "#f0f0f0"}
                      onMouseLeave={(e) => e.target.style.background = "transparent"}
                    >
                      🖼️ PNG
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div ref={contentRefCancellate}>
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
                  cells.push(a.oreConsumate ?? a.durataOre ?? "—");
                  const statoEl = (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{displayStato(a)}</span>
                      {renderBadgeRiprogrammata(a)}
                    </div>
                  );
                  cells.push({ content: statoEl, style: { minWidth: 140 } });

                  if (!isAdmin) {
                    cells.push(
                      <span style={{ fontSize: 12, opacity: 0.55 }}>—</span>
                    );
                  }

                  return { key: a.id, cells };
                })}
              />
              </TableWrapper>
            </div>

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
          onSposta={(a) => { setAttivitaSelezionata(null); setSpostaAttivita(a); }}
        />
      )}

      {spostaAttivita && (
        <SpostaAttivitaModal
          attivita={spostaAttivita}
          onClose={() => setSpostaAttivita(null)}
          onSuccess={() => { setSpostaAttivita(null); fetchAttivita(); }}
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
