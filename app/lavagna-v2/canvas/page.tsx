// @ts-nocheck
"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";

// Carica il canvas solo client-side (usa canvas API)
const LavagnaCanvasV2 = dynamic(
  () => import("../../components/lavagna-v2/LavagnaCanvas"),
  { ssr: false, loading: () => <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>Caricamento lavagna…</div> }
);

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iP(ad|hone|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function LavagnaV2Page() {
  const { data: session, status } = useSession();
  const [lavagna, setLavagna] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attivitaId, setAttivitaId] = useState("");
  const [canvasH, setCanvasH] = useState(
    typeof window !== "undefined"
      ? (window.visualViewport?.height ?? window.innerHeight) - 52
      : 700
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iosFull, setIosFull] = useState(false);

  // ── Resize ────────────────────────────────────────────────────────────────
  const updateSize = useCallback(() => {
    const vvh = window.visualViewport?.height ?? window.innerHeight;
    setCanvasH(vvh - (iosFull ? 0 : 52));
  }, [iosFull]);

  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    window.visualViewport?.addEventListener("resize", updateSize);
    return () => {
      window.removeEventListener("resize", updateSize);
      window.visualViewport?.removeEventListener("resize", updateSize);
    };
  }, [updateSize]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
      setTimeout(updateSize, 100);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, [updateSize]);

  useEffect(() => {
    function onPageShow(e) { if (e.persisted) window.location.reload(); }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // ── Load lavagna ──────────────────────────────────────────────────────────
  const load = useCallback(async (attId?: string, lavId?: string) => {
    setLoading(true);
    setError(null);
    try {
      let url: string;
      if (attId) {
        url = `/api/lavagna-v2?attivitaId=${attId}`;
      } else if (lavId) {
        url = `/api/lavagna-v2?lavagnaId=${lavId}`;
      } else {
        setError("Parametro mancante");
        setLoading(false);
        return;
      }
      const r = await fetch(url, { cache: "no-store" });
      const js = await r.json();
      if (r.ok) setLavagna(js.lavagna);
      else setError(js.error || "Errore caricamento lavagna");
    } catch {
      setError("Errore di rete");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    const qp = new URLSearchParams(window.location.search);
    const attId = qp.get("attivitaId");
    const lavId = qp.get("lavagnaId");
    if (attId) { setAttivitaId(attId); load(attId); }
    else if (lavId) { load(undefined, lavId); }
    else setError("Nessun parametro fornito. Torna alla lista lavagne.");
  }, [status, load]);


  // ── Fullscreen ─────────────────────────────────────────────────────────────
  function toggleFullscreen() {
    if (isIOS()) { setIosFull(v => !v); setTimeout(updateSize, 50); return; }
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document).catch(() => {});
    } else {
      const el = document.documentElement;
      (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el).catch(() => {});
    }
  }

  // ── States ────────────────────────────────────────────────────────────────
  if (status === "loading") return <FullPage><Spinner text="Caricamento sessione…" /></FullPage>;
  if (!session) return <FullPage><div style={{ color: "#ef4444", fontWeight: 600 }}>Non autenticato</div></FullPage>;
  if (error) return <FullPage><ErrorBox msg={error} /></FullPage>;
  if (loading || !lavagna) return <FullPage><Spinner text="Caricamento lavagna…" /></FullPage>;

  const isAdmin = session.user?.role === "admin" || session.user?.role === "operatore";
  const titolo = isAdmin
    ? (lavagna.titoloVisuale || lavagna.titolo || "Lavagna")
    : (lavagna.titolo || "Lavagna");
  const canvasHFinal = iosFull
    ? (typeof window !== "undefined" ? (window.visualViewport?.height ?? window.innerHeight) : 700)
    : canvasH;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh", overflow: "hidden", background: "#f9fafb" }}>

      {/* ── Top bar ── */}
      {!iosFull && (
        <div style={{
          height: 52, background: "#fff", borderBottom: "1px solid #e5e7eb",
          display: "flex", alignItems: "center", padding: "0 16px", gap: 12,
          flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          {/* Back */}
          <button
            onClick={() => window.location.href = "/lavagna-v2"}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "6px 8px", borderRadius: 8 }}
            title="Torna alla lista"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Indietro
          </button>

          {/* Title */}
          <div style={{ flex: 1, fontWeight: 600, fontSize: 14, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {titolo}
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 6, borderRadius: 8, display: "flex", alignItems: "center" }}
            title={isFullscreen ? "Esci da schermo intero" : "Schermo intero"}
          >
            {isFullscreen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
            )}
          </button>
        </div>
      )}

      {/* ── Canvas ── */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <LavagnaCanvasV2
          lavagnaId={lavagna.id}
          attivitaId={attivitaId}
          trattiIniziali={lavagna.tratti || []}
          formeIniziali={lavagna.forme || []}
          utenteId={session.user?.id}
          clienteId={session.user?.clienteId}
          ruolo={session.user?.role || "cliente"}
          altezza={canvasHFinal}
          canStudentDraw={lavagna.canStudentDraw ?? false}
          cursorLabel={session.user?.cursorLabel || undefined}
        />
      </div>
    </div>
  );
}

// ── Helpers UI ────────────────────────────────────────────────────────────────

function FullPage({ children }) {
  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
      {children}
    </div>
  );
}

function Spinner({ text }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, color: "#6b7280" }}>
      {/* Arc spinner with glow */}
      <div style={{ position: 'relative', width: 52, height: 52 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          border: '4px solid #e5e7eb',
          borderTopColor: '#1cb0f6',
          borderRightColor: '#58cc02',
          animation: 'lv2-spin 1s cubic-bezier(0.4,0,0.2,1) infinite',
        }} />
        {/* Mini pencil in center */}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
          style={{ position: 'absolute', top: 16, left: 16, animation: 'lv2-pulse 1s ease-in-out infinite' }}>
          <rect x="7" y="2" width="6" height="11" rx="2" fill="#1cb0f6"/>
          <polygon points="7,13 13,13 10,18" fill="#fbbf24"/>
        </svg>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', letterSpacing: '0.02em' }}>{text}</div>
      <style>{`
        @keyframes lv2-spin { to { transform: rotate(360deg) } }
        @keyframes lv2-pulse { 0%,100%{opacity:0.6;transform:scale(0.9)} 50%{opacity:1;transform:scale(1.1)} }
      `}</style>
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{ maxWidth: 420, background: "#fff", borderRadius: 12, padding: "28px 24px", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", textAlign: "center", border: "1px solid #fee2e2" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 8 }}>Accesso non disponibile</div>
      <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>{msg}</div>
      <button
        onClick={() => window.history.back()}
        style={{ marginTop: 20, padding: "8px 20px", borderRadius: 8, background: "#0078d4", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
      >
        Torna indietro
      </button>
    </div>
  );
}
