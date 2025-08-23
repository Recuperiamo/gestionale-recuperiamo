import React, { useState } from 'react'
import AttivitaList from '../components/attivita/AttivitaList'
import AttivitaForm from '../components/attivita/AttivitaForm'

export default function AttivitaPage() {
  const [showForm, setShowForm] = useState(false)
  const [formInitialData, setFormInitialData] = useState(null)

  // Apri form per nuova attività
  const handleAdd = () => {
    setFormInitialData(null)
    setShowForm(true)
  }
  // Apri form per modifica attività
  const handleEdit = (attivita) => {
    setFormInitialData(attivita)
    setShowForm(true)
  }
  // Chiudi form dopo submit/annulla
  const handleSuccess = () => setShowForm(false)

  return (
    <main>
      <h1>Gestione Attività</h1>
      <button onClick={handleAdd}>Nuova attività</button>
      {showForm && (
        <div style={{
          background: "#fff",
          border: "1px solid #ccc",
          padding: 20,
          margin: "20px 0",
          boxShadow: "0 2px 8px #0002",
          maxWidth: 500
        }}>
          <AttivitaForm initialData={formInitialData} onSuccess={handleSuccess} />
        </div>
      )}
      <AttivitaList onEdit={handleEdit} />
    </main>
  )
}