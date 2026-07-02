// @ts-nocheck
// POST /api/migra-schema  — migrazione one-shot old→new schema (admin only)
// Idempotente: usa IF NOT EXISTS / IF EXISTS per ogni step
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/authOptions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || !['admin', 'operatore'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const log: string[] = []

  async function step(label: string, sql: string) {
    try {
      await prisma.$executeRawUnsafe(sql)
      log.push(`✓ ${label}`)
    } catch (e) {
      log.push(`✗ ${label}: ${e.message}`)
    }
  }

  // ── 1. Aggiunge colonna ordine dove mancante ─────────────────────────────────
  await step(
    'ordine su MacroArgomento',
    `ALTER TABLE "MacroArgomento" ADD COLUMN IF NOT EXISTS "ordine" INTEGER NOT NULL DEFAULT 0`
  )
  await step(
    'ordine su Argomento',
    `ALTER TABLE "Argomento" ADD COLUMN IF NOT EXISTS "ordine" INTEGER NOT NULL DEFAULT 0`
  )
  await step(
    'ordine su ArgomentoDidattico (Lezione)',
    `ALTER TABLE "ArgomentoDidattico" ADD COLUMN IF NOT EXISTS "ordine" INTEGER NOT NULL DEFAULT 0`
  )

  // ── 2. Crea tabella QuizLezione ──────────────────────────────────────────────
  await step('crea QuizLezione', `
    CREATE TABLE IF NOT EXISTS "QuizLezione" (
      "quizId"    INTEGER NOT NULL,
      "lezioneId" INTEGER NOT NULL,
      PRIMARY KEY ("quizId", "lezioneId"),
      CONSTRAINT "QuizLezione_quizId_fkey"
        FOREIGN KEY ("quizId")    REFERENCES "Quiz"("id")               ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "QuizLezione_lezioneId_fkey"
        FOREIGN KEY ("lezioneId") REFERENCES "ArgomentoDidattico"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `)
  await step(
    'indice QuizLezione.lezioneId',
    `CREATE INDEX IF NOT EXISTS "QuizLezione_lezioneId_idx" ON "QuizLezione"("lezioneId")`
  )

  // ── 3. Migra lezioneId → QuizLezione (se la colonna esiste ancora) ───────────
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS cnt
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'Quiz'
      AND column_name  = 'lezioneId'
  `)
  const hasLezioneId = rows[0]?.cnt > 0

  if (hasLezioneId) {
    await step('copia lezioneId → QuizLezione', `
      INSERT INTO "QuizLezione" ("quizId", "lezioneId")
      SELECT "id", "lezioneId" FROM "Quiz"
      WHERE  "lezioneId" IS NOT NULL
      ON CONFLICT DO NOTHING
    `)
    await step('rimuovi colonna lezioneId da Quiz', `
      ALTER TABLE "Quiz" DROP COLUMN IF EXISTS "lezioneId"
    `)
  } else {
    log.push('⓪ lezioneId già rimosso — skip migrazione')
  }

  // ── 4. Verifica finale ────────────────────────────────────────────────────────
  const verifica = {
    quizLezioneEsiste: false,
    ordineMacro: false,
    ordineArgomento: false,
    ordineLezione: false,
    righeQuizLezione: 0,
  }
  try {
    const r = await prisma.$queryRawUnsafe(`
      SELECT
        (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_name='QuizLezione')               AS ql_table,
        (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_name='MacroArgomento' AND column_name='ordine') AS om,
        (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_name='Argomento'      AND column_name='ordine') AS oa,
        (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_name='ArgomentoDidattico' AND column_name='ordine') AS ol,
        (SELECT COUNT(*)::int FROM "QuizLezione") AS ql_rows
    `) as any[]
    const v = r[0]
    verifica.quizLezioneEsiste = v.ql_table > 0
    verifica.ordineMacro       = v.om > 0
    verifica.ordineArgomento   = v.oa > 0
    verifica.ordineLezione     = v.ol > 0
    verifica.righeQuizLezione  = v.ql_rows
  } catch (e) {
    log.push(`✗ verifica: ${e.message}`)
  }

  const tuttoOk = verifica.quizLezioneEsiste && verifica.ordineMacro && verifica.ordineArgomento && verifica.ordineLezione

  return NextResponse.json({ ok: tuttoOk, log, verifica })
}
