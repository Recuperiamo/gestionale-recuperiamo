// @ts-nocheck
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/authOptions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/quiz?lezioneId=X  oppure  GET /api/quiz  (admin: tutti i quiz con info lezione)
export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const lezioneIdRaw = searchParams.get('lezioneId')
  const lezioneId = lezioneIdRaw ? Number(lezioneIdRaw) : null

  const role = session.user?.role
  const isAdmin = role === 'admin' || role === 'operatore'

  // Nessuna lezione specificata → admin ottiene tutti i quiz con info lezione
  if (!lezioneId) {
    if (!isAdmin) return NextResponse.json({ error: 'lezioneId richiesto' }, { status: 400 })
    const tutti = await prisma.quiz.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, titolo: true, createdAt: true, domande: true, lezioneId: true,
        lezione: { select: { id: true, titolo: true, materia: true } },
        _count: { select: { tentativi: true } },
      },
    })
    return NextResponse.json(tutti)
  }

  if (!isAdmin) {
    const clienteId = Number(session.user?.clienteId)
    const assegnato = await prisma.assegnazioneLezione.findUnique({
      where: { lezioneId_clienteId: { lezioneId, clienteId } },
    })
    if (!assegnato) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const quizzes = await prisma.quiz.findMany({
    where: { lezioneId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, titolo: true, createdAt: true,
      domande: true,
      _count: { select: { tentativi: true } },
    },
  })

  return NextResponse.json(quizzes)
}

// POST /api/quiz  — crea quiz (admin only)
export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const body = await req.json()
  const { lezioneId, titolo, domande } = body
  if (!lezioneId || !titolo?.trim() || !Array.isArray(domande) || domande.length === 0) {
    return NextResponse.json({ error: 'Dati incompleti' }, { status: 400 })
  }

  const quiz = await prisma.quiz.create({
    data: { lezioneId: Number(lezioneId), titolo: titolo.trim(), domande },
  })
  return NextResponse.json(quiz, { status: 201 })
}
