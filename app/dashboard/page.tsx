// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
import Link from 'next/link';

function resetForm() {
  return { testo: '', clienteIds: [], date: '', time: '' };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [richiestePending, setRichiestePending] = useState(0);
  const [loading, setLoading] = useState(true);

  const [note, setNote] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [noteLoading, setNoteLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(resetForm());
  const [formSaving, setFormSaving] = useState(false);
  const [clientiSearch, setClientiSearch] = useState('');

  const isAdmin = ['admin', 'operatore'].includes(session?.user?.role);

  useEffect(() => {
    if (!session) return;

    fetch('/api/modifiche')
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data.richieste) ? data.richieste : [];
        setRichiestePending(arr.filter(r => ['pending', 'in_review'].includes(r.stato)).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch('/api/note')
      .then(r => r.ok ? r.json() : [])
      .then(data => setNote(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setNoteLoading(false));

    // Tutti i clienti senza filtro di tipo — il filtro tipo=REFERENTE esclude
    // clienti il cui campo tipo non è impostato o è diverso da REFERENTE
    fetch('/api/clienti')
      .then(r => r.ok ? r.json() : [])
      .then(data => setClienti(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [session]);

  function sortNote(arr) {
    return [...arr].sort((a, b) => {
      if (a.data && b.data) return new Date(a.data) - new Date(b.data);
      if (a.data) return -1;
      if (b.data) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  async function handleAddNota(e) {
    e.preventDefault();
    if (!form.testo.trim()) return;
    setFormSaving(true);

    // Combina data + ora in un ISO string (o null se assente)
    const dataISO = form.date
      ? new Date(`${form.date}T${form.time || '00:00'}`).toISOString()
      : null;

    // Se nessun cliente selezionato → una nota senza cliente
    // Se più clienti → una nota per ciascuno
    const targets = form.clienteIds.length > 0 ? form.clienteIds : [null];
    const nuove = [];

    try {
      for (const cid of targets) {
        const res = await fetch('/api/note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testo: form.testo,
            clienteId: cid || null,
            data: dataISO,
          }),
        });
        if (res.ok) nuove.push(await res.json());
      }
      if (nuove.length > 0) {
        setNote(prev => sortNote([...prev, ...nuove]));
        setForm(resetForm());
        setClientiSearch('');
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

  function toggleCliente(id) {
    setForm(prev => ({
      ...prev,
      clienteIds: prev.clienteIds.includes(id)
        ? prev.clienteIds.filter(x => x !== id)
        : [...prev.clienteIds, id],
    }));
  }

  if (!isAdmin) {
    if (typeof window !== 'undefined') router.replace('/profilo');
    return null;
  }

  const clientiFiltrati = clienti.filter(c =>
    !clientiSearch ||
    c.nomeReferente?.toLowerCase().includes(clientiSearch.toLowerCase())
  );

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── NOTE E PROMEMORIA ── */}
          <Card title="Note e Promemoria">
            {showForm ? (
              <form onSubmit={handleAddNota} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Testo */}
                  <textarea
                    autoFocus
                    placeholder="Testo del promemoria..."
                    value={form.testo}
                    onChange={e => setForm(p => ({ ...p, testo: e.target.value }))}
                    required
                    style={{
                      width: '100%', minHeight: 80, padding: 10,
                      border: '1px solid #c4b5fd', borderRadius: 8, fontSize: 14,
                      fontFamily: 'inherit', resize: 'vertical', background: '#faf5ff',
                      boxSizing: 'border-box',
                    }}
                  />

                  {/* Data + Ora */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 160px' }}>
                      <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>
                        Data (opzionale – appare nel calendario)
                      </label>
                      <input
                        type="date"
                        value={form.date}
                        onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                        style={{
                          width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0',
                          borderRadius: 8, fontSize: 14, background: '#fff', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ flex: '1 1 130px' }}>
                      <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>
                        Ora (opzionale)
                      </label>
                      <input
                        type="time"
                        value={form.time}
                        onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                        disabled={!form.date}
                        style={{
                          width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0',
                          borderRadius: 8, fontSize: 14,
                          background: form.date ? '#fff' : '#f8fafc',
                          color: form.date ? '#1e293b' : '#94a3b8',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {/* Selezione clienti (multipla) */}
                  <div>
                    <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>
                      Clienti (opzionale – seleziona uno o più)
                      {form.clienteIds.length > 0 && (
                        <span style={{
                          marginLeft: 8, background: '#7C3AED', color: '#fff',
                          borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700,
                        }}>
                          {form.clienteIds.length} selezionat{form.clienteIds.length === 1 ? 'o' : 'i'}
                        </span>
                      )}
                    </label>

                    {clienti.length === 0 ? (
                      <div style={{ fontSize: 13, color: '#94a3b8', padding: '8px 0' }}>
                        Nessun cliente disponibile
                      </div>
                    ) : (
                      <div style={{
                        border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden',
                      }}>
                        {/* Ricerca */}
                        <div style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                          <input
                            type="text"
                            placeholder="Cerca cliente…"
                            value={clientiSearch}
                            onChange={e => setClientiSearch(e.target.value)}
                            style={{
                              width: '100%', border: 'none', background: 'transparent',
                              fontSize: 13, outline: 'none', padding: '2px 4px',
                            }}
                          />
                        </div>
                        {/* Lista checkbox */}
                        <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                          {clientiFiltrati.length === 0 ? (
                            <div style={{ padding: '10px 12px', fontSize: 13, color: '#94a3b8' }}>
                              Nessun risultato
                            </div>
                          ) : clientiFiltrati.map(c => (
                            <label key={c.id} style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '8px 12px', cursor: 'pointer',
                              background: form.clienteIds.includes(c.id) ? '#f5f3ff' : '#fff',
                              borderBottom: '1px solid #f1f5f9',
                            }}>
                              <input
                                type="checkbox"
                                checked={form.clienteIds.includes(c.id)}
                                onChange={() => toggleCliente(c.id)}
                                style={{ width: 15, height: 15, accentColor: '#7C3AED', cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: 14, color: '#1e293b' }}>
                                {c.nomeReferente}
                              </span>
                              {c.tipo === 'STUDENTE' && (
                                <span style={{
                                  fontSize: 10, color: '#64748b', background: '#f1f5f9',
                                  borderRadius: 6, padding: '1px 6px', marginLeft: 'auto',
                                }}>
                                  studente
                                </span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="submit"
                      disabled={formSaving || !form.testo.trim()}
                      style={{
                        background: '#7C3AED', color: '#fff', border: 'none',
                        borderRadius: 8, padding: '9px 20px', fontWeight: 600,
                        fontSize: 14, cursor: formSaving ? 'not-allowed' : 'pointer',
                        opacity: formSaving || !form.testo.trim() ? 0.6 : 1,
                      }}
                    >
                      {formSaving
                        ? 'Salvataggio…'
                        : form.clienteIds.length > 1
                          ? `Salva per ${form.clienteIds.length} clienti`
                          : 'Salva nota'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); setForm(resetForm()); setClientiSearch(''); }}
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
                  <NotaCard key={n.id} nota={n} onDelete={() => handleDeleteNota(n.id)} />
                ))}
              </div>
            )}
          </Card>

          {/* ── AZIONI RAPIDE ── */}
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
              📅 {dateStr}{isPast ? ' (passata)' : ''}
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
