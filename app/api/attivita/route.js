// @ts-nocheck
import { NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

/**
 * API CRUD Attività (milestone 5 - issue #33)
 * ----------------------------------------------------
 * - POST   /api/attivita        → crea attività (collega pacchetto, aggiorna ore residue)
 * - GET    /api/attivita        → lista tutte le attività (opz: filtro pacchettoId/clienteId)
 * - GET    /api/attivita?id=XX  → dettaglio singola attività
 * - PATCH  /api/attivita        → modifica attività (descrizione/oreConsumate)
 * - DELETE /api/attivita        → elimina attività
 *
 * Scenario test/manuale:
 * 1. Crea attività via API, verifica inserimento e collegamento a pacchetto/cliente
 * 2. Modifica ed elimina attività, verifica aggiornamento dati e ore residue
 * 3. Verifica aggiornamento automatico ore residue sul pacchetto
 * 4. Edge-case: attività senza pacchetto, dati non validi, ore > residue, doppio inserimento
 */

// ========== GET: Lista tutte o singola attività ==========
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const pacchettoId = searchParams.get('pacchettoId')
    const clienteId = searchParams.get('clienteId')

    if (id) {
      // Dettaglio singola attività
      const attivita = await prisma.attivita.findUnique({
        where: { id: Number(id) },
        include: {
          pacchetto: {
            include: { cliente: true }
          }
        }
      })
      if (!attivita) {
        return NextResponse.json({ error: 'Attività non trovata' }, { status: 404 })
      }
      return NextResponse.json(attivita)
    }

    // Filtro opzionale per pacchettoId/clienteId
    let where = {}
    if (pacchettoId) where.pacchettoId = Number(pacchettoId)
    if (clienteId) where.pacchetto = { clienteId: Number(clienteId) }

    const attivitaList = await prisma.attivita.findMany({
      where,
      include: {
        pacchetto: {
          include: { cliente: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    console.log(">>> [DEBUG] Lista attività GET:", attivitaList);
    return NextResponse.json(attivitaList)
  } catch (err) {
    console.error('Errore GET /api/attivita:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// ========== POST: Crea nuova attività ==========
export async function POST(request) {
  try {
    const body = await request.json()
    console.log('>>> [DEBUG] Richiesta POST attività, body:', body);

    const { pacchettoId, oreConsumate, descrizione } = body

    // Validazioni base
    if (!pacchettoId || !Number.isInteger(oreConsumate) || oreConsumate <= 0) {
      return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 })
    }

    // Recupera pacchetto
    const pacchetto = await prisma.pacchettoOre.findUnique({
      where: { id: pacchettoId },
      include: { cliente: true }
    })
    console.log('>>> [DEBUG] Pacchetto trovato:', pacchetto);

    if (!pacchetto) {
      return NextResponse.json({ error: 'Pacchetto non trovato' }, { status: 404 })
    }
    if (pacchetto.stato !== 'attivo') {
      return NextResponse.json({ error: 'Pacchetto non attivo o scaduto' }, { status: 400 })
    }
    if (pacchetto.oreResidue < oreConsumate) {
      return NextResponse.json({ error: 'Ore residue insufficienti' }, { status: 400 })
    }

    // Crea attività e aggiorna ore residue in transazione
    console.log('>>> [DEBUG] Valore oreResidue PRIMA:', pacchetto.oreResidue, 'Richiesta oreConsumate:', oreConsumate);

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
    console.error('Errore POST /api/attivita:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// ========== PATCH: Modifica attività ==========
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, descrizione, oreConsumate } = body

    if (!id) {
      return NextResponse.json({ error: 'ID attività obbligatorio' }, { status: 400 })
    }

    // Recupera attività esistente
    const attivita = await prisma.attivita.findUnique({
      where: { id: Number(id) }
    })
    if (!attivita) {
      return NextResponse.json({ error: 'Attività non trovata' }, { status: 404 })
    }

    // Recupera pacchetto collegato
    const pacchetto = await prisma.pacchettoOre.findUnique({
      where: { id: attivita.pacchettoId }
    })
    if (!pacchetto) {
      return NextResponse.json({ error: 'Pacchetto collegato non trovato' }, { status: 404 })
    }

    // Gestione update oreConsumate: aggiorna ore residue sul pacchetto
    let nuovoOreConsumate = attivita.oreConsumate
    let updateFields = {}
    if (typeof oreConsumate === 'number' && oreConsumate > 0 && oreConsumate !== attivita.oreConsumate) {
      const differenza = oreConsumate - attivita.oreConsumate
      // Se incremento: verifica ore residue sufficienti
      if (differenza > 0 && pacchetto.oreResidue < differenza) {
        return NextResponse.json({ error: 'Ore residue insufficienti per incremento' }, { status: 400 })
      }
      nuovoOreConsumate = oreConsumate
      updateFields.oreConsumate = oreConsumate
    }
    if (typeof descrizione === 'string') {
      updateFields.descrizione = descrizione
    }
    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
    }

    // Transazione: aggiorna attività e ore residue pacchetto
    const updates = [
      prisma.attivita.update({
        where: { id: Number(id) },
        data: updateFields
      })
    ]
    if (nuovoOreConsumate !== attivita.oreConsumate) {
      updates.push(
        prisma.pacchettoOre.update({
          where: { id: attivita.pacchettoId },
          data: {
            oreResidue: { decrement: nuovoOreConsumate - attivita.oreConsumate },
            stato: pacchetto.oreResidue - (nuovoOreConsumate - attivita.oreConsumate) === 0 ? 'esaurito' : 'attivo'
          }
        })
      )
    }

    const [attivitaAggiornata, pacchettoAggiornato] = await prisma.$transaction(updates)

    return NextResponse.json({ attivita: attivitaAggiornata, pacchetto: pacchettoAggiornato || pacchetto })
  } catch (err) {
    console.error('Errore PATCH /api/attivita:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// ========== DELETE: Elimina attività ==========
export async function DELETE(request) {
  try {
    const body = await request.json()
    const { id } = body
    if (!id) {
      return NextResponse.json({ error: 'ID attività obbligatorio' }, { status: 400 })
    }

    const attivita = await prisma.attivita.findUnique({
      where: { id: Number(id) }
    })
    if (!attivita) {
      return NextResponse.json({ error: 'Attività non trovata' }, { status: 404 })
    }
    // Recupera pacchetto
    const pacchetto = await prisma.pacchettoOre.findUnique({
      where: { id: attivita.pacchettoId }
    })
    if (!pacchetto) {
      return NextResponse.json({ error: 'Pacchetto collegato non trovato' }, { status: 404 })
    }

    // Transazione: elimina attività e ripristina ore residue su pacchetto
    const [attivitaEliminata, pacchettoAggiornato] = await prisma.$transaction([
      prisma.attivita.delete({
        where: { id: Number(id) }
      }),
      prisma.pacchettoOre.update({
        where: { id: attivita.pacchettoId },
        data: {
          oreResidue: { increment: attivita.oreConsumate },
          stato: 'attivo'
        }
      })
    ])

    return NextResponse.json({ deleted: attivitaEliminata, pacchetto: pacchettoAggiornato })
  } catch (err) {
    console.error('Errore DELETE /api/attivita:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export const runtime = 'nodejs'