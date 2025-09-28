"use client";
import React, { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import ApprovaRichiestaModal from './ApprovaRichiestaModal';

const STATE_STYLE = {
  pending: { background: "#fff7e6", color: "#a16100" },
  in_review: { background: "#e6f0ff", color: "#0b51a8" },
  approved: { background: "#e6f9ec", color: "#0d6b2d" },
  rejected: { background: "#fdecef", color: "#b81f3d" }
};

export default function AdminModifichePage() {
  const [richieste, setRichieste] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statoFiltro, setStatoFiltro] = useState('pending');
  const [errore, setErrore] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [modalRichiesta, setModalRichiesta] = useState(null); // richieste non-cancellazione

  async function load() {
    setLoading(true);
    setErrore('');
    try {
      const url = `/api/modifiche${statoFiltro ? `?stato=${statoFiltro}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Errore fetch');
      setRichieste(Array.isArray(json) ? json : []);
    } catch (e) {
      setErrore(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=> { load(); }, [statoFiltro]);

  async function act(r, action) {
    if (busyId) return;
    if (action === 'approve') {
      // Se non è cancellazione apri modale invece di approvare diretto
      if (r.tipo !== 'cancellazione') {
        setModalRichiesta(r);
        return;
      }
      if (!confirm('Approvo cancellazione?')) return;
    }
    if (action === 'reject' && !confirm('Confermi rifiuto?')) return;
    if (action === 'in_review' && r.stato !== 'in_review') {
      // Nessuna conferma necessaria
    }
    setBusyId(r.id);
    try {
      const res = await fetch('/api/modifiche', {
        method:'PATCH',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ id: r.id, action })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error||'Errore operazione');
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  function format(dt) {
    try {
      return dt ? new Date(dt).toLocaleString('it-IT') : '';
    } catch { return dt || ''; }
  }

  function renderBadge(stato) {
    const s = STATE_STYLE[stato] || {};
    return (
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "4px 8px",
        borderRadius: 14,
        display: "inline-block",
        ...s
      }}>{stato}</span>
    );
  }

  function windowInfo(r) {
    if (!r.attivita) return "";
    const start = r.attivita.orario ? new Date(r.attivita.orario) : new Date(r.attivita.createdAt);
    const diffH = (start.getTime() - Date.now()) / 3600000;
    if (diffH < 0) return "scaduta";
    if (diffH <= 24) return "entro 24h";
    if (diffH <= 72) return "entro 72h";
    return "";
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f5f8ff' }}>
      <Navbar />
      <div style={{
        maxWidth:1250, margin:'46px auto 50px',
        background:'#fff', padding:'34px 36px 46px',
        borderRadius:28, boxShadow:'0 8px 36px rgba(32,72,154,0.15)',
        fontFamily:"'Inter','Segoe UI',Arial,sans-serif", color:'#20489a'
      }}>
        <h1 style={{ marginTop:0, marginBottom:4, fontSize:30, fontWeight:800 }}>
          Richieste Modifica Lezioni
        </h1>
        <p style={{ marginTop:0, fontSize:13, color:'#4164ad' }}>
          Gestisci richieste: cambio data / orario / cancellazione. Approva con editing diretto per modifiche non di cancellazione.
        </p>

        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center', marginBottom:18 }}>
          <label style={{ fontSize:13, fontWeight:600 }}>Filtro stato:</label>
          <select
            value={statoFiltro}
            onChange={e=>setStatoFiltro(e.target.value)}
            style={{
              padding:'6px 10px',
              border:'1.4px solid #4268b3',
              borderRadius:10,
              background:'#fff',
              color:'#20489a'
            }}
          >
            <option value="pending">pending</option>
            <option value="in_review">in_review</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="">(tutti)</option>
          </select>
          <button
            onClick={load}
            style={{
              background:'#1cb0f6',
              color:'#fff',
              border:'none',
              padding:'8px 18px',
              borderRadius:12,
              fontWeight:700,
              cursor:'pointer'
            }}
          >Ricarica</button>
          {loading && <span style={{ fontSize:13 }}>Caricamento...</span>}
          {errore && (
            <span style={{ fontSize:13, color:'#b3261e', fontWeight:600 }}>{errore}</span>
          )}
        </div>

        <div style={{ overflowX:'auto', border:'1px solid #d9e2f5', borderRadius:20 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:1100 }}>
            <thead>
              <tr style={{ background:'#eff4ff' }}>
                <th>ID</th>
                <th>Attività</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Stato</th>
                <th>Nuova data</th>
                <th>Nuovo orario</th>
                <th>Durata nuova</th>
                <th>Motivazione</th>
                <th>Finestra</th>
                <th>Creata</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {!loading && richieste.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ textAlign:'center', padding:20, color:'#5a6a92' }}>
                    Nessuna richiesta.
                  </td>
                </tr>
              )}
              {richieste.map(r=>{
                const w = windowInfo(r);
                return (
                  <tr key={r.id} style={{ borderBottom:'1px solid #e5ecf6' }}>
                    <td>{r.id}</td>
                    <td>{r.attivitaId}</td>
                    <td>{r.clienteId}</td>
                    <td>{r.tipo}</td>
                    <td>{renderBadge(r.stato)}</td>
                    <td>{r.nuovaData ? format(r.nuovaData) : ''}</td>
                    <td>{r.nuovoOrario ? format(r.nuovoOrario) : ''}</td>
                    <td>{r.nuovaDurataOre || ''}</td>
                    <td style={{ maxWidth:220 }}>{r.noteStudente || ''}</td>
                    <td style={{
                      fontWeight:600,
                      color: w.includes('24') ? '#c62828' : w.includes('72') ? '#ed6c02' : '#4d647f'
                    }}>{w}</td>
                    <td>{format(r.createdAt)}</td>
                    <td style={{ display:'flex', gap:6 }}>
                      {['pending','in_review'].includes(r.stato) && (
                        <>
                          {r.stato !== 'in_review' && (
                            <button
                              disabled={busyId === r.id}
                              onClick={()=>act(r,'in_review')}
                              style={miniBtn('#f0f9ff','#0369a1')}
                            >
                              In review
                            </button>
                          )}
                          <button
                            disabled={busyId === r.id}
                            onClick={()=>act(r,'approve')}
                            style={miniBtn(r.tipo === 'cancellazione' ? '#e6f9ec' : '#d1fae5', '#117a2f')}
                            title={r.tipo === 'cancellazione'
                              ? 'Approva subito (cancellazione)'
                              : 'Apri modale approvazione / modifica'}
                          >✔</button>
                          <button
                            disabled={busyId === r.id}
                            onClick={()=>act(r,'reject')}
                            style={miniBtn('#fdecef','#b81f3d')}
                          >✖</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalRichiesta && (
        <ApprovaRichiestaModal
          richiesta={modalRichiesta}
          onClose={() => setModalRichiesta(null)}
          onApproved={() => {
            setModalRichiesta(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function miniBtn(bg, color) {
  return {
    background:bg,
    color,
    border:"1px solid "+color+"55",
    padding:"4px 10px",
    borderRadius:8,
    fontSize:11,
    cursor:"pointer",
    fontWeight:600,
    minWidth:68
  };
}