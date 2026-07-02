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

  async function safe(label: string, fn: () => Promise<any>) {
    try { return { ok: true, value: await fn() } }
    catch (e) { return { ok: false, error: e.message } }
  }

  const [rMacro, rArg, rLezioni, rQuiz, rQuizLez] = await Promise.all([
    safe('macroArgomenti', () => prisma.macroArgomento.findMany({ select: { id: true, nome: true, materia: true } })),
    safe('argomenti',      () => prisma.argomento.findMany({ select: { id: true, nome: true } })),
    safe('lezioni',        () => prisma.lezione.findMany({ select: { id: true, titolo: true, materia: true } })),
    safe('quiz',           () => prisma.quiz.findMany({ select: { id: true, titolo: true } })),
    safe('quizLezione',    () => prisma.quizLezione.count()),
  ])

  return NextResponse.json({
    macroArgomenti: rMacro,
    argomenti: rArg,
    lezioni: rLezioni,
    quiz: rQuiz,
    quizLezione: rQuizLez,
  })
}
