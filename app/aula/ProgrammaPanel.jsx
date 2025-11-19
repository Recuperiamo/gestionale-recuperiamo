"use client";
console.log('[INIT] ProgrammaPanel');
import React, { useEffect, useState, useRef } from 'react';
import { MATERIE_AULA as MATERIE_AULA_DEFAULT } from '../../lib/materie';
import dynamic from 'next/dynamic';
const CalendarioAttivita = dynamic(() => import('../components/calendario/CalendarioAttivita'), { ssr: false });
import { useSession } from 'next-auth/react';
import { getAblyChannelAsync } from '../lib/realtime/ablyClient';

export default function ProgrammaPanel({ clienteId, coloreTema = '#1cb0f6', isAdmin = false, hideAside = false, materie = [], asideTop = 96 }) {
  const { data: session } = useSession();
  const [programmi, setProgrammi] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({ titolo: '', materia: '', descrizione: '', data: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ titolo: '', materia: '', descrizione: '', data: '' });
  const [verificaForm, setVerificaForm] = useState({ titolo: '', materia: '', data: '', descrizione: '' });

  async function load() {
    if (!clienteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/programma?clienteId=${clienteId}`);
      const js = await res.json();
      setProgrammi(Array.isArray(js) ? js : []);
    } catch (e) {
      setProgrammi([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (clienteId) load(); }, [clienteId]);

  useEffect(() => {
    if (!clienteId) return;

    let cleanupAbly = () => {};

    (async () => {
      try {
        const channel = await getAblyChannelAsync(`programma:${clienteId}`);
        
        const onNew = ({ data }) => {
          const programma = data.programma;
          if (!programma) return;
          setProgrammi(prev => [programma, ...prev.filter(p => p.id !== programma.id)]);
        };
        const onDelete = ({ data }) => {
          const programmaId = data.programmaId;
          setProgrammi(prev => prev.filter(p => p.id !== Number(programmaId)));
        };

        channel.subscribe('new-programma', onNew);
        channel.subscribe('delete-programma', onDelete);

        cleanupAbly = () => {
          channel.unsubscribe('new-programma', onNew);
          channel.unsubscribe('delete-programma', onDelete);
          channel.detach();
        };
      } catch (error) {
        console.error("Failed to subscribe to Ably channel:", error);
      }
    })();

    return () => {
      cleanupAbly();
    };
  }, [clienteId]);

  async function publishProgrammaUpdate(programma) {
    try {
      const channel = await getAblyChannelAsync(`programma:${clienteId}`);
      channel.publish('new-programma', { programma });
    } catch (error) {
      console.error("Failed to publish Ably message:", error);
    }
  }

  async function publishProgrammaDelete(programmaId) {
    try {
      const channel = await getAblyChannelAsync(`programma:${clienteId}`);
      channel.publish('delete-programma', { programmaId });
    } catch (error) {
      console.error("Failed to publish Ably message:", error);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.titolo.trim()) return alert('Titolo obbligatorio');
    try {
      const payload = { ...form, clienteId };
      const res = await fetch('/api/programma', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const js = await res.json();
      if (!res.ok) throw new Error(js?.error || 'Errore');
      setOpenNew(false);
      setForm({ titolo: '', materia: '', descrizione: '', data: '' });
      await load();
      publishProgrammaUpdate(js.programma);
    } catch (err) {
      alert('Errore salvataggio: ' + err.message);
    }
  }

  async function handleCreateVerifica(e) {
    e.preventDefault();
    if (!verificaForm.titolo.trim()) return alert('Titolo obbligatorio');
    try {
      const payload = { 
        clienteId, 
        titolo: `Verifica: ${verificaForm.titolo}`, 
        materia: verificaForm.materia, 
        descrizione: verificaForm.descrizione, 
        data: verificaForm.data ? new Date(verificaForm.data).toISOString() : null,
        isVerifica: true
      };
      const res = await fetch('/api/programma', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const js = await res.json();
      if (!res.ok) {
        console.error('[ProgrammaPanel] create verifica error', js);
        throw new Error(js?.error || 'Errore');
      }
      
      try {
        const orarioIso = verificaForm.data ? new Date(verificaForm.data).toISOString() : undefined;
        await fetch('/api/attivita/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clienteId, descrizione: `Verifica: ${verificaForm.titolo}`, orario: orarioIso, durataOre: 1 }) });
      } catch (e) { /* ignore calendar sync error */ }

      setVerificaForm({ titolo: '', materia: '', data: '', descrizione: '' });
      await load();
      publishProgrammaUpdate(js.programma);

    } catch (err) {
      alert('Errore salvataggio verifica: ' + err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questo elemento?')) return;
    try {
      const res = await fetch(`/api/programma?id=${id}`, { method: 'DELETE' });
      const js = await res.json();
      if (!res.ok) throw new Error(js?.error || 'Errore');
      await load();
      publishProgrammaDelete(id);
    } catch (err) {
      alert('Errore eliminazione: ' + err.message);
    }
  }

  function editInit(item) {
    setEditingItem(item);
    setEditForm({ titolo: item.titolo || '', materia: item.materia || '', descrizione: item.descrizione || '', data: item.data ? (new Date(item.data)).toISOString().slice(0,10) : '' });
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!editingItem) return;
    if (!editForm.titolo.trim()) return alert('Titolo obbligatorio');
    try {
      const payload = { id: editingItem.id, ...editForm };
      const res = await fetch('/api/programma', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const js = await res.json();
      if (!res.ok) throw new Error(js?.error || 'Errore');
      setEditingItem(null);
      setEditForm({ titolo: '', materia: '', descrizione: '', data: '' });
      await load();
      publishProgrammaUpdate(js.programma);
    } catch (err) {
      alert('Errore aggiornamento: ' + err.message);
    }
  }

  const recenti = () => (programmi || []).slice(0,5);

  const materieList = (() => {
    if (Array.isArray(materie) && materie.length > 0) return materie;
    const fromDb = Array.from(new Set((programmi || []).map(p => p.materia).filter(Boolean)));
    if (fromDb.length > 0) return fromDb;
    return MATERIE_AULA_DEFAULT || [];
  })();

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <div style={{ flex: 1 }}>
        {loading && <div>Caricamento…</div>}
          {!loading && (
            <div>
            <div style={{ background: '#fff', padding: 12, borderRadius: 10, border: '1px solid #eef2ff', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 800, color: coloreTema }}>Registro verifiche</div>
                <div>
                </div>
              </div>
              <form onSubmit={handleCreateVerifica} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 140px', gap: 10, alignItems: 'center' }}>
                <input placeholder="Titolo verifica" value={verificaForm.titolo} onChange={e => setVerificaForm(prev => ({ ...prev, titolo: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: '1px solid #eef2ff' }} />
                <select value={verificaForm.materia} onChange={e => setVerificaForm(prev => ({ ...prev, materia: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: '1px solid #eef2ff' }}>
                  <option value="">Materia (opzionale)</option>
                  {materieList.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input type="date" value={verificaForm.data} onChange={e => setVerificaForm(prev => ({ ...prev, data: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: '1px solid #eef2ff' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" style={{ padding: '8px 12px', background: coloreTema, color: '#fff', borderRadius: 8 }}>{isAdmin ? 'Aggiungi verifica' : 'Segnala'}</button>
                </div>
              </form>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {materieList.map((m) => {
                const listForMateria = (programmi || []).filter(p => (p.materia || '').toLowerCase() === (m || '').toLowerCase()).sort((a,b) => new Date(a.data || a.createdAt) - new Date(b.data || b.createdAt));
                return (
                  <div key={m} style={{ background: '#fff', padding: 12, borderRadius: 10, border: '1px solid #eef2ff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontWeight: 800, color: coloreTema }}>{m || '—'}</div>
                      <div>
                        {isAdmin && (
                          <button onClick={() => { setOpenNew(true); setForm(prev => ({ ...prev, materia: m })); }} style={{ padding: '6px 10px', borderRadius: 6 }}>+ Nuovo</button>
                        )}
                      </div>
                    </div>
                    {listForMateria.length === 0 ? (
                      <div style={{ color: '#64748b', fontSize: 13, minHeight: 60, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[1, 2, 3].map((_,r) => (
                          <div key={r} style={{ display:'grid', gridTemplateColumns: '76px 1fr', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed #f0f4ff' }}>
                            <div style={{ textAlign: 'left', fontSize: 12, color: '#6b7b9a' }}>—</div>
                            <div style={{ color:'#64748b', fontSize:13 }}>—</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {listForMateria.map(p => (
                          <div key={p.id} style={{ padding: '10px 8px', borderBottom: '1px dashed #f0f4ff', display:'grid', gridTemplateColumns: '76px 1fr', gap: 12, alignItems:'center' }}>
                            <div style={{ fontSize:12, color:'#6b7b9a', fontWeight:700, minWidth: 76, textAlign: 'left' }}>
                              <div style={{ background: `${coloreTema}10`, padding:'8px', borderRadius:6, display:'inline-block', minWidth:56, textAlign:'center' }}>
                                {(p.data && new Date(p.data).toLocaleDateString('it-IT')) || (p.createdAt && new Date(p.createdAt).toLocaleDateString('it-IT')) || ''}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontWeight:700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {p.titolo}
                                {isAdmin && (
                                  <button onClick={() => editInit(p)} style={{ marginLeft: 8, padding: '4px 8px', fontSize: 12, background: '#eef2ff', border: '1px solid #e6eefc', borderRadius: 6, cursor: 'pointer' }}>Modifica</button>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: '#6b7b9a' }}>{p.descrizione}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {!hideAside && (
        <aside style={{ width: 320 }}>
          <div style={{ position: 'sticky', top: asideTop }}>
            <div style={{ background: '#fff', padding: 12, borderRadius: 10, border: '1px solid #eef2ff' }}>
              <h4 style={{ marginTop: 0 }}>Argomenti recenti</h4>
              <ul style={{ padding: 0, listStyle: 'none' }}>
                {recenti().map(p => (
                  <li key={p.id} style={{ padding: '8px 0', borderBottom: '1px dashed #f0f4ff' }}>
                    <div style={{ fontWeight: 700 }}>{p.titolo}</div>
                    <div style={{ fontSize: 12, color: '#6b7b9a' }}>{p.materia || '—'}</div>
                  </li>
                ))}
              </ul>
              {isAdmin && (
                <div style={{ marginTop: 12 }}>
                  <CalendarioAttivita forceClienteId={clienteId} initialMode="week" allowModeSwitch={false} enableAdminRequests={false} />
                </div>
              )}
            </div>
          </div>
        </aside>
      )}

      {openNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,64,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <form onSubmit={handleCreate} style={{ background: '#fff', padding: 20, borderRadius: 12, width: 'min(92%,720px)', boxShadow: '0 18px 40px rgba(16,24,64,0.35)' }}>
            <h3 style={{ marginTop: 0, marginBottom: 6, color: coloreTema, fontSize: 20 }}>Aggiungi un nuovo argomento svolto</h3>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>Inserisci titolo, materia e una breve descrizione (opzionale).</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <input placeholder="Titolo" value={form.titolo} onChange={e => setForm({ ...form, titolo: e.target.value })} required style={{ padding: 10, borderRadius: 8, border: '1px solid #eef2ff' }} />
              <input placeholder="Materia" value={form.materia} onChange={e => setForm({ ...form, materia: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #eef2ff' }} />
              <textarea placeholder="Descrizione" value={form.descrizione} onChange={e => setForm({ ...form, descrizione: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid #eef2ff', minHeight: 120 }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setOpenNew(false)} style={{ padding: '9px 14px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #e6eefc' }}>Annulla</button>
                <button type="submit" style={{ padding: '9px 14px', background: coloreTema, color: '#fff', borderRadius: 8, boxShadow: `0 6px 18px ${coloreTema}33` }}>Salva</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {editingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,64,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1210 }}>
          <form onSubmit={handleUpdate} style={{ background: '#fff', padding: 18, borderRadius: 10, width: 640 }}>
            <h3 style={{ marginTop: 0 }}>Modifica elemento Programma</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              <input placeholder="Titolo" value={editForm.titolo} onChange={e => setEditForm({ ...editForm, titolo: e.target.value })} required style={{ padding: 8 }} />
              <input placeholder="Materia" value={editForm.materia} onChange={e => setEditForm({ ...editForm, materia: e.target.value })} style={{ padding: 8 }} />
              <textarea placeholder="Descrizione" value={editForm.descrizione} onChange={e => setEditForm({ ...editForm, descrizione: e.target.value })} style={{ padding: 8, minHeight: 120 }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setEditingItem(null)} style={{ padding: '8px 12px' }}>Annulla</button>
                <button type="submit" style={{ padding: '8px 12px', background: coloreTema, color: '#fff', borderRadius: 8 }}>Aggiorna</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

