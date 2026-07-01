// @ts-nocheck
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]/authOptions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PATCH /api/quiz/[id]/tentativo/[tid]  — correzione manuale (admin)
export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const tid = Number(params.tid)
  const body = await req.json()
  const correzioneManuale = body.correzioneManuale || {}

  const tentativo = await prisma.tentativoQuiz.findUnique({ where: { id: tid }, include: { quiz: true } })
  if (!tentativo) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const domande = tentativo.quiz.domande as any[]
  const manuali = domande.filter(d => d.tipo === 'testo_libero')
  const corrcteManuali = Object.values(correzioneManuale as Record<string, { corretto: boolean }>)
    .filter(v => v.corretto).length

  const totaleAuto = tentativo.totaleAutomatico ?? 0
  const risposte = tentativo.risposte as Record<string, any>
  let corretteAuto = 0
  for (let i = 0; i < domande.length; i++) {
    const d = domande[i]
    if (d.tipo === 'testo_libero') continue
    const r = risposte[String(i)]
    if (!r) continue
    if (d.tipo === 'mcq' || d.tipo === 'vero_falso') {
      if (String(r).trim() === String(d.rispostaCorretta).trim()) corretteAuto++
    } else if (d.tipo === 'completamento') {
      if (String(r).trim().toLowerCase() === String(d.rispostaCorretta).trim().toLowerCase()) corretteAuto++
    }
  }

  const totaleDomande = totaleAuto + manuali.length
  const punteggio = totaleDomande > 0 ? ((corretteAuto + corrcteManuali) / totaleDomande) * 100 : 100

  const updated = await prisma.tentativoQuiz.update({
    where: { id: tid },
    data: { correzioneManuale, punteggio },
  })
  return NextResponse.json(updated)
}
