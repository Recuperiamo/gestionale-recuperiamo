// @ts-nocheck
/**
 * GET /api/lavagna-v2/list
 * Restituisce tutte le lavagne v2 (attivitaId = null), ordinate per data decrescente.
 * In futuro, con il merge col calendario, includerà anche quelle con attivitaId
 * filtrate per clienteId.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/authOptions'
import { PrismaClient } from '@prisma/client'

const prisma = global.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.prisma = prisma

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const isStaff = session.user?.role === 'admin' || session.user?.role === 'operatore'

  // Per ora: lista tutte le lavagne libere (attivitaId null)
  // Futuro: filtra per clienteId quando integrato col calendario
  const where = isStaff
    ? { attivitaId: null }
    : { attivitaId: null } // studenti vedranno solo le proprie (TODO: aggiungere campo clienteId su Lavagna al merge)

  const lavagne = await prisma.lavagna.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      titolo: true,
      createdAt: true,
      updatedAt: true,
      attivitaId: true,
    },
  })

  return NextResponse.json({ lavagne })
}
