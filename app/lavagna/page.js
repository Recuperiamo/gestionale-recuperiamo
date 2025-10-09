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
  const [clienti, setClienti] = useState([]);
  const [clienteId, setClienteId] = useState("");

  const isAdmin = /^(admin|operatore)$/i.test(session?.user?.role || "");

  // Carica clienti solo per admin
  useEffect(() => {
    if (status === "authenticated" && isAdmin) {
      fetch("/api/clienti")
        .then(r => r.json())
        .then(data => {
          // DEBUG: logga la risposta dei clienti per capire cosa arriva
          console.log("DEBUG clienti:", data);
          if (Array.isArray(data.clienti)) {
            setClienti(data.clienti);
          } else if (Array.isArray(data)) {
            setClienti(data);
          } else {
            setClienti([]);
          }
        })
        .catch(e => {
          console.error("ERRORE fetch clienti:", e);
          setClienti([]);
        });
    }
  }, [status, isAdmin]);

  // Imposta clienteId automatico per clienti normali
  useEffect(() => {
    if (status === "authenticated" && !isAdmin) {
      setClienteId(session?.user?.clienteId || "");
    }
  }, [status, isAdmin, session]);

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
    carica(lavagna.attivitaId);
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
  console.log("DEBUG clienteId passato a LavagneList:", clienteId);

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
        {isAdmin && (
          <div style={{ marginBottom: 20 }}>
            <label>
              <span style={{ fontWeight: 600, marginRight: 10 }}>Cliente: </span>
              <select
                value={clienteId}
                onChange={e => {
                  setClienteId(e.target.value);
                  setAttivitaId(""); // reset selezione lavagna
                  setLavagna(null);
                }}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  fontSize: 15,
                  minWidth: 190,
                }}
              >
                <option value="">Seleziona cliente…</option>
                {clienti.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nomeReferente || c.email} (ID: {c.id})
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <LavagneList clienteId={clienteId} onSelect={handleLavagnaSelect} sessionUser={session.user} />
        {!attivitaId && !lavagna && (
          <div style={infoBox}>
            Nessuna lavagna disponibile.
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
  color: "#20489a",
};
const titolo = { margin: "0 0 18px", fontSize: 34, fontWeight: 800 };
const headerLine = {
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 12,
};
const infoBox = {
  background: "#e3eefe",
  border: "1px solid #4268b3",
  color: "#20489a",
  padding: "12px 16px",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 600,
};