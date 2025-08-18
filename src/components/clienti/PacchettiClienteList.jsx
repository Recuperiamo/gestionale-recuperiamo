import React, { useEffect, useState } from "react";
import PacchettoForm from "../pacchetti/PacchettoForm";
import PacchettiList from "../pacchetti/PacchettiList";

const PacchettiClienteList = ({ clienteId }) => {
  const [pacchetti, setPacchetti] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editPacchetto, setEditPacchetto] = useState(null);
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

  // Handler CRUD
  const handleAdd = () => {
    setEditPacchetto(null);
    setShowForm(true);
  };

  const handleEdit = (pacchetto) => {
    setEditPacchetto(pacchetto);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Sicuro di eliminare il pacchetto?")) return;
    const res = await fetch(`/api/pacchetti/${id}`, { method: "DELETE" });
    if (res.ok) fetchPacchetti();
  };

  const handleFormSubmit = async () => {
    setShowForm(false);
    await fetchPacchetti();
  };

  return (
    <div>
      <h3>Pacchetti associati</h3>
      <button onClick={handleAdd} style={{marginBottom: 10, background: "#1976d2", color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px", cursor: "pointer"}}>
        Aggiungi Pacchetto
      </button>
      {loading ? (
        <div>Caricamento...</div>
      ) : (
        <>
          <PacchettiList
            pacchetti={pacchetti}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          {showForm && (
            <PacchettoForm
              clienteId={clienteId}
              pacchetto={editPacchetto}
              onClose={() => setShowForm(false)}
              onSubmit={handleFormSubmit}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PacchettiClienteList;