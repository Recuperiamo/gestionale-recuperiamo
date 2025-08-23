import React from 'react'

// Dummy data d'esempio
const ATTIVITA_DUMMY = [
  {
    id: 1,
    descrizione: "Consulenza strategica",
    oreConsumate: 3,
    pacchetto: "Ore Consulenza 2025",
    cliente: "Alfa Srl",
    data: "2025-08-22"
  },
  {
    id: 2,
    descrizione: "Formazione personale",
    oreConsumate: 2,
    pacchetto: "Pacchetto Training",
    cliente: "Beta Spa",
    data: "2025-08-21"
  }
]

export default function AttivitaList() {
  // Handler placeholder
  const handleAction = (azione, attivita) => {
    alert(`Azione: ${azione}\nID attività: ${attivita.id}`)
  }

  return (
    <section>
      <h2>Elenco Attività</h2>
      <table style={{width: '100%', borderCollapse: 'collapse'}}>
        <thead>
          <tr>
            <th>Descrizione</th>
            <th>Ore</th>
            <th>Pacchetto</th>
            <th>Cliente</th>
            <th>Data</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {ATTIVITA_DUMMY.map(attivita => (
            <tr key={attivita.id}>
              <td>{attivita.descrizione}</td>
              <td>{attivita.oreConsumate}</td>
              <td>{attivita.pacchetto}</td>
              <td>{attivita.cliente}</td>
              <td>{attivita.data}</td>
              <td>
                <button onClick={() => handleAction('Dettaglio', attivita)}>Dettaglio</button>{' '}
                <button onClick={() => handleAction('Modifica', attivita)}>Modifica</button>{' '}
                <button onClick={() => handleAction('Elimina', attivita)}>Elimina</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{marginTop: '1em', color: 'gray'}}>
        <em>Funzionalità in sviluppo…</em>
      </div>
    </section>
  )
}