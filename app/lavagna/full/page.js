"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import LavagnaCanvas from "../../components/lavagna/LavagnaCanvas";

export default function LavagnaFullScreenPage() {
  const { data: session, status } = useSession();
  const [lavagna, setLavagna] = useState(null);
  const [loading, setLoading] = useState(false);
  const [canvasH, setCanvasH] = useState(
    typeof window !== "undefined" ? window.innerHeight - 90 : 700
  );
  const [attivitaId, setAttivitaId] = useState("");

  useEffect(() => {
    function onResize() {
      setCanvasH(window.innerHeight - 90);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  return (
    <div style={root}>
      <div style={topBar}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          {lavagna
            ? `Lavagna lezione ${displayTitle}`
            : attivitaId
              ? "Lavagna lezione"
              : "Lavagna"}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={btn}
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              } else {
                document.documentElement.requestFullscreen().catch(() => {});
              }
            }}
          >
            Fullscreen
          </button>
          <button style={btn} onClick={() => window.close()}>
            Chiudi
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: "12px 22px", fontSize: 14 }}>
          Caricamento lavagna…
        </div>
      )}

      {!loading && lavagna && (
        <div style={{ flex: 1, padding: "0 22px 22px" }}>
          <LavagnaCanvas
            lavagnaId={lavagna.id}
            attivitaId={lavagna.attivitaId}
            trattiIniziali={lavagna.tratti}
            formeIniziali={lavagna.forme}
            utenteId={session.user.id}
            ruolo={session.user.role}
            altezza={canvasH}
            openInNewWindow={false}
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
  color: "#20489a"
};
const topBar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 20,
  padding: "16px 22px 14px",
  background: "#ffffff",
  borderBottom: "1px solid #dbe6f5",
  boxShadow: "0 2px 8px rgba(32,72,154,0.10)",
  fontSize: 14
};
const btn = {
  background: "#e3eefe",
  color: "#20489a",
  border: "1px solid #4268b3",
  padding: "8px 16px",
  fontWeight: 600,
  fontSize: 13,
  borderRadius: 10,
  cursor: "pointer"
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