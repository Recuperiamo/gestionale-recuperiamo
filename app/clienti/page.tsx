// @ts-nocheck
'use client';

import React, { useState, useEffect } from "react";
import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
import Alert from '../components/Alert';
import ClientiForm from '../components/clienti/ClientiForm';
import AdminOnly from '../components/auth/AdminOnly';
import dynamic from 'next/dynamic';
const PacchettiClienteList = dynamic(() => import('../components/clienti/PacchettiClienteList'), { ssr: false });

// ─── card studente/referente ──────────────────────────────────────────────────

function ClienteCard({ cliente, onEdit, onDelete }) {
  const [showPacchetti, setShowPacchetti] = useState(false);
  const nome = cliente.nomeReferente || cliente.nome || "-";
  const initial = nome.charAt(0).toUpperCase();
  const isStudente = cliente.tipo === 'STUDENTE';
  const color = cliente.coloreTema || (isStudente ? '#1cb0f6' : '#64748b');
  const referenteNome = cliente.referente?.nomeReferente || cliente.referente?.email || null;
  const studenti = Array.isArray(cliente.studenti) ? cliente.studenti : [];
  const materie = Array.isArray(cliente.materie) ? cliente.materie : [];

  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      border: '1px solid #e2e8f0', background: '#fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header colorato */}
      <div style={{ background: color, padding: '16px 16px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 20, color: '#fff', flexShrink: 0,
        }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {nome}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 }}>
            {isStudente ? 'Studente' : 'Referente'}
            {isStudente && referenteNome && ` · ref. ${referenteNome}`}
            {!isStudente && studenti.length > 0 && ` · ${studenti.length} stud.`}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Materie */}
        {isStudente && materie.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {materie.map(m => (
              <span key={m} style={{
                background: `${color}18`, color,
                border: `1px solid ${color}40`,
                borderRadius: 20, padding: '2px 9px',
                fontSize: 11, fontWeight: 600,
              }}>
                {m}
              </span>
            ))}
          </div>
        )}

        {/* Studenti collegati (referente) */}
        {!isStudente && studenti.length > 0 && (
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {studenti.map(s => s.nomeReferente || s.email || `#${s.id}`).join(', ')}
          </div>
        )}

        {/* Contatti */}
        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.8 }}>
          {cliente.email && <div>✉️ {cliente.email}</div>}
          {cliente.telefono && <div>📞 {cliente.telefono}</div>}
        </div>

        {/* Azioni */}
        <div style={{ marginTop: 'auto', paddingTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {isStudente && (
            <a href={`/aula/${cliente.id}`} style={linkBtn(color)}>Aula</a>
          )}
          <button
            onClick={() => setShowPacchetti(p => !p)}
            style={actionBtn(showPacchetti ? '#7C3AED' : '#475569')}
          >
            Pacchetti {showPacchetti ? '▲' : '▼'}
          </button>
          {isStudente && cliente.linkVideolezione && (
            <a href={cliente.linkVideolezione} target="_blank" rel="noopener noreferrer" style={linkBtn('#0ea5e9')}>
              Videolezione
            </a>
          )}
          <button onClick={() => onEdit(cliente)} style={actionBtn('#475569')}>✏️ Modifica</button>
          <button onClick={() => onDelete(cliente.id)} style={actionBtn('#ef4444')}>Elimina</button>
        </div>
      </div>

      {/* Pacchetti espandibili */}
      {showPacchetti && (
        <div style={{ borderTop: '1px solid #e2e8f0', padding: '12px 14px', background: '#fafafa' }}>
          <PacchettiClienteList clienteId={cliente.id} />
        </div>
      )}
    </div>
  );
}

const linkBtn = (color) => ({
  display: 'inline-flex', alignItems: 'center',
  background: `${color}15`, color, border: `1px solid ${color}40`,
  borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600,
  textDecoration: 'none', cursor: 'pointer',
});
const actionBtn = (color) => ({
  display: 'inline-flex', alignItems: 'center',
  background: `${color}12`, color, border: `1px solid ${color}30`,
  borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600,
  cursor: 'pointer',
});

// ─── pagina ───────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  nome: '', cognome: '', email: '', telefono: '', indirizzo: '',
  cf: '', piva: '', note: '', tipo: 'REFERENTE',
  referenteId: '', materie: [], coloreTema: '', linkVideolezione: ''
};

