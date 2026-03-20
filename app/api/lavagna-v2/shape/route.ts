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
  const { lavagnaId, type, x, y, width, height, x2, y2, color, strokeWidth, fillColor, text, fontSize, rotation, imageUrl } = body

  if (!lavagnaId || !type) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  // Ricava autoreUserId dall'id utente in sessione
  const rawId = session.user?.id
  const autoreUserId = rawId ? (isNaN(Number(rawId)) ? null : Number(rawId)) : null

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
      src: imageUrl ?? null,
      ...(autoreUserId ? { autoreUserId } : {}),
    },
  })

  return NextResponse.json({ shape: { dbId: shape.id } }, { status: 201 })
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const url = new URL(req.url)
  const id = Number(url.searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })

  const isAdmin = session.user?.role === 'admin' || session.user?.role === 'operatore'

  if (!isAdmin) {
    // Studente: può cancellare solo le proprie forme
    const shape = await prisma.lavagnaShape.findUnique({ where: { id }, select: { autoreUserId: true } })
    if (!shape) return NextResponse.json({ error: 'Forma non trovata' }, { status: 404 })
    const rawId = session.user?.id
    const userId = rawId ? (isNaN(Number(rawId)) ? rawId : Number(rawId)) : null
    if (String(shape.autoreUserId) !== String(userId)) {
      return NextResponse.json({ error: 'Puoi cancellare solo le tue forme' }, { status: 403 })
    }
  }

  await prisma.lavagnaShape.deleteMany({ where: { id } })
  return NextResponse.json({ ok: true })
}
