// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET — admin: tutte; cliente: solo assegnate
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const role = session.user?.role;
  const isAdmin = role === 'admin' || role === 'operatore';

  if (isAdmin) {
    const lezioni = await prisma.lezione.findMany({
      orderBy: [{ materia: 'asc' }, { titolo: 'asc' }],
      include: {
        argomento: { include: { macroArgomento: true } },
        macroArgomento: true,
        assegnazioni: {
          include: { cliente: { select: { id: true, nomeReferente: true } } }
        }
      }
    });
    return NextResponse.json(lezioni);
  }

  const clienteId = session.user?.clienteId;
  if (!clienteId) return NextResponse.json([]);

  const assegnazioni = await prisma.assegnazioneLezione.findMany({
    where: { clienteId: Number(clienteId) },
    include: {
      lezione: {
        include: {
          argomento: { include: { macroArgomento: true } },
          macroArgomento: true,
        }
      }
    },
    orderBy: [{ lezione: { materia: 'asc' } }, { lezione: { titolo: 'asc' } }]
  });

  return NextResponse.json(assegnazioni.map(a => a.lezione));
}

// POST — crea lezione (solo admin)
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { titolo, materia, anno, argomentoId, macroArgomentoId, mappaHtml, teoriaHtml, eserciziHtml } = await req.json();
  if (!titolo?.trim()) return NextResponse.json({ error: 'Titolo obbligatorio' }, { status: 400 });

  const lezione = await prisma.lezione.create({
    data: {
      titolo: titolo.trim(),
      materia: materia?.trim() || 'Generale',
      anno: anno?.trim() || null,
      argomentoId: argomentoId ? Number(argomentoId) : null,
      macroArgomentoId: macroArgomentoId ? Number(macroArgomentoId) : null,
      mappaHtml: mappaHtml || null,
      teoriaHtml: teoriaHtml || null,
      eserciziHtml: eserciziHtml || null,
    }
  });

  return NextResponse.json(lezione, { status: 201 });
}
