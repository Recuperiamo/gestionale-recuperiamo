// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const macroArgomenti = await prisma.macroArgomento.findMany({
    orderBy: [{ materia: 'asc' }, { ordine: 'asc' }, { nome: 'asc' }],
    include: {
      argomenti: {
        orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
        include: {
          lezioni: { orderBy: [{ anno: 'asc' }, { titolo: 'asc' }] }
        }
      },
      lezioni: { orderBy: [{ anno: 'asc' }, { titolo: 'asc' }] }
    }
  });

  return NextResponse.json(macroArgomenti);
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { nome, materia, ordine } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });

  const macro = await prisma.macroArgomento.create({
    data: {
      nome: nome.trim(),
      materia: materia?.trim() || 'Generale',
      ordine: ordine ?? 0,
    }
  });

  return NextResponse.json(macro, { status: 201 });
}
