import React, { useEffect, useState } from "react";
import PacchettiList from "../pacchetti/PacchettiList";

const PacchettiClienteList = ({ clienteId }) => {
  const [pacchetti, setPacchetti] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carica pacchetti del cliente
  const fetchPacchetti = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pacchetti?clienteId=${clienteId}`);
      if (!res.ok) {
        throw new Error("Errore nel recupero dei pacchetti");
      }
      const data = await res.json();
      setPacchetti(Array.isArray(data) ? data : []);
    } catch (err) {
      setPacchetti([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clienteId) fetchPacchetti();
  }, [clienteId]);

  return (
    <div>
      <h3>Pacchetti associati</h3>
      <a
        href="/pacchetti"
        style={{
          display: "inline-block",
          marginBottom: 10,
          background: "#1976d2",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          padding: "6px 12px",
          cursor: "pointer",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        Nuovo pacchetto
      </a>
      {loading ? (
        <div>Caricamento...</div>
      ) : (
        <PacchettiList
          pacchetti={pacchetti}
          clienteId={clienteId}
        />
      )}
    </div>
  );
};

export default PacchettiClienteList;