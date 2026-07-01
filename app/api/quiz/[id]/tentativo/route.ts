// @ts-nocheck
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/authOptions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/quiz/[id]/tentativo  — il mio tentativo (studente) o tutti (admin)
export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const quizId = Number(params.id)
  const role = session.user?.role
  const isAdmin = role === 'admin' || role === 'operatore'

  if (isAdmin) {
    const tentativi = await prisma.tentativoQuiz.findMany({
      where: { quizId },
      include: { cliente: { select: { id: true, nomeReferente: true, nome: true, cognome: true } } },
      orderBy: { completatoAt: 'desc' },
    })
    return NextResponse.json(tentativi)
  }

  const clienteId = Number(session.user?.clienteId)
  const tentativo = await prisma.tentativoQuiz.findUnique({
    where: { quizId_clienteId: { quizId, clienteId } },
  })
  return NextResponse.json(tentativo || null)
}

// POST /api/quiz/[id]/tentativo  — invia tentativo (studente)
export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const quizId = Number(params.id)
  const clienteId = Number(session.user?.clienteId)
  if (!clienteId) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  // Verifica assegnazione lezione (almeno una delle lezioni collegate)
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { lezioni: { select: { lezioneId: true } } },
  })
  if (!quiz) return NextResponse.json({ error: 'Quiz non trovato' }, { status: 404 })

  const isAdmin = session.user?.role === 'admin' || session.user?.role === 'operatore'
  if (!isAdmin) {
    const lezioneIds = quiz.lezioni.map(l => l.lezioneId)
    const assegnato = await prisma.assegnazioneLezione.findFirst({
      where: { lezioneId: { in: lezioneIds }, clienteId },
    })
    if (!assegnato) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // Impedisce doppio tentativo (unico per quiz+cliente)
  const esistente = await prisma.tentativoQuiz.findUnique({
    where: { quizId_clienteId: { quizId, clienteId } },
  })
  if (esistente) return NextResponse.json({ error: 'Hai già completato questo quiz' }, { status: 409 })

  const body = await req.json()
  const risposte = body.risposte || {}

  // Auto-grading
  const domande = quiz.domande as any[]
  let corrette = 0
  let totaleAuto = 0
  for (let i = 0; i < domande.length; i++) {
    const d = domande[i]
    const risposta = risposte[String(i)]
    const isManuale = d.tipo === 'testo_libero' || (d.tipo === 'completamento' && !d.rispostaCorretta?.trim())
    if (isManuale) continue
    totaleAuto++
    if (risposta === undefined || risposta === null || risposta === '') continue
    if (d.tipo === 'mcq' || d.tipo === 'vero_falso') {
      if (String(risposta).trim() === String(d.rispostaCorretta).trim()) corrette++
    } else if (d.tipo === 'completamento') {
      if (String(risposta).trim().toLowerCase() === String(d.rispostaCorretta || '').trim().toLowerCase()) corrette++
    }
  }

  const hasManual = domande.some(d => d.tipo === 'testo_libero' || (d.tipo === 'completamento' && !d.rispostaCorretta?.trim()))
  const punteggio = totaleAuto > 0 ? (corrette / totaleAuto) * 100 : (hasManual ? null : 100)

  const tentativo = await prisma.tentativoQuiz.create({
    data: {
      quizId,
      clienteId,
      risposte,
      punteggio: hasManual ? null : punteggio,
      totaleAutomatico: totaleAuto,
    },
  })
  return NextResponse.json({ ...tentativo, corrette, totaleAuto }, { status: 201 })
}
