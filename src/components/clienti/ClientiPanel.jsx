/**
 * Panel gestione clienti: contiene tabella, form di inserimento/modifica,
 * alert, diagnosi e modale dettagli cliente.
 * Si occupa di fetch iniziale, gestione stato e orchestrazione dei componenti figli.
 */

import React, { useEffect, useState } from "react";
import ClientiTable from "./ClientiTable";
import ClientiForm from "./ClientiForm";
import ClienteDettaglioModal from "./ClienteDettaglioModal";
import Alert from "./Alert";
import DiagnosiPanel from "./DiagnosiPanel";
import { fetchClienti, deleteCliente, updateCliente, creaCliente } from "@/src/fetcher/clienti/clientiAPI";

export default function ClientiPanel() {
  const [clienti, setClienti] = useState([]);
  const [clienteSelezionato, setClienteSelezionato] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", type: "success" });
  const [diagnosi, setDiagnosi] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch iniziale dati clienti
  useEffect(() => {
    async function loadClienti() {
      setLoading(true);
      setDiagnosi("Diagnosi in corso…");
      try {
        const data = await fetchClienti();
        setClienti(data);
        setDiagnosi("");
      } catch (e) {
        setDiagnosi("Errore nel caricamento clienti.");
      }
      setLoading(false);
    }
    loadClienti();
  }, []);

  // Handler per azioni CRUD
  const handleAdd = async (cliente) => {
    try {
      const nuovo = await creaCliente(cliente);
      setClienti([...clienti, nuovo]);
      setAlert({ show: true, message: "Cliente aggiunto!", type: "success" });
    } catch (e) {
      setAlert({ show: true, message: "Errore inserimento.", type: "error" });
    }
  };
  const handleEdit = async (updated) => {
    try {
      const clienteAggiornato = await updateCliente(updated);
      setClienti(clienti.map(c => c.id === updated.id ? clienteAggiornato : c));
      setAlert({ show: true, message: "Cliente aggiornato!", type: "success" });
    } catch (e) {
      setAlert({ show: true, message: "Errore aggiornamento.", type: "error" });
    }
  };
  const handleDelete = async (id) => {
    try {
      await deleteCliente(id);
      setClienti(clienti.filter(c => c.id !== id));
      setAlert({ show: true, message: "Cliente eliminato.", type: "success" });
    } catch (e) {
      setAlert({ show: true, message: "Errore eliminazione.", type: "error" });
    }
  };

  return (
    <section>
      <h1>Gestione Clienti</h1>
      {alert.show && <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, show: false })} />}
      {loading ? (
        <DiagnosiPanel diagnosi={diagnosi} />
      ) : (
        <>
          <ClientiTable
  clienti={clienti}
  onEdit={setClienteSelezionato}
  onDelete={handleDelete}
  onViewDetails={cliente => {
    setClienteSelezionato(cliente);
    setShowModal(true);
  }}
/>
          {showModal && (
            <ClienteDettaglioModal
              cliente={clienteSelezionato}
              onClose={() => setShowModal(false)}
              onEdit={handleEdit}
            />
          )}
        </>
      )}
    </section>
  );
}