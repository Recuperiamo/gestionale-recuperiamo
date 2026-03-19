// @ts-nocheck
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/authOptions'
import { PrismaClient } from '@prisma/client'

const prisma = global.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.prisma = prisma

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { lavagnaId, type, x, y, width, height, x2, y2, color, strokeWidth, fillColor, text, fontSize, rotation } = body

  if (!lavagnaId || !type) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  const shape = await prisma.lavagnaShape.create({
    data: {
      lavagnaId: Number(lavagnaId),
      kind: type,
      x: x ?? 0,
      y: y ?? 0,
      w: width ?? null,
      h: height ?? null,
      x2: x2 ?? null,
      y2: y2 ?? null,
      colore: color ?? null,
      spessore: strokeWidth ?? null,
      rotation: rotation ?? null,
      titolo: text ?? null,
    },
  })

  return NextResponse.json({ shape: { dbId: shape.id } }, { status: 201 })
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = Number(url.searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })

  await prisma.lavagnaShape.deleteMany({ where: { id } })
  return NextResponse.json({ ok: true })
}
