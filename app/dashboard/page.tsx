// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [richiestePending, setRichiestePending] = useState(0);
  const [loading, setLoading] = useState(true);

  // Note state
  const [note, setNote] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [noteLoading, setNoteLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formTesto, setFormTesto] = useState('');
  const [formClienteId, setFormClienteId] = useState('');
  const [formData, setFormData] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  const isAdmin = ['admin', 'operatore'].includes(session?.user?.role);

  useEffect(() => {
    if (!session) return;
    // Carica solo il conteggio richieste pending
    fetch('/api/modifiche')
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data.richieste) ? data.richieste : [];
        setRichiestePending(arr.filter(r => ['pending', 'in_review'].includes(r.stato)).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Carica note e lista clienti in parallelo
    Promise.all([
      fetch('/api/note').then(r => r.json()),
      fetch('/api/clienti').then(r => r.json()),
    ]).then(([noteData, clientiData]) => {
      setNote(Array.isArray(noteData) ? noteData : []);
      setClienti(Array.isArray(clientiData) ? clientiData : []);
    }).catch(() => {}).finally(() => setNoteLoading(false));
  }, [session]);

  async function handleAddNota(e) {
    e.preventDefault();
    if (!formTesto.trim()) return;
    setFormSaving(true);
    try {
      const res = await fetch('/api/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testo: formTesto,
          clienteId: formClienteId || null,
          data: formData || null,
        }),
      });
      if (res.ok) {
        const nuova = await res.json();
        setNote(prev => {
          const aggiornate = [...prev, nuova];
          // Ordina: prima quelle con data (asc), poi quelle senza (per createdAt desc)
          return aggiornate.sort((a, b) => {
            if (a.data && b.data) return new Date(a.data) - new Date(b.data);
            if (a.data) return -1;
            if (b.data) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
          });
        });
        setFormTesto('');
        setFormClienteId('');
        setFormData('');
        setShowForm(false);
      }
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDeleteNota(id) {
    await fetch(`/api/note/${id}`, { method: 'DELETE' });
    setNote(prev => prev.filter(n => n.id !== id));
  }

  if (!isAdmin) {
    if (typeof window !== 'undefined') router.replace('/profilo');
    return null;
  }

  return (
    <AuthGuard>
      <Navbar />
      <main style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '32px 24px',
        background: '#f8fafc',
        minHeight: '100vh',
      }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 16, color: '#64748b' }}>
            Benvenuto, {session?.user?.name || 'Admin'}
          </p>
        </div>

        {/* Badge richieste pending */}
        {!loading && richiestePending > 0 && (
          <Link href="/richieste" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: '#fee2e2', border: '2px solid #ef4444',
              borderRadius: 10, padding: '12px 20px', marginBottom: 28,
              cursor: 'pointer',
            }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <span style={{ fontWeight: 700, color: '#b91c1c', fontSize: 15 }}>
                {richiestePending} richiesta{richiestePending > 1 ? 'e' : ''} in attesa di revisione
              </span>
              <span style={{ color: '#b91c1c', fontSize: 13 }}>→ Vai alle richieste</span>
            </div>
          </Link>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: 24,
        }}>
          {/* ── NOTE E PROMEMORIA ── */}
          <div style={{ gridColumn: '1 / -1' }}>
            <Card title="Note e Promemoria">
              {/* Form aggiungi nota */}
              {showForm ? (
                <form onSubmit={handleAddNota} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <textarea
                      autoFocus
                      placeholder="Testo del promemoria..."
                      value={formTesto}
                      onChange={e => setFormTesto(e.target.value)}
                      required
                      style={{
                        width: '100%', minHeight: 80, padding: 10,
                        border: '1px solid #c4b5fd', borderRadius: 8, fontSize: 14,
                        fontFamily: 'inherit', resize: 'vertical', background: '#faf5ff',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 200px' }}>
                        <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>
                          Cliente (opzionale)
                        </label>
                        <select
                          value={formClienteId}
                          onChange={e => setFormClienteId(e.target.value)}
                          style={{
                            width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0',
                            borderRadius: 8, fontSize: 14, background: '#fff',
                          }}
                        >
                          <option value="">— Nessun cliente —</option>
                          {clienti.filter(c => c.tipo !== 'STUDENTE').map(c => (
                            <option key={c.id} value={c.id}>{c.nomeReferente}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: '1 1 180px' }}>
                        <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>
                          Data/ora (opzionale – appare nel calendario)
                        </label>
                        <input
                          type="datetime-local"
                          value={formData}
                          onChange={e => setFormData(e.target.value)}
                          style={{
                            width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0',
                            borderRadius: 8, fontSize: 14, background: '#fff',
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="submit"
                        disabled={formSaving || !formTesto.trim()}
                        style={{
                          background: '#7C3AED', color: '#fff', border: 'none',
                          borderRadius: 8, padding: '9px 20px', fontWeight: 600,
                          fontSize: 14, cursor: formSaving ? 'not-allowed' : 'pointer',
                          opacity: formSaving ? 0.7 : 1,
                        }}
                      >
                        {formSaving ? 'Salvataggio…' : 'Salva nota'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowForm(false); setFormTesto(''); setFormClienteId(''); setFormData(''); }}
                        style={{
                          background: '#f1f5f9', color: '#64748b', border: 'none',
                          borderRadius: 8, padding: '9px 16px', fontWeight: 500,
                          fontSize: 14, cursor: 'pointer',
                        }}
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: '#f5f3ff', color: '#7C3AED',
                    border: '2px dashed #c4b5fd', borderRadius: 10,
                    padding: '10px 18px', fontWeight: 600, fontSize: 14,
                    cursor: 'pointer', marginBottom: 16, width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: 18 }}>+</span> Aggiungi promemoria
                </button>
              )}

              {/* Lista note */}
              {noteLoading ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                  Caricamento note…
                </div>
              ) : note.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontStyle: 'italic' }}>
                  Nessun promemoria. Aggiungine uno con il pulsante sopra.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {note.map(n => (
                    <NotaCard
                      key={n.id}
                      nota={n}
                      onDelete={() => handleDeleteNota(n.id)}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ── AZIONI RAPIDE ── */}
          <div style={{ gridColumn: '1 / -1' }}>
            <Card title="Azioni Rapide">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
              }}>
                <QuickLink href="/attivita" icon="➕" label="Crea Nuova Lezione" />
                <QuickLink href="/clienti" icon="👤" label="Gestisci Clienti" />
                <QuickLink href="/pacchetti" icon="📦" label="Gestisci Pacchetti" />
                <QuickLink href="/calendario" icon="📅" label="Visualizza Calendario" />
                <QuickLink href="/richieste" icon="📋" label="Vedi Richieste" />
                <QuickLink href="/storico" icon="📊" label="Storico Attività" />
              </div>
            </Card>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}

