"use client";
import React, { useEffect, useState } from 'react';

export default function ProgrammaPreview({ clienteId, coloreTema = '#1cb0f6', materie = [], onOpenProgramma = () => {} }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clienteId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/programma?clienteId=${clienteId}&limit=20`);
        const js = await res.json();
        if (!cancelled) setItems(Array.isArray(js) ? js : []);
      } catch (e) {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [clienteId]);

  // Group items by materia
  const byMateria = {};
  for (const it of items) {
    const m = it.materia || '—';
    if (!byMateria[m]) byMateria[m] = [];
    byMateria[m].push(it);
  }

  // Decide which materie to show: if parent passed materie array use them all, otherwise take all keys
  const materieToShow = (Array.isArray(materie) && materie.length > 0)
    ? materie
    : Object.keys(byMateria);

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 12, border: '1px solid #eef6ff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="18" height="16" rx="2" stroke={coloreTema} strokeWidth="1.6" />
            <path d="M16 3V7" stroke={coloreTema} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M8 3V7" stroke={coloreTema} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <strong style={{ color: coloreTema }}>Argomenti recenti</strong>
        </div>
        <button type="button" onClick={onOpenProgramma} style={{ fontSize: 13, color: coloreTema, background: 'none', border: 'none', cursor: 'pointer' }}>Apri</button>
      </div>

      {loading && <div style={{ color: '#6b7b9a' }}>Caricamento…</div>}
      {!loading && items.length === 0 && (
        <div style={{ color: '#6b7b9a' }}>Nessun argomento ancora.</div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ display: 'grid', gap: 10 }}>
          {materieToShow.map((mat) => {
            const list = (byMateria[mat] || []).slice(0, 5);
            return (
              <div key={mat} style={{ borderRadius: 8, padding: 8, background: '#fbfdff', border: '1px solid #eef6ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, color: coloreTema }}>{mat}</div>
                  <div style={{ fontSize: 12, color: '#6b7b9a' }}>{list.length} recenti</div>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {list.map(i => (
                    <li key={i.id} style={{ display: 'flex', gap: 8, padding: '6px 0', borderTop: '1px solid #f2f8ff' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 6, background: `${coloreTema}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: coloreTema, fontWeight: 700 }}>
                        {i.data ? new Date(i.data).getDate() : '•'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{i.titolo}</div>
                        {i.descrizione && <div style={{ fontSize: 12, color: '#6b7b9a' }}>{i.descrizione.slice(0, 80)}{i.descrizione.length > 80 ? '…' : ''}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
