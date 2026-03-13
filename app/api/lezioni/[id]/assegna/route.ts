// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const argomentoId = Number(params.id);
  const assegnazioni = await prisma.assegnazioneArgomento.findMany({
    where: { argomentoId },
    select: { clienteId: true }
  });
  return NextResponse.json(assegnazioni.map(a => a.clienteId));
}

// Sostituisce tutte le assegnazioni — body: { clienteIds: number[] }
export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const argomentoId = Number(params.id);
  const { clienteIds = [] } = await req.json();
  const ids = clienteIds.map(Number).filter(Boolean);

  await prisma.$transaction([
    prisma.assegnazioneArgomento.deleteMany({ where: { argomentoId } }),
    ...(ids.length > 0
      ? [prisma.assegnazioneArgomento.createMany({
          data: ids.map(clienteId => ({ argomentoId, clienteId })),
          skipDuplicates: true
        })]
      : [])
  ]);

  return NextResponse.json({ ok: true, clienteIds: ids });
}
