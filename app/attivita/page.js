import React, { useState } from 'react'
import AttivitaList from '../components/attivita/AttivitaList'
import AttivitaForm from '../components/attivita/AttivitaForm'

export default function AttivitaPage() {
  const [showForm, setShowForm] = useState(false)

  // Per test: dopo submit/annulla chiudi il form
  const handleSuccess = () => setShowForm(false)

  return (
    <main>
      <h1>Gestione Attività</h1>
      <button onClick={() => setShowForm(true)}>Nuova attività</button>
      {showForm && (
        <div style={{
          background: "#fff",
          border: "1px solid #ccc",
          padding: 20,
          margin: "20px 0",
          boxShadow: "0 2px 8px #0002",
          maxWidth: 500
        }}>
          <AttivitaForm onSuccess={handleSuccess} />
        </div>
      )}
      <AttivitaList />
    </main>
  )
}