function NotaCard({ nota, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasDate = !!nota.data;
  const isPast = hasDate && new Date(nota.data) < new Date();
  const dateStr = hasDate
    ? new Date(nota.data).toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      background: isPast ? '#f8fafc' : '#faf5ff',
      border: `1px solid ${isPast ? '#e2e8f0' : '#e9d5ff'}`,
      borderLeft: `4px solid ${isPast ? '#94a3b8' : '#7C3AED'}`,
      borderRadius: 8, padding: '12px 14px',
      opacity: isPast ? 0.75 : 1,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.5, wordBreak: 'break-word' }}>
          {nota.testo}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {nota.cliente && (
            <Link href={`/clienti/${nota.cliente.id}`} style={{ textDecoration: 'none' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#dbeafe', color: '#1d4ed8',
                fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
              }}>
                👤 {nota.cliente.nomeReferente}
              </span>
            </Link>
          )}
          {dateStr && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: isPast ? '#f1f5f9' : '#ede9fe',
              color: isPast ? '#64748b' : '#6d28d9',
              fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 12,
            }}>
              📅 {dateStr} {isPast ? '(passata)' : ''}
            </span>
          )}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {confirmDelete ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={onDelete}
              style={{
                background: '#ef4444', color: '#fff', border: 'none',
                borderRadius: 6, padding: '4px 10px', fontSize: 12,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Conferma
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                background: '#f1f5f9', color: '#64748b', border: 'none',
                borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
              }}
            >
              Annulla
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            title="Elimina nota"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94a3b8', fontSize: 16, padding: '2px 6px', borderRadius: 4,
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 24,
      boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)',
    }}>
      <h2 style={{
        fontSize: 18, fontWeight: 600, color: '#1e293b',
        marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #e2e8f0',
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function QuickLink({ href, icon, label }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', background: '#f8fafc', borderRadius: 8,
      textDecoration: 'none', color: '#1e293b', fontWeight: 500,
      fontSize: 14, border: '1px solid #e2e8f0',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = '#3b82f6';
      e.currentTarget.style.color = '#fff';
      e.currentTarget.style.borderColor = '#3b82f6';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = '#f8fafc';
      e.currentTarget.style.color = '#1e293b';
      e.currentTarget.style.borderColor = '#e2e8f0';
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
