import React, { useState } from 'react'

// Dummy data select
const PACCHETTI_DUMMY = [
  { id: 1, nome: "Ore Consulenza 2025" },
  { id: 2, nome: "Pacchetto Training" }
]
const CLIENTI_DUMMY = [
  { id: 1, nome: "Alfa Srl" },
  { id: 2, nome: "Beta Spa" }
]

export default function AttivitaForm({ initialData = null, onSuccess }) {
  const [descrizione, setDescrizione] = useState(initialData?.descrizione || "")
  const [ore, setOre] = useState(initialData?.oreConsumate || "")
  const [pacchettoId, setPacchettoId] = useState(initialData?.pacchettoId || "")
  const [clienteId, setClienteId] = useState(initialData?.clienteId || "")
  const [data, setData] = useState(initialData?.data || "")
  const [errore, setErrore] = useState("")

  const handleSubmit = e => {
    e.preventDefault()
    if (!descrizione || !ore || !pacchettoId || !clienteId || !data) {
      setErrore("Tutti i campi sono obbligatori")
      return
    }
    setErrore("")
    // Placeholder submit
    alert(`Salva attività:\nDescrizione: ${descrizione}\nOre: ${ore}\nPacchetto: ${pacchettoId}\nCliente: ${clienteId}\nData: ${data}`)
    if (onSuccess) onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} style={{maxWidth: 400}}>
      <div>
        <label>Descrizione*</label>
        <input type="text" value={descrizione} onChange={e => setDescrizione(e.target.value)} required />
      </div>
      <div>
        <label>Ore consumate*</label>
        <input type="number" min="0.1" step="0.1" value={ore} onChange={e => setOre(e.target.value)} required />
      </div>
      <div>
        <label>Pacchetto*</label>
        <select value={pacchettoId} onChange={e => setPacchettoId(e.target.value)} required>
          <option value="">Seleziona</option>
          {PACCHETTI_DUMMY.map(p => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Cliente*</label>
        <select value={clienteId} onChange={e => setClienteId(e.target.value)} required>
          <option value="">Seleziona</option>
          {CLIENTI_DUMMY.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Data*</label>
        <input type="date" value={data} onChange={e => setData(e.target.value)} required />
      </div>
      {errore && <div style={{ color: "red" }}>{errore}</div>}
      <div style={{marginTop: 10}}>
        <button type="submit">Salva</button>{' '}
        <button type="button" onClick={() => { setErrore(""); if(onSuccess) onSuccess(); }}>Annulla</button>
      </div>
      <div style={{marginTop: '1em', color: 'gray'}}>
        <em>Form attività in sviluppo…</em>
      </div>
    </form>
  )
}