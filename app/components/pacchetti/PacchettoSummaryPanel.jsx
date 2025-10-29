"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function PacchettoSummaryPanel({ attivita = [] }) {
  const { data: session } = useSession();
  const [pacchetto, setPacchetto] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPacchetto() {
      if (!session?.user?.clienteId) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`/api/pacchetti?clienteId=${session.user.clienteId}`);
        if (res.ok) {
          const pacchetti = await res.json();
          // Trova il pacchetto attivo
          const attivo = pacchetti.find(p => p.stato === 'attivo');
          setPacchetto(attivo || pacchetti[0] || null);
        }
      } catch (err) {
        console.error('Errore caricamento pacchetto:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchPacchetto();
  }, [session]);

  if (loading) {
    return (
      <div style={panelStyle}>
        <div style={{ textAlign: 'center', padding: 20, color: '#5a6d90' }}>
          Caricamento...
        </div>
      </div>
    );
  }

  if (!pacchetto) {
    return null;
  }

  // Calcola statistiche dalle attività
  const GRACE_MS = 5 * 60 * 1000;
  const now = Date.now();
  
  const stats = {
    oreAcquistate: pacchetto.oreAcquistate || 0,
    oreResidue: pacchetto.oreResidue || 0,
    orePrenotate: 0,
    oreSvolte: 0,
    oreProgrammate: 0,
  };

  // Analizza le attività
  attivita.forEach(att => {
    const ore = att.oreConsumate || att.durataOre || 0;
    const orario = att.orario ? new Date(att.orario) : new Date(att.createdAt);
    const isPast = orario.getTime() < (now - GRACE_MS);
    const isCancelled = (att.stato || '').toLowerCase() === 'cancellata';
    
    if (isCancelled) {
      return; // Non conta le cancellate
    }
    
    if (isPast) {
      stats.oreSvolte += ore;
    } else {
      stats.oreProgrammate += ore;
    }
    
    stats.orePrenotate += ore;
  });

  // Ore rimanenti = ore acquistate - ore prenotate (includono sia svolte che programmate)
  const oreRimanenti = stats.oreAcquistate - stats.orePrenotate;

  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>
        Riepilogo Pacchetto: <span style={{ color: '#fff' }}>{pacchetto.descrizione}</span>
      </h3>
      
      <div style={gridStyle}>
        <StatCard
          label="Ore Acquistate"
          value={stats.oreAcquistate}
          icon="📦"
          color="#3B82F6"
        />
        <StatCard
          label="Ore Prenotate"
          value={stats.orePrenotate}
          icon="📅"
          color="#8B5CF6"
        />
        <StatCard
          label="Ore Svolte"
          value={stats.oreSvolte}
          icon="✅"
          color="#10B981"
        />
        <StatCard
          label="Ore Programmate"
          value={stats.oreProgrammate}
          icon="🔮"
          color="#F59E0B"
        />
        <StatCard
          label="Ore Rimanenti"
          value={oreRimanenti}
          icon="⏳"
          color={oreRimanenti < 5 ? '#EF4444' : '#06B6D4'}
          highlighted={oreRimanenti < 5}
        />
      </div>
      
      {oreRimanenti < 5 && oreRimanenti > 0 && (
        <div style={warningStyle}>
          ⚠️ Attenzione: stai per esaurire le ore del pacchetto!
        </div>
      )}
      
      {oreRimanenti <= 0 && (
        <div style={dangerStyle}>
          🚨 Pacchetto esaurito! Contatta l'amministratore per rinnovare.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color, highlighted }) {
  return (
    <div style={{
      ...cardStyle,
      borderLeft: `4px solid ${color}`,
      boxShadow: highlighted ? `0 4px 20px ${color}40` : cardStyle.boxShadow,
      transform: highlighted ? 'scale(1.02)' : 'scale(1)',
    }}>
      <div style={iconStyle}>{icon}</div>
      <div style={valueStyle}>{value.toFixed(1)}</div>
      <div style={labelStyle}>{label}</div>
    </div>
  );
}

const panelStyle = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: 20,
  padding: 28,
  marginBottom: 32,
  boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
  color: '#fff',
};

const titleStyle = {
  fontSize: 20,
  fontWeight: 700,
  marginBottom: 24,
  textAlign: 'center',
  color: '#fff',
  textShadow: '0 2px 4px rgba(0,0,0,0.2)',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 16,
};

const cardStyle = {
  background: '#fff',
  borderRadius: 16,
  padding: '20px 16px',
  textAlign: 'center',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  transition: 'all 0.3s ease',
  cursor: 'default',
};

const iconStyle = {
  fontSize: 32,
  marginBottom: 8,
};

const valueStyle = {
  fontSize: 28,
  fontWeight: 800,
  color: '#20489a',
  marginBottom: 4,
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const warningStyle = {
  marginTop: 20,
  padding: '12px 16px',
  background: 'rgba(251, 191, 36, 0.15)',
  border: '2px solid rgba(251, 191, 36, 0.4)',
  borderRadius: 12,
  textAlign: 'center',
  fontSize: 14,
  fontWeight: 600,
  color: '#FFF',
};

const dangerStyle = {
  marginTop: 20,
  padding: '12px 16px',
  background: 'rgba(239, 68, 68, 0.15)',
  border: '2px solid rgba(239, 68, 68, 0.4)',
  borderRadius: 12,
  textAlign: 'center',
  fontSize: 14,
  fontWeight: 600,
  color: '#FFF',
};
