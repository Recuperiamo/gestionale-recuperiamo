"use client";

import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import StoricoAttivitaTable from "../components/attivita/StoricoAttivitaTable.jsx";

export default function StoricoPage() {
  const [attivita, setAttivita] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [pacchetti, setPacchetti] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/attivita").then(res => res.json()),
      fetch("/api/clienti").then(res => res.json()),
      fetch("/api/pacchetti").then(res => res.json()),
    ]).then(([att, cli, pac]) => {
      setAttivita(att);
      setClienti(cli);
      setPacchetti(pac);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Caricamento dati storico...</div>;

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 1150, margin: "38px auto 0 auto", padding: 18 }}>
        <StoricoAttivitaTable attivita={attivita} clienti={clienti} pacchetti={pacchetti} />
      </div>
    </>
  );
}