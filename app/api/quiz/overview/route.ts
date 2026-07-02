// @ts-nocheck
// GET /api/quiz/overview?clienteId=X
// Ritorna tutti i quiz delle lezioni assegnate allo studente, con stato tentativo.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/authOptions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const role = session.user?.role
  const isAdmin = role === 'admin' || role === 'operatore'

  let clienteId: number
  if (isAdmin) {
    const cid = searchParams.get('clienteId')
    if (!cid) return NextResponse.json({ error: 'clienteId richiesto per admin' }, { status: 400 })
    clienteId = Number(cid)
  } else {
    clienteId = Number(session.user?.clienteId)
    if (!clienteId) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  // Lezioni assegnate allo studente → quiz collegati via QuizLezione
  const assegnazioni = await prisma.assegnazioneLezione.findMany({
    where: { clienteId },
    include: {
      lezione: {
        include: {
          quizzes: {
            include: {
              quiz: {
                include: {
                  tentativi: {
                    where: { clienteId },
                    select: { id: true, punteggio: true, completatoAt: true, correzioneManuale: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  const result = assegnazioni
    .map(a => ({
      lezione: { id: a.lezione.id, titolo: a.lezione.titolo, materia: a.lezione.materia },
      quizzes: a.lezione.quizzes
        .map(({ quiz: q }) => ({
          id: q.id,
          titolo: q.titolo,
          numeroDomande: (q.domande as any[]).length,
          tentativo: q.tentativi[0] || null,
        }))
        .sort((a, b) => a.id - b.id),
    }))
    .filter(g => g.quizzes.length > 0)

  return NextResponse.json(result)
}
