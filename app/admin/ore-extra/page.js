'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import AuthGuard from '../../components/AuthGuard'

export default function OreExtraPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [clienti, setClienti] = useState([])
  const [oreExtra, setOreExtra] = useState([])
  const [pacchetti, setPacchetti] = useState([])
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    clienteId: '',
    ore: '',
    descrizione: '',
    note: ''
  })

  const [selectedOreExtra, setSelectedOreExtra] = useState(null)
  const [selectedPacchetto, setSelectedPacchetto] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user?.role === 'cliente') {
      router.replace('/signin')
      return
    }
    fetchData()
  }, [status, session, router])

  async function fetchData() {
    try {
      const [clientiRes, oreExtraRes, pacchettiRes] = await Promise.all([
        fetch('/api/clienti?tipo=STUDENTE'),
        fetch('/api/ore-extra'),
        fetch('/api/pacchetti')
      ])

      if (clientiRes.ok) {
        const data = await clientiRes.json()
        setClienti(Array.isArray(data.clienti) ? data.clienti : data)
      }
      if (oreExtraRes.ok) {
        setOreExtra(await oreExtraRes.json())
      }
      if (pacchettiRes.ok) {
        setPacchetti(await pacchettiRes.json())
      }
    } catch (e) {
      console.error('Errore caricamento dati:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleTraccia(e) {
    e.preventDefault()
    if (!formData.clienteId || !formData.ore) {
      alert('Compila i campi obbligatori')
      return
    }

    try {
      const res = await fetch('/api/ore-extra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setFormData({ clienteId: '', ore: '', descrizione: '', note: '' })
        await fetchData()
        alert('Ore extra tracciate!')
      } else {
        alert('Errore: ' + (await res.text()))
      }
    } catch (e) {
      console.error('Errore:', e)
      alert('Errore: ' + e.message)
    }
  }

  async function handleAssegna() {
    if (!selectedOreExtra || !selectedPacchetto) {
      alert('Seleziona ore extra e pacchetto')
      return
    }

    try {
      const res = await fetch('/api/ore-extra', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedOreExtra.id,
          pacchettoId: Number(selectedPacchetto)
        })
      })

      if (res.ok) {
        setSelectedOreExtra(null)
        setSelectedPacchetto('')
        await fetchData()
        alert('Ore extra assegnate al pacchetto!')
      } else {
        alert('Errore: ' + (await res.text()))
      }
    } catch (e) {
      console.error('Errore:', e)
      alert('Errore: ' + e.message)
    }
  }

  async function handleCancella(id) {
    if (!confirm('Cancellare ore extra?')) return

    try {
      const res = await fetch('/api/ore-extra', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      if (res.ok) {
        await fetchData()
        alert('Ore extra cancellate!')
      } else {
        alert('Errore: ' + (await res.text()))
      }
    } catch (e) {
      console.error('Errore:', e)
      alert('Errore: ' + e.message)
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <Navbar />
        <div style={{ padding: 40, textAlign: 'center', color: '#5a6d90' }}>
          Caricamento...
        </div>
      </AuthGuard>
    )
  }

  const pendingOreExtra = oreExtra.filter(o => o.stato === 'pending')
  const assignedOreExtra = oreExtra.filter(o => o.stato === 'assegnato')

  return (
    <AuthGuard>
      <Navbar />
      <main style={{ maxWidth: 1200, margin: '60px auto 40px', padding: '0 20px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24, color: '#20489a' }}>
          Gestione Ore Extra
        </h1>

        {/* Form Traccia Ore Extra */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          marginBottom: 32,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#20489a' }}>
            Traccia Ore Extra
          </h2>

          <form onSubmit={handleTraccia} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600, color: '#20489a' }}>
                Cliente *
              </label>
              <select
                value={formData.clienteId}
                onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #dde6f3',
                  borderRadius: 8,
                  fontSize: 14
                }}
              >
                <option value="">-- Seleziona cliente --</option>
                {clienti.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nomeReferente} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600, color: '#20489a' }}>
                Ore *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.ore}
                onChange={(e) => setFormData({ ...formData, ore: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #dde6f3',
                  borderRadius: 8,
                  fontSize: 14
                }}
                placeholder="Es. 2.5"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600, color: '#20489a' }}>
                Descrizione
              </label>
              <input
                type="text"
                value={formData.descrizione}
                onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #dde6f3',
                  borderRadius: 8,
                  fontSize: 14
                }}
                placeholder="Es. Lezione recupero"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600, color: '#20489a' }}>
                Note
              </label>
              <input
                type="text"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #dde6f3',
                  borderRadius: 8,
                  fontSize: 14
                }}
                placeholder="Note interne"
              />
            </div>

            <button
              type="submit"
              style={{
                gridColumn: '1 / -1',
                padding: '10px 16px',
                background: '#20489a',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ✓ Traccia Ore Extra
            </button>
          </form>
        </div>

        {/* Ore Extra in Sospeso */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          marginBottom: 32,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#20489a' }}>
            Ore Extra in Sospeso ({pendingOreExtra.length})
          </h2>

          {pendingOreExtra.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>Nessuna ora extra in sospeso</p>
          ) : (
            <div style={{ marginBottom: 16 }}>
              {pendingOreExtra.map(o => (
                <div
                  key={o.id}
                  onClick={() => setSelectedOreExtra(o)}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    background: selectedOreExtra?.id === o.id ? '#e0e7ff' : '#f8fafc',
                    border: selectedOreExtra?.id === o.id ? '2px solid #20489a' : '1px solid #dde6f3',
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#20489a' }}>
                    {o.cliente?.nomeReferente}: {o.ore}h
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {o.descrizione} {o.note ? `(${o.note})` : ''}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCancella(o.id) }}
                    style={{
                      fontSize: 11,
                      padding: '4px 8px',
                      marginTop: 8,
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                  >
                    × Cancella
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedOreExtra && selectedOreExtra.stato === 'pending' && (
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#20489a' }}>
                Assegna a Pacchetto
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={selectedPacchetto}
                  onChange={(e) => setSelectedPacchetto(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #dde6f3',
                    borderRadius: 8,
                    fontSize: 14
                  }}
                >
                  <option value="">-- Seleziona pacchetto --</option>
                  {pacchetti.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.descrizione} ({p.cliente?.nomeReferente})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssegna}
                  style={{
                    padding: '8px 16px',
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  → Assegna
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Ore Extra Assegnate */}
        {assignedOreExtra.length > 0 && (
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#20489a' }}>
              Ore Extra Assegnate ({assignedOreExtra.length})
            </h2>

            {assignedOreExtra.map(o => (
              <div
                key={o.id}
                style={{
                  padding: 12,
                  marginBottom: 8,
                  background: '#f0fdf4',
                  border: '1px solid #dbeafe',
                  borderRadius: 8
                }}
              >
                <div style={{ fontWeight: 600, color: '#20489a' }}>
                  {o.cliente?.nomeReferente}: {o.ore}h → {o.pacchetto?.descrizione}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Assegnato il {new Date(o.dataAssegnamento).toLocaleDateString('it-IT')}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </AuthGuard>
  )
}
