// @ts-nocheck
/**
 * API lavagna-v2
 *
 * GET  ?lavagnaId=X          → restituisce lavagna esistente (tratti + forme)
 * GET  ?attivitaId=X         → crea/trova lavagna legata all'attività (stesso pattern di lavagna classica)
 * POST { titolo? }           → crea nuova lavagna "libera" (senza attività)
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/authOptions'
import { PrismaClient } from '@prisma/client'

const prisma = global.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.prisma = prisma

function formatDataOra(d: Date) {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Europe/Rome',
  }).format(new Date(d)).replace(/, /, ' ')
}

// ── Leggi lavagna (tratti + forme) ────────────────────────────────────────────
async function getLavagnaData(lavagnaId: number, since?: Date) {
  const sinceFilter = since ? { createdAt: { gt: since } } : {}
  const tratti = await prisma.lavagnaTratto.findMany({
    where: { lavagnaId, deletedAt: null, ...sinceFilter },
    orderBy: { createdAt: 'asc' },
  })
  const forme = await prisma.lavagnaShape.findMany({
    where: { lavagnaId, deletedAt: null, ...sinceFilter },
    orderBy: { createdAt: 'asc' },
  })
  return { tratti, forme }
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const url = new URL(req.url)
  const lavagnaIdParam = url.searchParams.get('lavagnaId')
  const attivitaIdParam = url.searchParams.get('attivitaId')

  // ── Modalità: per ID lavagna diretta ────────────────────────────────────────
  const sinceParam = url.searchParams.get('since')
  const sinceDate = sinceParam ? new Date(sinceParam) : undefined

  if (lavagnaIdParam) {
    const lavagnaId = Number(lavagnaIdParam)
    if (isNaN(lavagnaId)) return NextResponse.json({ error: 'lavagnaId non valido' }, { status: 400 })

    const lavagna = await prisma.lavagna.findUnique({ where: { id: lavagnaId } })
    if (!lavagna) return NextResponse.json({ error: 'Lavagna non trovata' }, { status: 404 })

    const { tratti, forme } = await getLavagnaData(lavagnaId, sinceDate)
    return NextResponse.json({ lavagna: { ...lavagna, tratti, forme } })
  }

  // ── Modalità: per attivitaId (stesso pattern lavagna classica) ──────────────
  if (attivitaIdParam) {
    const attivitaId = Number(attivitaIdParam)
    if (isNaN(attivitaId)) return NextResponse.json({ error: 'attivitaId non valido' }, { status: 400 })

    const att = await prisma.attivita.findUnique({
      where: { id: attivitaId },
      select: {
        id: true, clienteId: true, orario: true, orarioOriginale: true,
        cliente: { select: { id: true, nomeReferente: true, email: true } },
      },
    })
    if (!att) return NextResponse.json({ error: 'Attività inesistente' }, { status: 404 })

    const role = (session.user.role || '').toLowerCase()
    if (role === 'cliente') {
      if (session.user.clienteId !== att.clienteId) {
        return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
      }
      // Verifica che la lavagna v2 sia abilitata per questo studente
      const clienteCheck = await prisma.client.findUnique({
        where: { id: att.clienteId },
        select: { lavagnaV2Abilitata: true },
      })
      if (!clienteCheck?.lavagnaV2Abilitata) {
        return NextResponse.json({ error: 'Accesso non abilitato' }, { status: 403 })
      }
    }

    const dataLezione = att.orario ? new Date(att.orario) : att.orarioOriginale ? new Date(att.orarioOriginale) : null
    const baseTitolo = dataLezione ? formatDataOra(dataLezione) : 'Data non definita'

    let lavagna = await prisma.lavagna.findUnique({ where: { attivitaId } })
    if (!lavagna) {
      lavagna = await prisma.lavagna.create({
        data: { attivitaId, titolo: baseTitolo, clienteId: att.clienteId ?? null },
      })
    }

    const nomeStudente = att.cliente?.nomeReferente || att.cliente?.email || ''
    const titoloVisuale = nomeStudente ? `${lavagna.titolo} – ${nomeStudente}` : lavagna.titolo

    const { tratti, forme } = await getLavagnaData(lavagna.id, sinceDate)
    return NextResponse.json({ lavagna: { ...lavagna, titoloVisuale, nomeStudente, tratti, forme } })
  }

  return NextResponse.json({ error: 'Parametro mancante (lavagnaId o attivitaId)' }, { status: 400 })
}

// ── Crea lavagna v2 (libera, senza attivitaId per evitare conflitti con v1) ────
export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const clienteId = body.clienteId ? Number(body.clienteId) : null

  // Recupera nome studente per il titolo automatico
  let nomeStudente = ''
  if (clienteId) {
    const cliente = await prisma.client.findUnique({
      where: { id: clienteId },
      select: { nomeReferente: true, email: true },
    })
    nomeStudente = cliente?.nomeReferente || cliente?.email || ''
  }

  // Titolo: personalizzato, oppure "DD/MM/YYYY HH:MM – Nome Studente"
  const dataOra = formatDataOra(new Date())
  const titoloAuto = nomeStudente ? `${dataOra} – ${nomeStudente}` : dataOra
  const titolo = body.titolo?.trim() || titoloAuto

  const data: any = { titolo }
  if (clienteId) data.clienteId = clienteId

  const lavagna = await prisma.lavagna.create({
    data,
    include: { cliente: { select: { id: true, nomeReferente: true, email: true } } },
  })

  return NextResponse.json({ lavagna: { ...lavagna, tratti: [], forme: [] } })
}

// ── Aggiorna permessi lavagna (es. canStudentDraw) ────────────────────────────
export async function PATCH(req) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const id = Number(body.id)
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })

  const data: any = {}
  if (typeof body.canStudentDraw === 'boolean') data.canStudentDraw = body.canStudentDraw

  const lavagna = await prisma.lavagna.update({ where: { id }, data })
  return NextResponse.json({ lavagna })
}

// ── Elimina lavagna libera ─────────────────────────────────────────────────────
export async function DELETE(req) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = Number(url.searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })

  // Elimina tratti, forme e la lavagna
  await prisma.lavagnaTratto.deleteMany({ where: { lavagnaId: id } })
  await prisma.lavagnaShape.deleteMany({ where: { lavagnaId: id } })
  await prisma.lavagna.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
