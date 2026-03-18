// @ts-nocheck
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/authOptions'
import { prisma } from '../../../lib/prisma'

/** GET — leggi stato accesso lavagna v2 del cliente */
export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  const id = Number(params.id)
  if (!id) return NextResponse.json({ error: 'ID non valido' }, { status: 400 })

  const cliente = await prisma.client.findUnique({
    where: { id },
    select: { id: true, lavagnaV2Abilitata: true },
  })
  if (!cliente) return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
  return NextResponse.json({ lavagnaV2Abilitata: cliente.lavagnaV2Abilitata })
}

/** PATCH — abilita/disabilita accesso lavagna v2 per lo studente */
export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  const id = Number(params.id)
  if (!id) return NextResponse.json({ error: 'ID non valido' }, { status: 400 })

  const body = await req.json()
  const abilitata = !!body.lavagnaV2Abilitata

  const updated = await prisma.client.update({
    where: { id },
    data: { lavagnaV2Abilitata: abilitata },
    select: { id: true, lavagnaV2Abilitata: true },
  })
  return NextResponse.json({ lavagnaV2Abilitata: updated.lavagnaV2Abilitata })
}
