"use client";

import React, { useState } from "react";
import Navbar from "../components/Navbar";
import StoricoAttivitaTable from "../components/attivita/StoricoAttivitaTable";
import ChangelogTable from "../components/ChangelogTable";
import StoricoRichiesteModificaTable from "../components/modifiche/StoricoRichiesteModificaTable.jsx";
import { useSession } from "next-auth/react";

const TABS = [
  { key: "storico-attivita", label: "Storico Attività" },
  { key: "storico-modifiche", label: "Storico Modifiche Pacchetto" },
  { key: "storico-richieste", label: "Richieste Modifica Lezioni" }
];

export default function StoricoUnificatoPage() {
  const [activeTab, setActiveTab] = useState("storico-attivita");
  const { data: session } = useSession();
  const isCliente = session?.user?.role === "cliente";

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Storico</h1>
        <div className="mb-4 flex border-b border-gray-200">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 mr-2 rounded-t ${
                activeTab === tab.key
                  ? "bg-white border border-b-0 border-gray-200 font-semibold"
                  : "bg-gray-100 border border-b border-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="bg-white p-4 rounded-b shadow">
          {activeTab === "storico-attivita" && <StoricoAttivitaTable />}
          {activeTab === "storico-modifiche" && <ChangelogTable />}
          {activeTab === "storico-richieste" && (
            <StoricoRichiesteWrapper isCliente={isCliente} />
          )}
        </div>
      </div>
    </>
  );
}

function StoricoRichiesteWrapper({ isCliente }) {
  const [loading, setLoading] = React.useState(true);
  const [errore, setErrore] = React.useState(null);
  const [richieste, setRichieste] = React.useState([]);

  React.useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const r = await fetch("/api/modifiche");
        if (!r.ok) throw new Error("Errore " + r.status);
        const js = await r.json();
        if (!abort) setRichieste(Array.isArray(js) ? js : []);
      } catch (e) {
        if (!abort) setErrore(e.message);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  if (loading) return <div>Caricamento richieste...</div>;
  if (errore) return <div className="text-red-600">Errore: {errore}</div>;

  return (
    <StoricoRichiesteModificaTable richieste={richieste} isCliente={isCliente} />
  );
}