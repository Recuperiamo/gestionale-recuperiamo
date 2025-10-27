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

  const props = useMemo(
    () => ({
      lavagnaId: "sandbox-lavagna",
      attivitaId: "sandbox-attivita",
      trattiIniziali: [],
      utenteId: "sandbox-user",
      clienteId: "sandbox-cliente",
      ruolo: "admin",
      altezza: 640,
      openInNewWindow: false,
      isNewLavagna: true
    }),
    []
  );

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
};
