// @ts-nocheck
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import PacchettoForm from "./PacchettoForm";
import PacchettoEditForm from "./PacchettoEditForm";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import Alert from "../Alert";
import { calcolaSottostato, getStatoCompleto, calcolaStatsPacchetto } from "../../utils/pacchettoStato";

async function fetchPacchetti() {
  const res = await fetch("/api/pacchetti");
  return res.json();
}

async function fetchAttivitaByPacchetto(pacchettoId) {
  const res = await fetch(`/api/attivita?pacchettoId=${pacchettoId}`);
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
  const [alertLetti, setAlertLetti] = useState([]);
  const [sezioneAperta, setSezioneAperta] = useState({
    attivi: true,
    archiviati: false,
    sospesi: false
  });

  useEffect(() => {
    async function load() {
      const packs = await fetchPacchetti();
      setPacchetti(packs || []);
      
      // Carica attività per ogni pacchetto
      const attMap = {};
      for (const p of packs || []) {
        try {
          const att = await fetchAttivitaByPacchetto(p.id);
          attMap[p.id] = Array.isArray(att) ? att : [];
        } catch (e) {
          attMap[p.id] = [];
        }
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

  function handleCreateSuccess() {
    setEditPacchetto(null);
    setDeletePacchetto(null);
    // Ricarica
    fetchPacchetti().then((packs) => {
      setPacchetti(packs || []);
      const loadAtt = async () => {
        const attMap = {};
        for (const p of packs || []) {
          const att = await fetchAttivitaByPacchetto(p.id);
          attMap[p.id] = Array.isArray(att) ? att : [];
        }
        setAttivitaMap(attMap);
      };
      loadAtt();
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

  // Raggruppa pacchetti per stato
  const pacchettiAttivi = pacchetti.filter(p => p.stato === 'attivo');
  const pacchettiArchiviati = pacchetti.filter(p => p.stato === 'archiviato');
  const pacchettiSospesi = pacchetti.filter(p => p.stato === 'sospeso');

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

      {/* Sezione Pacchetti Attivi */}
      <SezioneDropdown
        titolo="📦 Pacchetti Attivi"
        count={pacchettiAttivi.length}
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
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 14 }}>
            Nessun pacchetto attivo
          </div>
        )}
      </SezioneDropdown>

      {/* Sezione Pacchetti Archiviati */}
      <SezioneDropdown
        titolo="📁 Pacchetti Archiviati"
        count={pacchettiArchiviati.length}
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
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 14 }}>
            Nessun pacchetto archiviato
          </div>
        )}
      </SezioneDropdown>

      {/* Sezione Pacchetti Sospesi */}
      <SezioneDropdown
        titolo="⏸️ Pacchetti Sospesi"
        count={pacchettiSospesi.length}
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
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 14 }}>
            Nessun pacchetto sospeso
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
    </div>
  );
}

// Componente SezioneDropdown
function SezioneDropdown({ titolo, count, isOpen, onToggle, badgeColor, children }) {
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
            {count}
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

function PacchettoCard({ pacchetto, attivita, onEdit, onDelete, onCambiaStato }) {
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
