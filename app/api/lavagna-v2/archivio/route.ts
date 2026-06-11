// @ts-nocheck
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/authOptions'
import { PrismaClient } from '@prisma/client'

const prisma = global.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.prisma = prisma

// GET /api/lavagna-v2/archivio
// Restituisce le lavagne archiviate (archivedAt IS NOT NULL) con cliente, per la pagina archivio admin
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !['admin', 'operatore'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const lavagne = await prisma.lavagna.findMany({
    where: { archivedAt: { not: null } },
    orderBy: { archivedAt: 'desc' },
    include: {
      cliente: { select: { id: true, nomeReferente: true, email: true } },
      attivita: { select: { orario: true } },
    },
  })

  return NextResponse.json({ lavagne })
}
