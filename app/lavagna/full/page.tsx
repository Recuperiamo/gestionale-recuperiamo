// @ts-nocheck
"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import LavagnaCanvas from "../../components/lavagna/LavagnaCanvas";

// Rileva iOS Safari (requestFullscreen non supportato)
function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iP(ad|hone|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

const TOP_BAR_H_DESKTOP = 54;
const TOP_BAR_H_MOBILE = 44;

export default function LavagnaFullScreenPage() {
  const { data: session, status } = useSession();
  const [lavagna, setLavagna] = useState(null);
  const [loading, setLoading] = useState(false);
  const [canvasActions, setCanvasActions] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);
  const [canvasH, setCanvasH] = useState(
    typeof window !== "undefined"
      ? (window.visualViewport?.height ?? window.innerHeight) - TOP_BAR_H_DESKTOP
      : 700
  );
  const [attivitaId, setAttivitaId] = useState("");
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  // iOS: pseudo-fullscreen (nascondi topbar)
  const [iosFull, setIosFull] = useState(false);
  const topBarH = isMobile ? TOP_BAR_H_MOBILE : TOP_BAR_H_DESKTOP;

  const updateSize = useCallback(() => {
    const mobile = window.innerWidth <= 768;
    setIsMobile(mobile);
    const barH = mobile ? TOP_BAR_H_MOBILE : TOP_BAR_H_DESKTOP;
    const vvh = window.visualViewport?.height ?? window.innerHeight;
    setCanvasH(vvh - barH);
  }, []);

  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    window.visualViewport?.addEventListener("resize", updateSize);
    return () => {
      window.removeEventListener("resize", updateSize);
      window.visualViewport?.removeEventListener("resize", updateSize);
    };
  }, [updateSize]);

  // Traccia stato fullscreen nativo
  useEffect(() => {
    function onFsChange() {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(isFs);
      // Quando si entra in fullscreen, ricalcola altezza
      setTimeout(updateSize, 100);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, [updateSize]);

  // Previeni bfcache: se la pagina viene ripristinata dalla cache del browser (tasto Indietro/Avanti),
  // ricarica completamente per evitare flash di vecchi contenuti lavagna
  useEffect(() => {
    function onPageShow(e) {
      if (e.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Chiudi menu export cliccando fuori
  useEffect(() => {
    if (!showExportMenu) return;
    function onClickOutside(e) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showExportMenu]);

  function toggleFullscreen() {
    if (isIOS()) {
      // iOS Safari: nessuna API fullscreen — usa pseudo-fullscreen (nascondi topbar)
      setIosFull(v => !v);
      setTimeout(updateSize, 50);
      return;
    }
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document).catch(() => {});
    } else {
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      req?.call(el).catch(() => {});
    }
  }

  async function load(id) {
    if (!id) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/lavagna?attivitaId=${id}`, { cache: "no-store" });
      const js = await r.json();
      if (r.ok) setLavagna(js.lavagna);
      else console.error(js.error);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    const qp = new URLSearchParams(window.location.search);
    const id = qp.get("attivitaId");
    if (id) {
      setAttivitaId(id);
      load(id);
    }
  }, [status]);

  if (status === "loading") return <div style={fsWrap}>Caricamento sessione…</div>;
  if (!session) return <div style={fsWrap}>Non autenticato</div>;

  const isAdmin = /^(admin|operatore)$/i.test(session.user.role || "");
  const titoloBase = lavagna?.titolo || "";
  let titoloAdmin = lavagna?.titoloVisuale || titoloBase;
  if (
    isAdmin &&
    lavagna?.nomeStudente &&
    !titoloAdmin.includes(" – ") &&
    lavagna.titolo !== ` – ${lavagna.nomeStudente}`
  ) {
    titoloAdmin = `${titoloBase} – ${lavagna.nomeStudente}`;
  }
  const displayTitle = isAdmin ? titoloAdmin : titoloBase;

  const pseudoFull = iosFull; // iOS pseudo-fullscreen attivo
  const canvasHFinal = pseudoFull
    ? (typeof window !== "undefined" ? (window.visualViewport?.height ?? window.innerHeight) : 700)
    : canvasH;

  return (
    <div style={{
      ...root,
      ...(pseudoFull && {
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999,
        background: "#fff"
      })
    }}>
      {/* Topbar: nascosta in pseudo-fullscreen iOS */}
      {!pseudoFull && (
        <div style={{
          ...topBar,
          height: topBarH,
          padding: isMobile ? "0 10px" : "0 22px",
          minHeight: topBarH,
          flexShrink: 0,
        }}>
          <div style={{ fontWeight: 800, fontSize: isMobile ? 13 : 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60vw" }}>
            {lavagna
              ? `Lavagna ${displayTitle}`
              : attivitaId
                ? "Lavagna lezione"
                : "Lavagna"}
          </div>
          <div style={{ display: "flex", gap: isMobile ? 6 : 10, flexShrink: 0 }}>
            <button
              style={{ ...btn, padding: isMobile ? "5px 10px" : "8px 16px", fontSize: isMobile ? 12 : 13 }}
              onClick={toggleFullscreen}
              title={isFullscreen ? "Esci da schermo intero" : "Schermo intero"}
            >
              {isFullscreen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/><polyline points="15 9 21 3"/><polyline points="9 15 3 21"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              )}
              {!isMobile && <span style={{ marginLeft: 6 }}>{isFullscreen ? "Esci" : "Fullscreen"}</span>}
            </button>
            {canvasActions && (
              <div ref={exportMenuRef} style={{ position: "relative" }}>
                <button
                  style={{ ...btn, padding: isMobile ? "5px 10px" : "8px 16px", fontSize: isMobile ? 12 : 13 }}
                  onClick={() => setShowExportMenu(v => !v)}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {!isMobile && <span style={{ marginLeft: 6 }}>Esporta</span>}
                </button>
                {showExportMenu && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0,
                    background: "#fff", borderRadius: 10, border: "1px solid #dbe6f5",
                    boxShadow: "0 12px 28px rgba(15,36,92,0.18)",
                    display: "flex", flexDirection: "column", overflow: "hidden",
                    zIndex: 200, minWidth: 140,
                  }}>
                    <button style={exportItem} onClick={() => { setShowExportMenu(false); canvasActions.esportaPNG(); }}>
                      Scarica PNG
                    </button>
                    <button style={exportItem} onClick={() => { setShowExportMenu(false); canvasActions.esportaPDF(); }}>
                      Scarica PDF
                    </button>
                  </div>
                )}
              </div>
            )}
            {canvasActions?.spectatorIndicatorVisible && (
              <div
                style={{
                  ...eyeBadge,
                  cursor: canvasActions.onToggleSpectator ? 'pointer' : 'default',
                }}
                onClick={() => canvasActions.onToggleSpectator?.()}
                title={canvasActions.spectatorIndicatorTitle || 'Modalità spettatore'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5c-5 0-9 4.5-9 7s4 7 9 7 9-4.5 9-7-4-7-9-7zm0 12c-2.757 0-5-2.016-5-4.5S9.243 8 12 8s5 2.016 5 4.5S14.757 17 12 17zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" fill="#20489a"/>
                </svg>
                {canvasActions.isAdmin && canvasActions.spectatorCount > 0 && (
                  <span style={eyeCount}>{canvasActions.spectatorCount}</span>
                )}
              </div>
            )}
            {!isMobile && (
              <button style={btn} onClick={() => window.close()}>Chiudi</button>
            )}
          </div>
        </div>
      )}

      {/* Pulsante uscita iOS pseudo-fullscreen */}
      {pseudoFull && (
        <button
          onClick={() => { setIosFull(false); setTimeout(updateSize, 50); }}
          style={{
            position: "fixed", top: 8, right: 8, zIndex: 10001,
            background: "rgba(20,53,120,0.75)", color: "#fff",
            border: "none", borderRadius: 8, padding: "6px 10px",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            backdropFilter: "blur(4px)",
          }}
        >
          ✕ Esci
        </button>
      )}

      {loading && (
        <div style={{ padding: "12px 22px", fontSize: 14 }}>
          Caricamento lavagna…
        </div>
      )}

      {!loading && lavagna && (
        <div style={{ flex: 1, padding: isMobile || pseudoFull ? 0 : "0 22px 22px", overflow: "hidden" }}>
          <LavagnaCanvas
            lavagnaId={lavagna.id}
            attivitaId={lavagna.attivitaId}
            clienteId={lavagna.clienteId}
            trattiIniziali={lavagna.tratti}
            formeIniziali={lavagna.forme}
            utenteId={session.user.id}
            ruolo={session.user.role}
            altezza={canvasHFinal}
            openInNewWindow={false}
            topRightPlacement="external"
            onActionsChange={setCanvasActions}
          />
        </div>
      )}

      {!loading && !lavagna && (
        <div style={{ padding: "40px 22px", fontSize: 14 }}>
          Nessuna lavagna caricata (aggiungi ?attivitaId= nella URL).
        </div>
      )}
    </div>
  );
}

const root = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  background: "#f5f8ff",
  fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
  color: "#20489a",
  overflow: "hidden",
};
const topBar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  background: "#ffffff",
  borderBottom: "1px solid #dbe6f5",
  boxShadow: "0 2px 8px rgba(32,72,154,0.10)",
  fontSize: 14,
  boxSizing: "border-box",
};
const btn = {
  background: "#e3eefe",
  color: "#20489a",
  border: "1px solid #4268b3",
  padding: "8px 16px",
  fontWeight: 600,
  fontSize: 13,
  borderRadius: 10,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  flexShrink: 0,
};
const fsWrap = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
  background: "#f5f8ff",
  color: "#20489a",
  fontWeight: 600
};
const exportItem = {
  padding: "10px 16px",
  background: "transparent",
  border: "none",
  textAlign: "left",
  cursor: "pointer",
  fontSize: 13,
  color: "#20489a",
  fontWeight: 500,
};
const eyeBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(32,72,154,0.12)",
  border: "1px solid rgba(32,72,154,0.2)",
  color: "#20489a",
  fontSize: 12,
  fontWeight: 600,
  position: "relative",
};
const eyeCount = {
  fontSize: 12,
  fontWeight: 600,
};