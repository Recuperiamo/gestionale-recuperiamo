// @ts-nocheck
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]/authOptions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const LIVELLO_PCT: Record<string, number> = {
  completo: 1,
  incompleto: 0.7,
  parziale: 0.35,
  insufficiente: 0,
}

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
  const risposte = tentativo.risposte as Record<string, any>

  // Auto-graded questions: count correct (each worth 1 point)
  let corretteAuto = 0
  let totaleAuto = 0
  for (let i = 0; i < domande.length; i++) {
    const d = domande[i]
    if (d.tipo === 'testo_libero') continue
    totaleAuto++
    const r = risposte[String(i)]
    if (!r) continue
    if (d.tipo === 'mcq' || d.tipo === 'vero_falso') {
      if (String(r).trim() === String(d.rispostaCorretta).trim()) corretteAuto++
    } else if (d.tipo === 'completamento') {
      if (String(r).trim().toLowerCase() === String(d.rispostaCorretta).trim().toLowerCase()) corretteAuto++
    }
  }

  // Manual questions: weighted by peso (default 1), scored by livello pct
  // Backward-compat: if corr has `corretto: boolean` (old format), treat true=1 false=0
  let punteggiManuali = 0
  let pesoTotaleManuali = 0
  for (let i = 0; i < domande.length; i++) {
    const d = domande[i]
    if (d.tipo !== 'testo_libero') continue
    const peso = Number(d.peso) >= 1 ? Math.round(Number(d.peso)) : 1
    pesoTotaleManuali += peso
    const corr = (correzioneManuale as Record<string, any>)[String(i)]
    if (!corr) continue
    if (typeof corr.livello === 'string' && LIVELLO_PCT[corr.livello] !== undefined) {
      punteggiManuali += LIVELLO_PCT[corr.livello] * peso
    } else if (typeof corr.corretto === 'boolean') {
      // legacy binary format
      punteggiManuali += corr.corretto ? peso : 0
    }
  }

  // Total score: (auto_correct + weighted_manual_score) / (auto_count + manual_weight) * 100
  const denominatore = totaleAuto + pesoTotaleManuali
  const punteggio = denominatore > 0 ? ((corretteAuto + punteggiManuali) / denominatore) * 100 : 100

  const updated = await prisma.tentativoQuiz.update({
    where: { id: tid },
    data: { correzioneManuale, punteggio },
  })
  return NextResponse.json(updated)
}

// DELETE /api/quiz/[id]/tentativo/[tid]  — azzera tentativo (admin)
export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const tid = Number(params.tid)
  await prisma.tentativoQuiz.delete({ where: { id: tid } })
  return NextResponse.json({ ok: true })
}
