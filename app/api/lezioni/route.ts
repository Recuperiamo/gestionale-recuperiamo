// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET — admin: tutti; cliente: solo assegnati
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const role = session.user?.role;
  const isAdmin = role === 'admin' || role === 'operatore';

  if (isAdmin) {
    const argomenti = await prisma.argomentoDidattico.findMany({
      orderBy: [{ materia: 'asc' }, { titolo: 'asc' }],
      include: {
        assegnazioni: {
          include: { cliente: { select: { id: true, nomeReferente: true } } }
        }
      }
    });
    return NextResponse.json(argomenti);
  }

  const clienteId = session.user?.clienteId;
  if (!clienteId) return NextResponse.json([]);

  const assegnazioni = await prisma.assegnazioneArgomento.findMany({
    where: { clienteId: Number(clienteId) },
    include: { argomento: true },
    orderBy: [{ argomento: { materia: 'asc' } }, { argomento: { titolo: 'asc' } }]
  });

  return NextResponse.json(assegnazioni.map(a => a.argomento));
}

// POST — crea argomento (solo admin)
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { titolo, materia, anno, mappaHtml, teoriaHtml, eserciziHtml } = await req.json();
  if (!titolo?.trim()) return NextResponse.json({ error: 'Titolo obbligatorio' }, { status: 400 });

  const argomento = await prisma.argomentoDidattico.create({
    data: {
      titolo: titolo.trim(),
      materia: materia?.trim() || 'Generale',
      anno: anno?.trim() || null,
      mappaHtml: mappaHtml || null,
      teoriaHtml: teoriaHtml || null,
      eserciziHtml: eserciziHtml || null,
    }
  });

  return NextResponse.json(argomento, { status: 201 });
}
