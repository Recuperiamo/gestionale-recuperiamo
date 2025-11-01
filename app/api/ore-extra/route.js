// @ts-nocheck
import { NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/authOptions'

export const runtime = 'nodejs'

// GET: Recupera ore extra per cliente o pacchetto
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get('clienteId')
    const pacchettoId = searchParams.get('pacchettoId')
    const stato = searchParams.get('stato') // pending | assegnato | cancellato

    const isAdmin = session.user?.role !== 'cliente'
    const sessionClienteId = session.user?.clienteId ? Number(session.user.clienteId) : null

    let where = {}
    if (!isAdmin && sessionClienteId) {
      where.clienteId = sessionClienteId
    } else if (clienteId) {
      where.clienteId = Number(clienteId)
    }
    if (pacchettoId) where.pacchettoId = Number(pacchettoId)
    if (stato) where.stato = stato

    const oreExtra = await prisma.oreExtra.findMany({
      where,
      include: { cliente: true, pacchetto: true },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(oreExtra)
  } catch (err) {
    console.error('Errore GET /api/ore-extra:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// POST: Traccia ore extra per cliente
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const isAdmin = session.user?.role !== 'cliente'
    if (!isAdmin) return NextResponse.json({ error: 'Solo admin può tracciare ore extra' }, { status: 403 })

    const body = await request.json()
    const { clienteId, ore, descrizione, note } = body

    if (!clienteId || !ore || ore <= 0) {
      return NextResponse.json({ error: 'clienteId e ore (positivi) richiesti' }, { status: 400 })
    }

    const oreExtra = await prisma.oreExtra.create({
      data: {
        clienteId: Number(clienteId),
        ore: Number(ore),
        descrizione: descrizione || null,
        note: note || null,
        stato: 'pending',
        tracciaDa: session.user?.email || 'admin'
      },
      include: { cliente: true }
    })

    return NextResponse.json(oreExtra, { status: 201 })
  } catch (err) {
    console.error('Errore POST /api/ore-extra:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// PUT: Assegna ore extra a pacchetto
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const isAdmin = session.user?.role !== 'cliente'
    if (!isAdmin) return NextResponse.json({ error: 'Solo admin può assegnare ore extra' }, { status: 403 })

    const body = await request.json()
    const { id, pacchettoId } = body

    if (!id || !pacchettoId) {
      return NextResponse.json({ error: 'id e pacchettoId richiesti' }, { status: 400 })
    }

    // Verifica che l'ore extra esista e sia pending
    const existing = await prisma.oreExtra.findUnique({ where: { id: Number(id) } })
    if (!existing) return NextResponse.json({ error: 'Ore extra non trovata' }, { status: 404 })
    if (existing.stato !== 'pending') {
      return NextResponse.json({ error: 'Solo ore extra pending possono essere assegnate' }, { status: 400 })
    }

    // Verifica che il pacchetto esista
    const pacchetto = await prisma.pacchettoOre.findUnique({ where: { id: Number(pacchettoId) } })
    if (!pacchetto) return NextResponse.json({ error: 'Pacchetto non trovato' }, { status: 404 })

    // Aggiorna oreExtra e ore residue del pacchetto
    const oreExtra = await prisma.oreExtra.update({
      where: { id: Number(id) },
      data: {
        pacchettoId: Number(pacchettoId),
        stato: 'assegnato',
        dataAssegnamento: new Date(),
        assegnatoDa: session.user?.email || 'admin'
      },
      include: { cliente: true, pacchetto: true }
    })

    // Incrementa oreResidue del pacchetto
    await prisma.pacchettoOre.update({
      where: { id: Number(pacchettoId) },
      data: { oreResidue: { increment: existing.ore } }
    })

    return NextResponse.json(oreExtra)
  } catch (err) {
    console.error('Errore PUT /api/ore-extra:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// DELETE: Cancella ore extra (solo se pending)
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const isAdmin = session.user?.role !== 'cliente'
    if (!isAdmin) return NextResponse.json({ error: 'Solo admin può eliminare ore extra' }, { status: 403 })

    const body = await request.json()
    const { id } = body

    if (!id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 })

    const existing = await prisma.oreExtra.findUnique({ where: { id: Number(id) } })
    if (!existing) return NextResponse.json({ error: 'Ore extra non trovata' }, { status: 404 })

    // Soft delete: cambio stato a 'cancellato'
    const oreExtra = await prisma.oreExtra.update({
      where: { id: Number(id) },
      data: { stato: 'cancellato' }
    })

    return NextResponse.json(oreExtra)
  } catch (err) {
    console.error('Errore DELETE /api/ore-extra:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
