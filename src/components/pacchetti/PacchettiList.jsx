import React, { useState, useEffect } from "react";
import PacchettoForm from "./PacchettoForm";
import Alert from "../Alert"; // Assicurati che questo import sia presente

function fetchPacchetti(clienteId = null) {
  let url = "/api/pacchetti";
  if (clienteId) url += `?clienteId=${clienteId}`;
  return fetch(url).then((r) => r.json());
}

export default function PacchettiList({ clienteId }) {
  const [pacchetti, setPacchetti] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [hiddenAlertIds, setHiddenAlertIds] = useState([]);

  useEffect(() => {
    fetchPacchetti(clienteId).then((data) => {
      console.log("PACCHETTI DAL BACKEND:", data); // DEBUG
      setPacchetti(data);
    });
  }, [clienteId]);

  function handleCreateSuccess() {
    fetchPacchetti(clienteId).then((data) => {
      console.log("PACCHETTI DAL BACKEND (POST-CREATE):", data); // DEBUG
      setPacchetti(data);
    });
    setShowForm(false);
  }

  function handleHideAlert(id) {
    setHiddenAlertIds((prev) => [...prev, id]);
  }

  // Individua il primo pacchetto che deve mostrare alert per renderlo in alto
  const alertTop = pacchetti.find(
    (p) =>
      p.sogliaOreResidue !== undefined &&
      p.sogliaOreResidue !== null &&
      p.sogliaOreResidue !== "" &&
      Number(p.oreResidue) <= Number(p.sogliaOreResidue) &&
      !hiddenAlertIds.includes(p.id)
  );

  return (
    <div>
      {/* ALERT IN ALTO, UNO SOLO ALLA VOLTA, GRANDE */}
      {alertTop && (
        <Alert
          message={`Ore residue sotto soglia (${alertTop.sogliaOreResidue})!`}
          type="error"
          onClose={() => handleHideAlert(alertTop.id)}
          topPage={true}
          large={true}
        />
      )}

      <h2>Pacchetti {clienteId ? `del cliente ${clienteId}` : ""}</h2>
      <button
        onClick={() => setShowForm(true)}
        style={{ marginBottom: 18, marginTop: 10 }}
      >
        Nuovo Pacchetto
      </button>
      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>ID</th>
            <th>Descrizione</th>
            <th>Ore acquistate</th>
            <th>Ore residue</th>
            <th>Soglia alert</th>
            <th>Data attivazione</th>
            <th>Stato</th>
            <th>Alert</th>
          </tr>
        </thead>
        <tbody>
          {pacchetti.map((p) => {
            const showSogliaAlert =
              p.sogliaOreResidue !== undefined &&
              p.sogliaOreResidue !== null &&
              p.sogliaOreResidue !== "" &&
              Number(p.oreResidue) <= Number(p.sogliaOreResidue) &&
              !hiddenAlertIds.includes(p.id);

            return (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.descrizione}</td>
                <td>{p.oreAcquistate}</td>
                <td>{p.oreResidue}</td>
                <td>
                  {p.sogliaOreResidue !== null &&
                  p.sogliaOreResidue !== undefined &&
                  p.sogliaOreResidue !== ""
                    ? p.sogliaOreResidue
                    : "—"}
                </td>
                <td>
                  {p.dataAttivazione
                    ? new Date(p.dataAttivazione).toLocaleDateString()
                    : ""}
                </td>
                <td>{p.stato || ""}</td>
                <td style={{ minWidth: 120 }}>
                  {/* L'alert tabellare rimane solo se non è quello in alto */}
                  {showSogliaAlert && (!alertTop || alertTop.id !== p.id) && (
                    <Alert
                      message={`Ore residue sotto soglia (${p.sogliaOreResidue})!`}
                      type="error"
                      onClose={() => handleHideAlert(p.id)}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* MODALE/FORM CRUD */}
      {showForm && (
        <PacchettoForm
          onClose={() => setShowForm(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}