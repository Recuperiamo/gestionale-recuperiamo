"use client";
import React, { useEffect, useState } from 'react';

export default function ProgrammaPreview({ clienteId, coloreTema = '#1cb0f6' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clienteId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/programma?clienteId=${clienteId}&limit=6`);
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

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 12, border: '1px solid #eef6ff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ color: coloreTema }}>Argomenti recenti</strong>
        <a href={clienteId ? `/aula/${clienteId}/programma` : '#'} style={{ fontSize: 13, color: coloreTema }}>Apri</a>
      </div>
      {loading && <div style={{ color: '#6b7b9a' }}>Caricamento…</div>}
      {!loading && items.length === 0 && (
        <div style={{ color: '#6b7b9a' }}>Nessun argomento ancora.</div>
      )}
      {!loading && items.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.slice(0,5).map(i => (
            <li key={i.id} style={{ padding: '8px 0', borderBottom: '1px dashed #f0f4ff' }}>
              <div style={{ fontWeight: 700 }}>{i.titolo}</div>
              <div style={{ fontSize: 12, color: '#6b7b9a' }}>{i.materia || '—'}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
