// @ts-nocheck
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/authOptions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !['admin', 'operatore'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  try {
    const [nMacro, nArg, nLezioni, nQuiz, nQuizLezione] = await Promise.all([
      prisma.macroArgomento.count(),
      prisma.argomento.count(),
      prisma.lezione.count(),
      prisma.quiz.count(),
      prisma.quizLezione.count(),
    ])

    const [macro, argomenti, lezioni, quiz] = await Promise.all([
      prisma.macroArgomento.findMany({ select: { id: true, nome: true, materia: true } }),
      prisma.argomento.findMany({ select: { id: true, nome: true } }),
      prisma.lezione.findMany({ select: { id: true, titolo: true, materia: true } }),
      prisma.quiz.findMany({ select: { id: true, titolo: true } }),
    ])

    return NextResponse.json({
      conteggi: { macroArgomenti: nMacro, argomenti: nArg, lezioni: nLezioni, quiz: nQuiz, quizLezione: nQuizLezione },
      dati: { macro, argomenti, lezioni, quiz }
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
