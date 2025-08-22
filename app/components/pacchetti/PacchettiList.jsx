import React, { useEffect, useState, useRef } from "react";
import PacchettoForm from "./PacchettoForm";
import PacchettoEditForm from "./PacchettoEditForm";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import Alert from "../Alert";

function fetchPacchetti(clienteId = null) {
  let url = "/api/pacchetti";
  if (clienteId) url += `?clienteId=${clienteId}`;
  return fetch(url).then((res) => res.json());
}

async function fetchAlertLetti() {
  const res = await fetch("/api/pacchetti/alert-letto", {
    credentials: "include"
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.ids || [];
}

async function segnalaAlertLetto(pacchettoId) {
  await fetch("/api/pacchetti/alert-letto", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pacchettoId }),
    credentials: "include"
  });
}

export default function PacchettiList({
  clienteId,
  pacchetti: pacchettiProp,
  onEdit,
  onDelete,
}) {
  const [pacchetti, setPacchetti] = useState([]);
  const [editPacchetto, setEditPacchetto] = useState(null);
  const [deletePacchetto, setDeletePacchetto] = useState(null);
  const [alertLetti, setAlertLetti] = useState([]);
  const rowRefs = useRef({});

  useEffect(() => {
    if (Array.isArray(pacchettiProp)) {
      setPacchetti(pacchettiProp);
    } else {
      fetchPacchetti(clienteId).then((data) => setPacchetti(data || []));
    }
  }, [clienteId, pacchettiProp]);

  useEffect(() => {
    fetchAlertLetti().then(setAlertLetti);
  }, []);

  function handleCreateSuccess() {
    if (!Array.isArray(pacchettiProp)) {
      fetchPacchetti(clienteId).then((data) => setPacchetti(data || []));
    }
    setEditPacchetto(null);
    setDeletePacchetto(null);
  }

  async function handleHideAlert(id) {
    await segnalaAlertLetto(id);
    setAlertLetti((prev) => [...prev, id]);
  }

  const alertTop =
    pacchetti &&
    pacchetti.find(
      (p) =>
        p.sogliaOreResidue !== null &&
        p.sogliaOreResidue !== undefined &&
        Number(p.oreResidue) <= Number(p.sogliaOreResidue) &&
        Number(p.sogliaOreResidue) > 0 &&
        !alertLetti.includes(p.id)
    );

  function goToPacchettoEdit(pacchetto) {
    if (rowRefs.current[pacchetto.id]) {
      rowRefs.current[pacchetto.id].scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (onEdit) {
      onEdit(pacchetto);
    } else {
      setEditPacchetto(pacchetto);
    }
  }

  function handleDeletePacchetto(pacchetto) {
    if (onDelete) {
      onDelete(pacchetto.id);
    } else {
      setDeletePacchetto(pacchetto);
    }
  }

  return (
    <div className="space-y-4">
      <h2>Pacchetti {clienteId ? `del cliente ${clienteId}` : ""}</h2>

      {alertTop && (
        <Alert
          message={
            <>
              <b>
                Pacchetto <span style={{ color: "#4B65C2" }}>{alertTop.descrizione}</span>
                {" "}del cliente{" "}
                <span style={{ color: "#0B7B5B" }}>
                  {alertTop.cliente?.nomeReferente || alertTop.clienteId}
                </span>
                :{" "}
              </b>
              Ore residue sotto soglia ({alertTop.sogliaOreResidue})!
              <button
                className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition"
                onClick={() => goToPacchettoEdit(alertTop)}
                style={{ textDecoration: "underline", fontWeight: 500, marginLeft: 8 }}
              >
                Vai al dettaglio/modifica
              </button>
              <button
                className="ml-2 px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                onClick={() => handleHideAlert(alertTop.id)}
                style={{ marginLeft: 12, fontWeight: 500 }}
              >
                Segnala come letto
              </button>
            </>
          }
          type="warning"
          topPage={true}
          large={true}
          onClose={() => handleHideAlert(alertTop.id)}
        />
      )}

      <table className="min-w-full bg-white border border-gray-300 text-center align-middle">
        <thead>
          <tr>
            <th className="text-center align-middle">ID</th>
            <th className="text-center align-middle">Descrizione</th>
            <th className="text-center align-middle">Cliente</th>
            <th className="text-center align-middle">Ore acquistate</th>
            <th className="text-center align-middle">Ore residue</th>
            <th className="text-center align-middle">Stato</th>
            <th className="text-center align-middle">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {pacchetti &&
            pacchetti.map((p) => {
              return (
                <tr key={p.id} ref={el => rowRefs.current[p.id] = el}>
                  <td className="text-center align-middle">{p.id}</td>
                  <td className="text-center align-middle">{p.descrizione}</td>
                  <td className="text-center align-middle">{p.cliente?.nomeReferente || p.clienteId}</td>
                  <td className="text-center align-middle">{p.oreAcquistate}</td>
                  <td className="text-center align-middle">{p.oreResidue}</td>
                  <td className="text-center align-middle">{p.stato}</td>
                  <td className="text-center align-middle">
                    <button
                      className="mr-1 px-2 py-1 bg-yellow-200 rounded"
                      onClick={() => goToPacchettoEdit(p)}
                    >
                      Modifica
                    </button>
                    <button
                      className="px-2 py-1 bg-red-200 rounded"
                      onClick={() => handleDeletePacchetto(p)}
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              );
            })}
          {(!pacchetti || pacchetti.length === 0) && (
            <tr>
              <td colSpan={7} className="text-center text-gray-500 py-3">
                Nessun pacchetto presente.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {!onEdit && !pacchettiProp && (
        <button
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
          onClick={() => setEditPacchetto({})}
        >
          Nuovo Pacchetto
        </button>
      )}

      {editPacchetto && Object.keys(editPacchetto).length === 0 && (
        <PacchettoForm
          onClose={() => setEditPacchetto(null)}
          onSuccess={handleCreateSuccess}
          clienteId={clienteId}
        />
      )}

      {editPacchetto && Object.keys(editPacchetto).length > 0 && (
        <PacchettoEditForm
          pacchetto={editPacchetto}
          onClose={() => setEditPacchetto(null)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {deletePacchetto && (
        <ConfirmDeleteModal
          pacchetto={deletePacchetto}
          onClose={() => setDeletePacchetto(null)}
          onSuccess={handleCreateSuccess}
        />
      )}
      <style>{`
        th, td {
          text-align: center !important;
          vertical-align: middle !important;
        }
      `}</style>
    </div>
  );
}