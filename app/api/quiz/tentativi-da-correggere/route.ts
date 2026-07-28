// @ts-nocheck
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/authOptions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/quiz/tentativi-da-correggere  —  tentativi consegnati in attesa di correzione manuale (admin/operatore)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const tentativi = await prisma.tentativoQuiz.findMany({
    where: { punteggio: null },
    orderBy: { completatoAt: 'asc' },
    select: {
      id: true,
      quizId: true,
      completatoAt: true,
      quiz: { select: { id: true, titolo: true } },
      cliente: { select: { id: true, nomeReferente: true, nome: true, cognome: true } },
    },
  })
  return NextResponse.json(tentativi)
}
