"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Navbar from "../components/Navbar";
import LavagnaCanvas from "../components/lavagna/LavagnaCanvas";
import LavagneList from "../components/lavagna/LavagneList";

export default function PaginaLavagna() {
  const { data: session, status } = useSession();
  const [lavagna, setLavagna] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attivitaId, setAttivitaId] = useState("");

  async function carica(id) {
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
      carica(id);
    }
  }, [status]);

  function handleLavagnaSelect(lavagna) {
    setAttivitaId(lavagna.attivitaId);
    setLavagna(lavagna);
  }

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f8ff" }}>
        <Navbar />
        <div style={{ padding: 50 }}>Caricamento…</div>
      </div>
    );
  }
  if (!session) return null;

  // DEBUG: Mostra tutto l'oggetto session.user per capire dove trovare il clienteId corretto
  console.log("DEBUG session.user:", session.user);

  // FIX: Usa clienteId di test se admin e clienteId non valorizzato
  let clienteId = session.user?.clienteId;
  if (!clienteId && session.user?.role === "admin") {
    clienteId = 1; // <-- sostituisci con l'id del cliente da testare
  }
  console.log("DEBUG clienteId passato a LavagneList:", clienteId);

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
    <div style={{ minHeight: "100vh", background: "#f5f8ff" }}>
      <Navbar />
      <main style={mainStyle}>
        <h1 style={titolo}>Lavagna Interattiva</h1>
<LavagneList clienteId={clienteId} onSelect={handleLavagnaSelect} sessionUser={session.user} />
        {!attivitaId && !lavagna && (
          <div style={infoBox}>
            Nessuna lavagna selezionata. Apri una lezione dal calendario con ALT+click
            per creare/visualizzare la sua lavagna.
          </div>
        )}

        {loading && (
          <div style={{ fontSize: 14, marginTop: 10 }}>Caricamento lavagna…</div>
        )}

        {lavagna && (
          <div style={{ marginTop: 10 }}>
            <div style={headerLine}>Lavagna lezione {displayTitle}</div>
            <LavagnaCanvas
              lavagnaId={lavagna.id}
              attivitaId={lavagna.attivitaId}
              trattiIniziali={lavagna.tratti}
              utenteId={session.user.id}
              ruolo={session.user.role}
              altezza={600}
              openInNewWindow={true}
            />
          </div>
        )}
      </main>
    </div>
  );
}

const mainStyle = {
  maxWidth: 1200,
  margin: "40px auto 60px",
  background: "#fff",
  borderRadius: 26,
  padding: "38px 46px 54px",
  boxShadow: "0 6px 34px rgba(32,72,154,0.15)",
  fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
  color: "#20489a"
};
const titolo = { margin: "0 0 18px", fontSize: 34, fontWeight: 800 };
const headerLine = {
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 12
};
const infoBox = {
  background: "#e3eefe",
  border: "1px solid #4268b3",
  color: "#20489a",
  padding: "12px 16px",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 600
};