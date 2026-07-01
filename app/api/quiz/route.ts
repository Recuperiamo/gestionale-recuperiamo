// @ts-nocheck
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/authOptions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/quiz?lezioneId=X
export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const lezioneId = Number(searchParams.get('lezioneId'))
  if (!lezioneId) return NextResponse.json({ error: 'lezioneId richiesto' }, { status: 400 })

  const role = session.user?.role
  const isAdmin = role === 'admin' || role === 'operatore'

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
