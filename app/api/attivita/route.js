import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request) {
  try {
    const body = await request.json()
    const { pacchettoId, oreConsumate, descrizione } = body

    // Validazioni base
    if (!pacchettoId || !Number.isInteger(oreConsumate) || oreConsumate <= 0) {
      return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 })
    }

    // Recupera pacchetto
    const pacchetto = await prisma.pacchettoOre.findUnique({
      where: { id: pacchettoId }
    })

    if (!pacchetto) {
      return NextResponse.json({ error: 'Pacchetto non trovato' }, { status: 404 })
    }
    if (pacchetto.stato !== 'attivo') {
      return NextResponse.json({ error: 'Pacchetto non attivo o scaduto' }, { status: 400 })
    }
    if (pacchetto.oreResidue < oreConsumate) {
      return NextResponse.json({ error: 'Ore residue insufficienti' }, { status: 400 })
    }

    // Transazione: crea attività e aggiorna oreResidue
    const [attivita, pacchettoAggiornato] = await prisma.$transaction([
      prisma.attivita.create({
        data: {
          pacchettoId,
          oreConsumate,
          descrizione
        }
      }),
      prisma.pacchettoOre.update({
        where: { id: pacchettoId },
        data: {
          oreResidue: { decrement: oreConsumate },
          stato: pacchetto.oreResidue - oreConsumate === 0 ? 'esaurito' : 'attivo'
        }
      })
    ])

    return NextResponse.json({ attivita, pacchetto: pacchettoAggiornato })
  } catch (err) {
    console.error('Errore API /api/attivita:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
