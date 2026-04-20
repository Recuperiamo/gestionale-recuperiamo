// @ts-nocheck
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import PacchettoForm from "./PacchettoForm";
import PacchettoEditForm from "./PacchettoEditForm";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import PacchettoLezioniModal from "./PacchettoLezioniModal";
import RettificaOreModal from "./RettificaOreModal";
import Alert from "../Alert";
import { calcolaSottostato, getStatoCompleto, calcolaStatsPacchetto } from "../../utils/pacchettoStato";

async function fetchPacchetti() {
  const res = await fetch("/api/pacchetti");
  return res.json();
}


async function fetchAlertLetti() {
  const res = await fetch("/api/pacchetti/alert-letto", {
    credentials: "include"
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.ids || [];
}

async function segnalaAlertLetto(pacchettoId) {
  await fetch("/api/pacchetti/alert-letto", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pacchettoId }),
    credentials: "include"
  });
}

export default function PacchettiCardsAdmin() {
  const [pacchetti, setPacchetti] = useState([]);
  const [attivitaMap, setAttivitaMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [editPacchetto, setEditPacchetto] = useState(null);
  const [deletePacchetto, setDeletePacchetto] = useState(null);
  const [lezioniPacchetto, setLezioniPacchetto] = useState(null);
  const [rettificaPacchetto, setRettificaPacchetto] = useState(null);
  const [alertLetti, setAlertLetti] = useState([]);
  const [sezioneAperta, setSezioneAperta] = useState({
    attivi: true,
    archiviati: false,
    sospesi: false
  });
  const [ricerca, setRicerca] = useState("");
  const [ordinamento, setOrdinamento] = useState("nome-az");
  const [filtroSaldato, setFiltroSaldato] = useState<"tutti" | "saldato" | "non-saldato">("tutti");
  const [filtroEsauriti, setFiltroEsauriti] = useState(false);
  const [filtroInScadenza, setFiltroInScadenza] = useState(false);

  useEffect(() => {
    async function load() {
      const packs = await fetchPacchetti();
      setPacchetti(packs || []);

      // Le attività sono già incluse in ogni pacchetto dalla GET /api/pacchetti (include: { attivita: true })
      // Non serve una fetch separata per pacchetto
      const attMap = {};
      for (const p of packs || []) {
        attMap[p.id] = Array.isArray(p.attivita) ? p.attivita : [];
      }
      setAttivitaMap(attMap);
      
      const letti = await fetchAlertLetti();
      setAlertLetti(letti);
      
      setLoading(false);
    }
    load();
  }, []);

  async function handleHideAlert(id) {
    await segnalaAlertLetto(id);
    setAlertLetti((prev) => [...prev, id]);
  }

  async function handleCambiaStato(pacchettoId, nuovoStato) {
    if (nuovoStato === "archiviato") {
      const p = pacchetti.find(x => x.id === pacchettoId);
      if (p && !p.saldato) {
        alert("Non è possibile archiviare il pacchetto: deve essere prima saldato.");
        return;
      }
    }
    try {
      const res = await fetch(`/api/pacchetti/${pacchettoId}/stato`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stato: nuovoStato }),
        credentials: "include"
      });

      if (!res.ok) {
        throw new Error("Errore aggiornamento stato");
      }

      // Ricarica pacchetti
      handleCreateSuccess();
    } catch (error) {
      console.error("Errore cambio stato:", error);
      alert("Errore durante il cambio di stato");
    }
  }

  async function handleToggleSaldato(pacchettoId, nuovoValore) {
    try {
      const res = await fetch(`/api/pacchetti/${pacchettoId}/saldato`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saldato: nuovoValore }),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Errore aggiornamento saldato");
      handleCreateSuccess();
    } catch (error) {
      console.error("Errore toggle saldato:", error);
      alert("Errore durante l'aggiornamento del saldo");
    }
  }

  function handleCreateSuccess() {
    setEditPacchetto(null);
    setDeletePacchetto(null);
    // Ricarica
    fetchPacchetti().then((packs) => {
      setPacchetti(packs || []);
      const attMap = {};
      for (const p of packs || []) {
        attMap[p.id] = Array.isArray(p.attivita) ? p.attivita : [];
      }
      setAttivitaMap(attMap);
    });
  }

  const alertTop = pacchetti.find(
    (p) =>
      p.stato === 'attivo' && // Solo per pacchetti attivi
      p.sogliaOreResidue !== null &&
      p.sogliaOreResidue !== undefined &&
      Number(p.oreResidue) <= Number(p.sogliaOreResidue) &&
      Number(p.sogliaOreResidue) > 0 &&
      !alertLetti.includes(p.id)
  );

  function applyFiltersSort(list) {
    const q = ricerca.trim().toLowerCase();
    let result = list.filter((p) => {
      if (q) {
        const nome = (p.descrizione || "").toLowerCase();
        const cliente = (p.cliente?.nomeReferente || "").toLowerCase();
        if (!nome.includes(q) && !cliente.includes(q)) return false;
      }
      if (filtroSaldato === "saldato" && !p.saldato) return false;
      if (filtroSaldato === "non-saldato" && p.saldato) return false;
      if (filtroEsauriti && Number(p.oreResidue) > 0) return false;
      if (filtroInScadenza && !(Number(p.oreResidue) > 0 && Number(p.oreResidue) <= 5)) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (ordinamento) {
        case "nome-az": return (a.descrizione || "").localeCompare(b.descrizione || "", "it");
        case "nome-za": return (b.descrizione || "").localeCompare(a.descrizione || "", "it");
        case "cliente-az": return (a.cliente?.nomeReferente || "").localeCompare(b.cliente?.nomeReferente || "", "it");
        case "ore-residue-desc": return Number(b.oreResidue ?? 0) - Number(a.oreResidue ?? 0);
        case "ore-residue-asc": return Number(a.oreResidue ?? 0) - Number(b.oreResidue ?? 0);
        case "ore-acquistate-desc": return Number(b.oreAcquistate ?? 0) - Number(a.oreAcquistate ?? 0);
        case "utilizzo-desc": {
          const ua = a.oreAcquistate ? (a.oreAcquistate - (a.oreResidue ?? 0)) / a.oreAcquistate : 0;
          const ub = b.oreAcquistate ? (b.oreAcquistate - (b.oreResidue ?? 0)) / b.oreAcquistate : 0;
          return ub - ua;
        }
        case "utilizzo-asc": {
          const ua = a.oreAcquistate ? (a.oreAcquistate - (a.oreResidue ?? 0)) / a.oreAcquistate : 0;
          const ub = b.oreAcquistate ? (b.oreAcquistate - (b.oreResidue ?? 0)) / b.oreAcquistate : 0;
          return ua - ub;
        }
        default: return 0;
      }
    });
    return result;
  }

  const filtriAttivi =
    ricerca.trim() !== "" ||
    filtroSaldato !== "tutti" ||
    filtroEsauriti ||
    filtroInScadenza;

  function resetFiltri() {
    setRicerca("");
    setOrdinamento("nome-az");
    setFiltroSaldato("tutti");
    setFiltroEsauriti(false);
    setFiltroInScadenza(false);
  }

  // Raggruppa pacchetti per stato (con filtri applicati)
  const pacchettiAttivi = applyFiltersSort(pacchetti.filter(p => p.stato === 'attivo'));
  const pacchettiArchiviati = applyFiltersSort(pacchetti.filter(p => p.stato === 'archiviato'));
  const pacchettiSospesi = applyFiltersSort(pacchetti.filter(p => p.stato === 'sospeso'));

  const toggleSezione = (nome) => {
    setSezioneAperta(prev => ({ ...prev, [nome]: !prev[nome] }));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#5a6d90' }}>
        Caricamento pacchetti...
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24, color: '#20489a' }}>
        Gestione Pacchetti
      </h2>

      {alertTop && (
        <Alert
          message={
            <>
              <b>
                Pacchetto <span style={{ color: "#4B65C2" }}>{alertTop.descrizione}</span>
                {" "}del cliente{" "}
                <span style={{ color: "#0B7B5B" }}>
                  {alertTop.cliente?.nomeReferente || alertTop.clienteId}
                </span>
                :{" "}
              </b>
              Ore residue sotto soglia ({alertTop.sogliaOreResidue})!
              <button
                className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition"
                onClick={() => setEditPacchetto(alertTop)}
                style={{ textDecoration: "underline", fontWeight: 500, marginLeft: 8 }}
              >
                Vai al dettaglio/modifica
              </button>
              <button
                className="ml-2 px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                onClick={() => handleHideAlert(alertTop.id)}
                style={{ marginLeft: 12, fontWeight: 500 }}
              >
                Segnala come letto
              </button>
            </>
          }
          type="warning"
          topPage={true}
          large={true}
          onClose={() => handleHideAlert(alertTop.id)}
        />
      )}

      {/* Barra filtri e ordinamento */}
      <div style={{
        background: "#f8fafc",
        border: "1.5px solid #e2e8f0",
        borderRadius: 14,
        padding: "16px 20px",
        marginBottom: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        {/* Riga 1: ricerca + ordinamento */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 220px" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#94a3b8" }}>🔍</span>
            <input
              type="text"
              placeholder="Cerca per nome o cliente…"
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "8px 12px 8px 32px",
                borderRadius: 8, border: "1.5px solid #cbd5e1",
                fontSize: 13, color: "#1e293b", background: "#fff",
                outline: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 220px" }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", whiteSpace: "nowrap" }}>Ordina per</label>
            <select
              value={ordinamento}
              onChange={(e) => setOrdinamento(e.target.value)}
              style={{
                flex: 1, padding: "8px 10px", borderRadius: 8,
                border: "1.5px solid #cbd5e1", fontSize: 13,
                color: "#1e293b", background: "#fff", cursor: "pointer",
              }}
            >
              <option value="nome-az">Nome A → Z</option>
              <option value="nome-za">Nome Z → A</option>
              <option value="cliente-az">Cliente A → Z</option>
              <option value="ore-residue-desc">Ore residue (più → meno)</option>
              <option value="ore-residue-asc">Ore residue (meno → più)</option>
              <option value="ore-acquistate-desc">Ore acquistate (più → meno)</option>
              <option value="utilizzo-desc">% Utilizzo (più usati prima)</option>
              <option value="utilizzo-asc">% Utilizzo (meno usati prima)</option>
            </select>
          </div>
          {filtriAttivi && (
            <button
              onClick={resetFiltri}
              style={{
                padding: "8px 14px", borderRadius: 8, border: "none",
                background: "#fee2e2", color: "#991b1b",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              ✕ Reset filtri
            </button>
          )}
        </div>
        {/* Riga 2: chip filtri */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Filtri:</span>
          {(["tutti", "saldato", "non-saldato"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFiltroSaldato(v)}
              style={{
                padding: "5px 12px", borderRadius: 20,
                border: "1.5px solid",
                borderColor: filtroSaldato === v ? "#20489a" : "#cbd5e1",
                background: filtroSaldato === v ? "#20489a" : "#fff",
                color: filtroSaldato === v ? "#fff" : "#64748b",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              {v === "tutti" ? "Tutti" : v === "saldato" ? "✓ Saldati" : "✗ Non saldati"}
            </button>
          ))}
          <button
            onClick={() => { setFiltroEsauriti(v => !v); if (!filtroEsauriti) setFiltroInScadenza(false); }}
            style={{
              padding: "5px 12px", borderRadius: 20,
              border: "1.5px solid",
              borderColor: filtroEsauriti ? "#ef4444" : "#cbd5e1",
              background: filtroEsauriti ? "#ef4444" : "#fff",
              color: filtroEsauriti ? "#fff" : "#64748b",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            🚨 Esauriti
          </button>
          <button
            onClick={() => { setFiltroInScadenza(v => !v); if (!filtroInScadenza) setFiltroEsauriti(false); }}
            style={{
              padding: "5px 12px", borderRadius: 20,
              border: "1.5px solid",
              borderColor: filtroInScadenza ? "#f59e0b" : "#cbd5e1",
              background: filtroInScadenza ? "#f59e0b" : "#fff",
              color: filtroInScadenza ? "#fff" : "#64748b",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            ⚠️ In scadenza (≤5h)
          </button>
        </div>
      </div>

      {/* Sezione Pacchetti Attivi */}
      <SezioneDropdown
        titolo="📦 Pacchetti Attivi"
        count={pacchettiAttivi.length}
        countTotal={filtriAttivi ? pacchetti.filter(p => p.stato === 'attivo').length : undefined}
        isOpen={sezioneAperta.attivi}
        onToggle={() => toggleSezione('attivi')}
        badgeColor="#10B981"
      >
        {pacchettiAttivi.length > 0 ? (
          <div style={gridStyle}>
            {pacchettiAttivi.map((p) => (
              <PacchettoCard
                key={p.id}
                pacchetto={p}
                attivita={attivitaMap[p.id] || []}
                onEdit={() => setEditPacchetto(p)}
                onDelete={() => setDeletePacchetto(p)}
                onCambiaStato={handleCambiaStato}
                onToggleSaldato={handleToggleSaldato}
                onLezioni={() => setLezioniPacchetto(p)}
                onRettifica={() => setRettificaPacchetto(p)}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 14 }}>
            {filtriAttivi ? "Nessun pacchetto attivo corrisponde ai filtri." : "Nessun pacchetto attivo"}
          </div>
        )}
      </SezioneDropdown>

      {/* Sezione Pacchetti Archiviati */}
      <SezioneDropdown
        titolo="📁 Pacchetti Archiviati"
        count={pacchettiArchiviati.length}
        countTotal={filtriAttivi ? pacchetti.filter(p => p.stato === 'archiviato').length : undefined}
        isOpen={sezioneAperta.archiviati}
        onToggle={() => toggleSezione('archiviati')}
        badgeColor="#6B7280"
      >
        {pacchettiArchiviati.length > 0 ? (
          <div style={gridStyle}>
            {pacchettiArchiviati.map((p) => (
              <PacchettoCard
                key={p.id}
                pacchetto={p}
                attivita={attivitaMap[p.id] || []}
                onEdit={() => setEditPacchetto(p)}
                onDelete={() => setDeletePacchetto(p)}
                onCambiaStato={handleCambiaStato}
                onToggleSaldato={handleToggleSaldato}
                onLezioni={() => setLezioniPacchetto(p)}
                onRettifica={() => setRettificaPacchetto(p)}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 14 }}>
            {filtriAttivi ? "Nessun pacchetto archiviato corrisponde ai filtri." : "Nessun pacchetto archiviato"}
          </div>
        )}
      </SezioneDropdown>

      {/* Sezione Pacchetti Sospesi */}
      <SezioneDropdown
        titolo="⏸️ Pacchetti Sospesi"
        count={pacchettiSospesi.length}
        countTotal={filtriAttivi ? pacchetti.filter(p => p.stato === 'sospeso').length : undefined}
        isOpen={sezioneAperta.sospesi}
        onToggle={() => toggleSezione('sospesi')}
        badgeColor="#F59E0B"
      >
        {pacchettiSospesi.length > 0 ? (
          <div style={gridStyle}>
            {pacchettiSospesi.map((p) => (
              <PacchettoCard
                key={p.id}
                pacchetto={p}
                attivita={attivitaMap[p.id] || []}
                onEdit={() => setEditPacchetto(p)}
                onDelete={() => setDeletePacchetto(p)}
                onCambiaStato={handleCambiaStato}
                onToggleSaldato={handleToggleSaldato}
                onLezioni={() => setLezioniPacchetto(p)}
                onRettifica={() => setRettificaPacchetto(p)}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 14 }}>
            {filtriAttivi ? "Nessun pacchetto sospeso corrisponde ai filtri." : "Nessun pacchetto sospeso"}
          </div>
        )}
      </SezioneDropdown>

      <button
        onClick={() => setEditPacchetto({})}
        style={btnNewStyle}
      >
        + Nuovo Pacchetto
      </button>

      {editPacchetto && Object.keys(editPacchetto).length === 0 && (
        <PacchettoForm
          onClose={() => setEditPacchetto(null)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {editPacchetto && Object.keys(editPacchetto).length > 0 && (
        <PacchettoEditForm
          pacchetto={editPacchetto}
          onClose={() => setEditPacchetto(null)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {deletePacchetto && (
        <ConfirmDeleteModal
          pacchetto={deletePacchetto}
          onClose={() => setDeletePacchetto(null)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {lezioniPacchetto && (
        <PacchettoLezioniModal
          pacchetto={lezioniPacchetto}
          onClose={() => setLezioniPacchetto(null)}
          onRefreshPacchetti={handleCreateSuccess}
        />
      )}

      {rettificaPacchetto && (
        <RettificaOreModal
          pacchetto={rettificaPacchetto}
          onClose={() => setRettificaPacchetto(null)}
          onSuccess={() => { setRettificaPacchetto(null); handleCreateSuccess(); }}
        />
      )}
    </div>
  );
}

// Componente SezioneDropdown
function SezioneDropdown({ titolo, count, countTotal, isOpen, onToggle, badgeColor, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: isOpen ? '#F8FAFC' : '#fff',
          border: '2px solid #E2E8F0',
          borderRadius: 12,
          cursor: 'pointer',
          transition: 'all 0.2s',
          marginBottom: isOpen ? 16 : 0,
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#F8FAFC'}
        onMouseOut={(e) => e.currentTarget.style.background = isOpen ? '#F8FAFC' : '#fff'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#20489a' }}>
            {titolo}
          </span>
          <span style={{
            background: badgeColor,
            color: '#fff',
            padding: '4px 12px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
          }}>
            {countTotal !== undefined ? `${count} / ${countTotal}` : count}
          </span>
        </div>
        <span style={{
          fontSize: 18,
          color: '#64748b',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          display: 'inline-block',
        }}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div style={{ marginTop: 0 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function PacchettoCard({ pacchetto, attivita, onEdit, onDelete, onCambiaStato, onToggleSaldato, onLezioni, onRettifica }) {
  const GRACE_MS = 5 * 60 * 1000;
  const now = Date.now();
  
  const stats = {
    oreAcquistate: pacchetto.oreAcquistate || 0,
    oreResidue: pacchetto.oreResidue || 0,
    orePrenotate: 0,
    oreSvolte: 0,
    oreProgrammate: 0,
  };

  attivita.forEach(att => {
    const ore = att.oreConsumate || att.durataOre || 0;
    const orario = att.orario ? new Date(att.orario) : new Date(att.createdAt);
    const isPast = orario.getTime() < (now - GRACE_MS);
    const isCancelled = (att.stato || '').toLowerCase() === 'cancellata';
    
    if (isCancelled) return;
    
    if (isPast) {
      stats.oreSvolte += ore;
    } else {
      stats.oreProgrammate += ore;
    }
    
    stats.orePrenotate += ore;
  });

  const oreRimanenti = stats.oreAcquistate - stats.orePrenotate;
  
  // Calcola sottostato
  const sottostato = calcolaSottostato(stats);
  const statoCompleto = getStatoCompleto(pacchetto.stato, sottostato);
  
  // LOGICA STATI:
  // 1. ESAURITO (priorità massima): ore_svolte >= ore_acquistate
  // 2. TUTTE LE ORE PRENOTATE: ore_prenotate >= ore_acquistate E ore_svolte < ore_acquistate (arancione strong)
  // 3. DISPONIBILITÀ LIMITATA: ore_rimanenti < 5 (arancione ocra - warning generico)
  const isEsaurito = sottostato === "esaurito";
  const isTuttePrenotate = sottostato === "tutto_prenotato";
  const isDisponibilitaLimitata = !isEsaurito && !isTuttePrenotate && oreRimanenti < 5 && oreRimanenti > 0;
  
  // Determina colore bordo card
  let borderColor = '#3B82F6'; // default blu
  if (isEsaurito) borderColor = '#EF4444'; // rosso
  else if (isTuttePrenotate) borderColor = '#F59E0B'; // arancione strong
  else if (isDisponibilitaLimitata) borderColor = '#D97706'; // arancione ocra

  return (
    <div style={{
      ...cardContainerStyle,
      borderLeft: `4px solid ${borderColor}`,
      boxShadow: (isEsaurito || isTuttePrenotate || isDisponibilitaLimitata) 
        ? '0 4px 20px rgba(239, 68, 68, 0.15)' 
        : '0 4px 12px rgba(0,0,0,0.08)',
    }}>
      <div style={cardHeaderStyle}>
        <div>
          <h3 style={cardTitleStyle}>{pacchetto.descrizione}</h3>
          <p style={cardSubtitleStyle}>
            Cliente: {pacchetto.cliente?.nomeReferente || `ID ${pacchetto.clienteId}`}
          </p>
          <p style={cardSubtitleStyle}>
            Stato: <span style={getStatoBadgeStyle(pacchetto.stato)}>{statoCompleto}</span>
            {" "}
            <span style={{
              padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, display: 'inline-block',
              background: pacchetto.saldato ? '#D1FAE5' : '#FEF3C7',
              color: pacchetto.saldato ? '#065F46' : '#92400E',
            }}>
              {pacchetto.saldato ? '✓ Saldato' : 'Non saldato'}
            </span>
          </p>
        </div>
      </div>

      <div style={statsGridStyle}>
        <StatMini label="Acquistate" value={stats.oreAcquistate} color="#3B82F6" />
        <StatMini label="Prenotate" value={stats.orePrenotate} color="#8B5CF6" />
        <StatMini label="Svolte" value={stats.oreSvolte} color="#10B981" />
        <StatMini label="Programmate" value={stats.oreProgrammate} color="#F59E0B" />
        <StatMini 
          label="Rimanenti" 
          value={oreRimanenti} 
          color={isEsaurito ? '#EF4444' : isTuttePrenotate ? '#F59E0B' : isDisponibilitaLimitata ? '#D97706' : '#06B6D4'}
          highlighted={isEsaurito || isTuttePrenotate || isDisponibilitaLimitata}
        />
      </div>

      {isEsaurito && (
        <div style={{
          ...warningBoxStyle,
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid rgba(239, 68, 68, 0.3)',
        }}>
          🚨 Pacchetto esaurito - Tutte le ore sono state svolte!
        </div>
      )}
      
      {!isEsaurito && isTuttePrenotate && (
        <div style={{
          ...warningBoxStyle,
          background: 'rgba(251, 191, 36, 0.15)',
          border: '2px solid rgba(251, 191, 36, 0.4)',
        }}>
          ⚠️ Tutte le ore sono state prenotate ⚠️
        </div>
      )}
      
      {!isEsaurito && !isTuttePrenotate && isDisponibilitaLimitata && (
        <div style={{
          ...warningBoxStyle,
          background: 'rgba(217, 119, 6, 0.1)',
          border: '2px solid rgba(217, 119, 6, 0.3)',
        }}>
          ⚠️ Disponibilità limitata - Ore quasi esaurite!
        </div>
      )}

      <div style={actionsStyle}>
        <button onClick={onLezioni} style={btnLezioniStyle}>
          📋 Lezioni
        </button>
        <button onClick={onEdit} style={btnEditStyle}>
          ✏️ Modifica
        </button>
        <button onClick={onDelete} style={btnDeleteStyle}>
          🗑️ Elimina
        </button>
        <Link
          href={`/pacchetti/${pacchetto.id}/changelog`}
          style={btnHistoryStyle}
        >
          🕐 Storico
        </Link>
      </div>

      {/* Pulsanti cambio stato */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {pacchetto.stato !== "sospeso" && (
          <button
            onClick={() => onCambiaStato(pacchetto.id, "sospeso")}
            style={btnStatoStyle}
            title="Sospendi pacchetto"
          >
            ⏸️ Sospendi
          </button>
        )}
        {pacchetto.stato !== "archiviato" && (
          <button
            onClick={() => onCambiaStato(pacchetto.id, "archiviato")}
            style={btnStatoStyle}
            title="Archivia pacchetto"
          >
            📦 Archivia
          </button>
        )}
        {pacchetto.stato !== "attivo" && (
          <button
            onClick={() => onCambiaStato(pacchetto.id, "attivo")}
            style={{...btnStatoStyle, background: '#10B981', color: '#fff'}}
            title="Riattiva pacchetto"
          >
            ▶️ Riattiva
          </button>
        )}
        <button
          onClick={() => onToggleSaldato(pacchetto.id, !pacchetto.saldato)}
          style={{
            ...btnStatoStyle,
            background: pacchetto.saldato ? '#FEF3C7' : '#D1FAE5',
            color: pacchetto.saldato ? '#92400E' : '#065F46',
          }}
          title={pacchetto.saldato ? "Segna come non saldato" : "Segna come saldato"}
        >
          {pacchetto.saldato ? '✗ Rimuovi saldo' : '✓ Segna saldato'}
        </button>
        <button
          onClick={onRettifica}
          style={{ ...btnStatoStyle, background: '#EDE9FE', color: '#5B21B6' }}
          title="Rettifica manuale ore residue/acquistate"
        >
          ⚖️ Rettifica ore
        </button>
      </div>
    </div>
  );
}

function StatMini({ label, value, color, highlighted }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '8px 4px',
      borderRadius: 8,
      background: highlighted ? `${color}15` : '#f8fafc',
    }}>
      <div style={{
        fontSize: 18,
        fontWeight: 800,
        color: color,
      }}>
        {value.toFixed(1)}
      </div>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        color: '#64748b',
        textTransform: 'uppercase',
        marginTop: 2,
      }}>
        {label}
      </div>
    </div>
  );
}

function getStatoBadgeStyle(stato) {
  const base = {
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
    display: 'inline-block',
  };
  
  if (stato === 'attivo') {
    return { ...base, background: '#D1FAE5', color: '#065F46' };
  }
  if (stato === 'sospeso') {
    return { ...base, background: '#FEF3C7', color: '#92400E' };
  }
  if (stato === 'archiviato') {
    return { ...base, background: '#E5E7EB', color: '#374151' };
  }
  return { ...base, background: '#F1F5F9', color: '#475569' };
}

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
  gap: 24,
  marginTop: 20,
};

const cardContainerStyle = {
  background: '#fff',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  transition: 'all 0.3s ease',
  cursor: 'default',
};

const cardHeaderStyle = {
  marginBottom: 16,
};

const cardTitleStyle = {
  fontSize: 18,
  fontWeight: 800,
  color: '#20489a',
  marginBottom: 6,
};

const cardSubtitleStyle = {
  fontSize: 13,
  color: '#64748b',
  marginBottom: 4,
};

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: 8,
  marginBottom: 12,
};

const warningBoxStyle = {
  padding: '8px 12px',
  borderRadius: 8,
  textAlign: 'center',
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 12,
};

const actionsStyle = {
  display: 'flex',
  gap: 8,
  justifyContent: 'space-between',
};

const btnLezioniStyle = {
  flex: 1,
  padding: '8px 12px',
  background: '#EDE9FE',
  color: '#5B21B6',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const btnEditStyle = {
  flex: 1,
  padding: '8px 12px',
  background: '#FEF3C7',
  color: '#92400E',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const btnDeleteStyle = {
  flex: 1,
  padding: '8px 12px',
  background: '#FEE2E2',
  color: '#991B1B',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const btnHistoryStyle = {
  flex: 1,
  padding: '8px 12px',
  background: '#DBEAFE',
  color: '#1E40AF',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  textAlign: 'center',
  textDecoration: 'none',
  display: 'inline-block',
};

const btnNewStyle = {
  marginTop: 24,
  padding: '12px 24px',
  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
  transition: 'all 0.3s',
};

const btnStatoStyle = {
  padding: '6px 12px',
  background: '#E5E7EB',
  color: '#374151',
  border: 'none',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
};
