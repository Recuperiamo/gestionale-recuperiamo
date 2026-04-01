// @ts-nocheck
/**
 * GET /api/lavagna-v2/list?clienteId=X
 * - admin/operatore: lista tutte le lavagne v2 libere, o filtrate per clienteId
 * - cliente: lista solo le lavagne assegnate a sé stesso
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
  const url = new URL(req.url)
  const clienteIdParam = url.searchParams.get('clienteId')
  const daysParam = url.searchParams.get('days')

  let where: any = {}

  // Filtro per data: se passato ?days=N mostra solo le lavagne degli ultimi N giorni
  if (daysParam) {
    const days = Number(daysParam)
    if (!isNaN(days) && days > 0) {
      const from = new Date()
      from.setDate(from.getDate() - days)
      where.createdAt = { gte: from }
    }
  }

  if (isStaff) {
    // Admin: filtra per clienteId se passato, altrimenti mostra tutte
    if (clienteIdParam) where.clienteId = Number(clienteIdParam)
  } else {
    // Studente: vede solo le proprie lavagne se abilitato
    const clienteId = session.user?.clienteId
    if (!clienteId) return NextResponse.json({ lavagne: [] })
    // Verifica accesso dal DB (sempre aggiornato, indipendente dal token)
    const cliente = await prisma.client.findUnique({
      where: { id: clienteId },
      select: { lavagnaV2Abilitata: true },
    })
    if (!cliente?.lavagnaV2Abilitata) return NextResponse.json({ error: 'Accesso non abilitato' }, { status: 403 })
    where.clienteId = clienteId
  }

  const lavagne = await prisma.lavagna.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      titolo: true,
      createdAt: true,
      updatedAt: true,
      clienteId: true,
      cliente: { select: { id: true, nomeReferente: true, email: true } },
    },
  })

  return NextResponse.json({ lavagne })
}
