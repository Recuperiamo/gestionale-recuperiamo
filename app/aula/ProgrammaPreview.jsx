"use client";
console.log('[INIT] ProgrammaPreview');
import React, { useEffect, useState } from 'react';

export default function ProgrammaPreview({ clienteId, coloreTema = '#1cb0f6', materie = [], onOpenProgramma = () => {}, noTopPadding = false }) {
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
    <div style={{ background: '#fff', borderRadius: 12, padding: noTopPadding ? '0 12px 12px 12px' : 12, border: '1px solid #eef6ff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingLeft: 6 }}>
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
      {/* Do not show a global 'Nessun argomento ancora.' message; we show per-materia placeholders instead */}

      {!loading && (
        <div style={{ display: 'grid', gap: 10 }}>
          {materieToShow.map((mat) => {
            const list = (byMateria[mat] || []);
            // pick latest item for preview
            const latest = list.slice().sort((a, b) => new Date(b.data || b.createdAt) - new Date(a.data || a.createdAt))[0];
            return (
              <div key={mat} style={{ borderRadius: 8, padding: 8, background: '#fbfdff', border: '1px solid #eef6ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, color: coloreTema }}>{mat}</div>
                  <div style={{ fontSize: 12, color: '#6b7b9a' }}>{list.length} recenti</div>
                </div>
                {/* single preview row with date + description (or placeholder if none) */}
                <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 52, height: 34, borderRadius: 6, background: `${coloreTema}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: coloreTema, fontWeight: 700 }}>
                    {latest && (latest.data ? new Date(latest.data).getDate() : new Date(latest.createdAt).getDate())}
                  </div>
                  <div>
                    {latest ? (
                      <>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{latest.titolo}</div>
                        {latest.descrizione && <div style={{ fontSize: 12, color: '#6b7b9a' }}>{latest.descrizione.slice(0, 120)}{latest.descrizione.length > 120 ? '…' : ''}</div>}
                      </>
                    ) : (
                      <div style={{ color: '#64748b', fontSize: 13 }}>Nessun argomento registrato per questa materia.</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
