// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const argomenti = await prisma.argomento.findMany({
    orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
    include: {
      macroArgomento: true,
      lezioni: { orderBy: [{ anno: 'asc' }, { titolo: 'asc' }] }
    }
  });

  return NextResponse.json(argomenti);
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { nome, macroArgomentoId, ordine } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });

  const argomento = await prisma.argomento.create({
    data: {
      nome: nome.trim(),
      macroArgomentoId: macroArgomentoId ? Number(macroArgomentoId) : null,
      ordine: ordine ?? 0,
    },
    include: { macroArgomento: true }
  });

  return NextResponse.json(argomento, { status: 201 });
}