export default function ClientiPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [alert, setAlert] = useState({ message: '', type: 'error' });
  const [loading, setLoading] = useState(false);
  const [clienti, setClienti] = useState([]);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('tutti'); // tutti | STUDENTE | REFERENTE

  useEffect(() => { fetchClienti(); }, []);

  const fetchClienti = async () => {
    try {
      const res = await fetch('/api/clienti?includeStudenti=1');
      const data = await res.json();
      setClienti(Array.isArray(data) ? data : []);
    } catch {
      setAlert({ message: 'Errore di rete', type: 'error' });
    }
  };

  const mapFormToApi = (formData) => {
    const tipo = (formData.tipo || 'REFERENTE').toUpperCase();
    // Per studenti: nomeReferente = nome + cognome (nome completo per display)
    const nomeReferente = tipo === 'STUDENTE' && formData.cognome?.trim()
      ? `${formData.nome?.trim()} ${formData.cognome?.trim()}`.trim()
      : formData.nome?.trim() || '';
    return {
      nomeReferente,
      nome: tipo === 'STUDENTE' ? (formData.nome?.trim() || null) : null,
      cognome: tipo === 'STUDENTE' ? (formData.cognome?.trim() || null) : null,
      email: formData.email,
      telefono: formData.telefono,
      indirizzo: formData.indirizzo,
      codiceFiscale: formData.cf,
      partitaIva: formData.piva,
      note: formData.note,
      tipo,
      referenteId: tipo === 'STUDENTE' && formData.referenteId ? Number(formData.referenteId) : null,
      materie: tipo === 'STUDENTE' ? (formData.materie || []) : [],
      coloreTema: tipo === 'STUDENTE' ? (formData.coloreTema || null) : null,
      linkVideolezione: tipo === 'STUDENTE' ? (formData.linkVideolezione || null) : null,
    };
  };

  const handleAdd = async (formData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/clienti', {
        method: 'POST',
        body: JSON.stringify(mapFormToApi(formData)),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) { setAlert({ message: data.error || 'Errore inatteso', type: 'error' }); setLoading(false); return; }
      setAlert({ message: 'Cliente creato con successo!', type: 'success' });
      setShowModal(false);
      fetchClienti();
    } catch { setAlert({ message: 'Errore di rete', type: 'error' }); }
    setLoading(false);
  };

  const handleEdit = (cliente) => {
    const tipoCliente = (cliente.tipo || 'REFERENTE').toUpperCase();
    setForm({
      nome: tipoCliente === 'STUDENTE' ? (cliente.nome || cliente.nomeReferente?.split(' ')[0] || '') : (cliente.nomeReferente || cliente.nome || ''),
      cognome: tipoCliente === 'STUDENTE' ? (cliente.cognome || '') : '',
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      indirizzo: cliente.indirizzo || '',
      cf: cliente.codiceFiscale || cliente.cf || '',
      piva: cliente.partitaIva || cliente.piva || '',
      note: cliente.note || '',
      tipo: (cliente.tipo || 'REFERENTE').toUpperCase(),
      referenteId: cliente.referenteId ? String(cliente.referenteId) : '',
      materie: Array.isArray(cliente.materie) ? cliente.materie : [],
      coloreTema: cliente.coloreTema || '',
      linkVideolezione: cliente.linkVideolezione || '',
    });
    setEditId(cliente.id);
    setAlert({ message: '', type: 'error' });
    setShowModal(true);
  };

  const handleUpdate = async (formData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/clienti', {
        method: 'PUT',
        body: JSON.stringify({ ...mapFormToApi(formData), id: editId }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) { setAlert({ message: data.error || 'Errore inatteso', type: 'error' }); setLoading(false); return; }
      setAlert({ message: 'Cliente aggiornato!', type: 'success' });
      setEditId(null);
      setShowModal(false);
      fetchClienti();
    } catch { setAlert({ message: 'Errore di rete', type: 'error' }); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo cliente?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/clienti', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) { setAlert({ message: data.error || 'Errore eliminazione', type: 'error' }); setLoading(false); return; }
      setAlert({ message: 'Cliente eliminato!', type: 'success' });
      fetchClienti();
    } catch { setAlert({ message: 'Errore di rete', type: 'error' }); }
    setLoading(false);
  };

  const handleFormSubmit = (data) => editId ? handleUpdate(data) : handleAdd(data);

  const clientiFiltrati = clienti.filter(c => {
    const nome = (c.nomeReferente || c.nome || '').toLowerCase();
    const matchSearch = !search || nome.includes(search.toLowerCase());
    const matchTipo = tipoFilter === 'tutti' || c.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  const nStudenti = clienti.filter(c => c.tipo === 'STUDENTE').length;
  const nReferenti = clienti.filter(c => c.tipo === 'REFERENTE').length;

  return (
    <AuthGuard>
      <AdminOnly redirectTo="/profilo">
        <Navbar />
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert({ message: '', type: 'error' })}
        />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1e3a5f' }}>Clienti</h1>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                {nStudenti} studenti · {nReferenti} referenti
              </div>
            </div>
            <button
              onClick={() => { setForm(EMPTY_FORM); setEditId(null); setAlert({ message: '', type: 'error' }); setShowModal(true); }}
              style={{
                background: '#1cb0f6', color: '#fff', border: 'none',
                borderRadius: 10, padding: '10px 20px',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(28,176,246,0.3)',
              }}
            >
              + Nuovo cliente
            </button>
          </div>

          {/* Filtri */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Cerca per nome…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, minWidth: 200, padding: '8px 12px',
                border: '1px solid #e2e8f0', borderRadius: 10,
                fontSize: 14, outline: 'none',
              }}
            />
            {['tutti', 'STUDENTE', 'REFERENTE'].map(t => (
              <button
                key={t}
                onClick={() => setTipoFilter(t)}
                style={{
                  padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: '1px solid ' + (tipoFilter === t ? '#1cb0f6' : '#e2e8f0'),
                  background: tipoFilter === t ? '#1cb0f6' : '#fff',
                  color: tipoFilter === t ? '#fff' : '#475569',
                }}
              >
                {t === 'tutti' ? 'Tutti' : t === 'STUDENTE' ? 'Studenti' : 'Referenti'}
              </button>
            ))}
          </div>

          {/* Card grid */}
          {clientiFiltrati.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 48, fontSize: 15 }}>
              Nessun cliente trovato
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}>
              {clientiFiltrati.map(c => (
                <ClienteCard
                  key={c.id}
                  cliente={c}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modal crea/modifica */}
        {showModal && (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
              zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 16,
            }}
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <div style={{
              background: '#fff', borderRadius: 16,
              width: '100%', maxWidth: 560,
              maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              padding: '24px 24px 16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e3a5f' }}>
                  {editId ? 'Modifica cliente' : 'Nuovo cliente'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
              <ClientiForm
                onAdd={handleFormSubmit}
                form={form}
                setForm={setForm}
                editId={editId}
                setEditId={setEditId}
                loading={loading}
                setAlert={setAlert}
                clienti={clienti}
              />
            </div>
          </div>
        )}
      </AdminOnly>
    </AuthGuard>
  );
}
