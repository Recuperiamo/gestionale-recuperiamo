// @ts-nocheck
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/authOptions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/quiz/[id]
export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const id = Number(params.id)
  const role = session.user?.role
  const isAdmin = role === 'admin' || role === 'operatore'

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      lezioni: { select: { lezione: { select: { id: true, titolo: true } } } },
      tentativi: isAdmin ? {
        include: { cliente: { select: { id: true, nomeReferente: true, nome: true, cognome: true } } },
        orderBy: { completatoAt: 'desc' },
      } : false,
    },
  })
  if (!quiz) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  if (!isAdmin) {
    const clienteId = Number(session.user?.clienteId)
    const lezioneIds = quiz.lezioni.map(l => l.lezione.id)
    const assegnato = await prisma.assegnazioneLezione.findFirst({
      where: { lezioneId: { in: lezioneIds }, clienteId },
    })
    if (!assegnato) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    const mioTentativo = await prisma.tentativoQuiz.findUnique({
      where: { quizId_clienteId: { quizId: id, clienteId } },
    })
    return NextResponse.json({ ...quiz, mioTentativo: mioTentativo || null })
  }

  return NextResponse.json(quiz)
}

// PATCH /api/quiz/[id]
// Body: { titolo?, domande?, lezioneIds? }
export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const id = Number(params.id)
  const body = await req.json()
  const data: any = {}
  if (body.titolo !== undefined) data.titolo = body.titolo.trim()
  if (body.domande !== undefined) data.domande = body.domande

  // Aggiorna lezioni collegate se fornite
  if (Array.isArray(body.lezioneIds)) {
    data.lezioni = {
      deleteMany: {},
      create: body.lezioneIds.map(lid => ({ lezioneId: Number(lid) })),
    }
  }

  const updated = await prisma.quiz.update({
    where: { id },
    data,
    include: {
      lezioni: { select: { lezione: { select: { id: true, titolo: true, materia: true } } } },
    },
  })
  return NextResponse.json(updated)
}

// DELETE /api/quiz/[id]
export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  await prisma.quiz.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
