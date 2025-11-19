"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { io } from 'socket.io-client';

export default function ProgrammaPanel({ clienteId, coloreTema = '#1cb0f6', isAdmin = false }) {
  const { data: session } = useSession();
  const [programmi, setProgrammi] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({ titolo: '', materia: '', descrizione: '', data: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ titolo: '', materia: '', descrizione: '', data: '' });
  const socketRef = useRef(null);

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
    const socket = io(undefined, { path: '/api/socketio' });
    socketRef.current = socket;
    socket.emit('join:programma', { clienteId });

    const onNew = ({ programma }) => {
      if (!programma) return;
      setProgrammi(prev => [programma, ...prev.filter(p => p.id !== programma.id)]);
    };
    const onDelete = ({ programmaId }) => setProgrammi(prev => prev.filter(p => p.id !== Number(programmaId)));

    socket.on('new-programma', onNew);
    socket.on('delete-programma', onDelete);

    return () => {
      try {
        socket.off('new-programma', onNew);
        socket.off('delete-programma', onDelete);
        socket.disconnect();
      } catch (e) {}
    };
  }, [clienteId]);

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
      try { socketRef.current && socketRef.current.emit('new-programma', { programma: js.programma, clienteId }); } catch (e) {}
    } catch (err) {
      alert('Errore salvataggio: ' + err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questo elemento?')) return;
    try {
      const res = await fetch(`/api/programma?id=${id}`, { method: 'DELETE' });
      const js = await res.json();
      if (!res.ok) throw new Error(js?.error || 'Errore');
      await load();
      try { socketRef.current && socketRef.current.emit('delete-programma', { programmaId: id, clienteId }); } catch (e) {}
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
      try { socketRef.current && socketRef.current.emit('new-programma', { programma: js.programma, clienteId }); } catch (e) {}
    } catch (err) {
      alert('Errore aggiornamento: ' + err.message);
    }
  }

  const recenti = () => (programmi || []).slice(0,5);

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Programma</h3>
          {isAdmin && <button onClick={() => setOpenNew(true)} style={{ padding: '8px 12px', borderRadius: 8 }}>+ Nuovo</button>}
        </div>
        {loading && <div>Caricamento…</div>}
        {!loading && (
          <div>
            {programmi.length === 0 ? (
              <div style={{ padding: 18, borderRadius: 8, background: '#fff' }}>Nessun elemento nel programma.</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {programmi.map(p => (
                  <li key={p.id} style={{ marginBottom: 14, background: '#fff', padding: 12, borderRadius: 10, border: '1px solid #e6eefc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{p.titolo}</strong> {p.materia ? `— ${p.materia}` : ''}
                        <div style={{ fontSize: 13, color: '#556' }}>{p.descrizione}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => navigator.clipboard?.writeText(p.titolo)} style={{ padding: '6px 8px' }}>Copia</button>
                        {isAdmin && (
                          <>
                            <button onClick={() => editInit(p)} style={{ padding: '6px 8px' }}>Modifica</button>
                            <button onClick={() => handleDelete(p.id)} style={{ padding: '6px 8px', color: '#c33' }}>Elimina</button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <aside style={{ width: 320 }}>
        <div style={{ position: 'sticky', top: 96 }}>
          <div style={{ background: '#fff', padding: 12, borderRadius: 10, border: '1px solid #eef2ff' }}>
            <h4 style={{ marginTop: 0 }}>Argomenti recenti</h4>
            {programmi.length === 0 && <div style={{ color: '#6b7b9a' }}>Nessun argomento</div>}
            <ul style={{ padding: 0, listStyle: 'none' }}>
              {recenti().map(p => (
                <li key={p.id} style={{ padding: '8px 0', borderBottom: '1px dashed #f0f4ff' }}>
                  <div style={{ fontWeight: 700 }}>{p.titolo}</div>
                  <div style={{ fontSize: 12, color: '#6b7b9a' }}>{p.materia || '—'}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

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
