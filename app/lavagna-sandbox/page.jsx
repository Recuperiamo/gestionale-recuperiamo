"use client";
import React, { useEffect, useMemo, useState } from "react";
import LavagnaCanvas from "../components/lavagna/LavagnaCanvas";

const stubStrokeResponse = (body) => {
  try {
    const payload = JSON.parse(body || "{}");
    return {
      tratto: {
        id: payload.id || `stub-${Date.now()}`,
        colore: payload.colore || "#20489a",
        spessore: payload.spessore || 3,
        punti: payload.punti || [],
        strumento: payload.strumento || "penna",
        autoreUserId: payload.autoreUserId || "sandbox-user"
      }
    };
  } catch (_) {
    return { tratto: null };
  }
};

const stubShapeResponse = (body) => {
  try {
    const payload = JSON.parse(body || "{}");
    return {
      shape: {
        id: payload.id || `shape-${Date.now()}`,
        ...payload
      }
    };
  } catch (_) {
    return { shape: null };
  }
};

export default function LavagnaSandboxPage() {
  const [mounted, setMounted] = useState(false);
  const [ruolo, setRuolo] = useState('admin');
  const [spectatorWanted, setSpectatorWanted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__lavagnaSandboxFetchPatched) {
      setMounted(true);
      return;
    }
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
      const url = typeof input === "string" ? input : input?.url || "";
      if (url.startsWith("/api/lavagna/tratto")) {
        const response = stubStrokeResponse(init.body);
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (url.startsWith("/api/lavagna/shape")) {
        const response =
          init?.method === "DELETE"
            ? { ok: true }
            : stubShapeResponse(init.body);
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (url.startsWith("/api/lavagna")) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (url.startsWith("/api/ably/token")) {
        // allow lavagna to operate offline by returning 403 which component tolerates
        return new Response(JSON.stringify({ error: "sandbox" }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
      return originalFetch(input, init);
    };
    window.__lavagnaSandboxFetchPatched = true;
    setMounted(true);
    return () => {
      window.fetch = originalFetch;
      delete window.__lavagnaSandboxFetchPatched;
    };
  }, []);

  // Aggiorna localStorage spectator sulla modifica
  useEffect(() => {
    const key = `lavagna:spectator:sandbox-attivita:sandbox-user`;
    try {
      if (ruolo !== 'admin' && spectatorWanted) {
        localStorage.setItem(key, '1');
      } else {
        localStorage.removeItem(key);
      }
    } catch(_) {}
  }, [ruolo, spectatorWanted]);

  const props = useMemo(() => ({
    lavagnaId: "sandbox-lavagna",
    attivitaId: "sandbox-attivita",
    trattiIniziali: [],
    utenteId: "sandbox-user",
    clienteId: "sandbox-cliente",
    ruolo,
    altezza: 640,
    openInNewWindow: false,
    isNewLavagna: true
  }), [ruolo]);

  if (!mounted) {
    return (
      <main style={styles.wrapper}>
        <h1 style={styles.title}>Lavagna Sandbox</h1>
        <p style={styles.subtitle}>Inizializzazione…</p>
      </main>
    );
  }

  return (
    <main style={styles.wrapper}>
      <h1 style={styles.title}>Lavagna Sandbox</h1>
      <p style={styles.subtitle}>
        Test locale dell&apos;interazione canvas senza backend o realtime.
      </p>
      <div style={styles.controls}>
        <label style={styles.ctrlLabel}>Ruolo:
          <select value={ruolo} onChange={(e)=>setRuolo(e.target.value)} style={styles.select}>
            <option value="admin">admin</option>
            <option value="studente">studente</option>
          </select>
        </label>
        <label style={styles.ctrlLabel}>
          <input
            type="checkbox"
            disabled={ruolo==='admin'}
            checked={spectatorWanted}
            onChange={(e)=>setSpectatorWanted(e.target.checked)}
          /> modalità spettatore
        </label>
        <small style={styles.hint}>In modalità spettatore (studente) il click mostra il puntatore laser.</small>
      </div>
      <div style={styles.canvasContainer}>
        <LavagnaCanvas {...props} />
      </div>
    </main>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "#f1f5ff",
    padding: "40px 24px",
    color: "#1f3d7a",
    fontFamily: "'Inter','Segoe UI',sans-serif"
  },
  title: {
    fontSize: 34,
    fontWeight: 800,
    marginBottom: 8
  },
  subtitle: {
    marginBottom: 20,
    fontSize: 16,
    maxWidth: 640,
    lineHeight: 1.5
  },
  canvasContainer: {
    maxWidth: 1200,
    margin: "0 auto",
    background: "#fff",
    padding: 24,
    borderRadius: 18,
    boxShadow: "0 22px 48px rgba(15,52,135,0.18)"
  }
  ,controls: {
    maxWidth: 1200,
    margin: '0 auto 20px',
    background: '#fff',
    padding: '16px 20px',
    borderRadius: 16,
    boxShadow: '0 10px 28px rgba(15,52,135,0.12)',
    display: 'flex',
    gap: 20,
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  ctrlLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1f3d7a',
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  select: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #c9d9f3',
    background: '#f8fbff',
    fontWeight: 600
  },
  hint: {
    fontSize: 12,
    fontWeight: 500,
    color: '#3559a8'
  }
};
