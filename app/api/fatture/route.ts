// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function isAdmin(session) {
  const r = session?.user?.role;
  return r === 'admin' || r === 'operatore';
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const anno = searchParams.get('anno');
  const stato = searchParams.get('stato');

  const where: any = {};
  if (anno) where.anno = Number(anno);
  if (stato) where.stato = stato;

  const fatture = await prisma.fattura.findMany({
    where,
    include: { cliente: { select: { id: true, nomeReferente: true, email: true } } },
    orderBy: [{ anno: 'desc' }, { numero: 'desc' }],
  });
  return NextResponse.json(fatture);
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const body = await req.json();
  const { destinatario, voci, data, clienteId, modalitaPagamento, dataScadenzaPagamento, note, stato } = body;

  if (!destinatario || !voci || !voci.length || !data) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 });
  }

  const dataFattura = new Date(data);
  const anno = dataFattura.getFullYear();

  // Calcola numero progressivo per l'anno
  const maxResult = await prisma.fattura.findFirst({
    where: { anno },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });
  const numero = (maxResult?.numero ?? 0) + 1;

  // Calcola totali
  const totaleImponibile = voci.reduce((s, v) => s + (Number(v.totale) || 0), 0);
  const importoBollo = totaleImponibile > 77.47 ? 2 : 0;
  const totale = totaleImponibile + importoBollo;

  const fattura = await prisma.fattura.create({
    data: {
      numero,
      anno,
      data: dataFattura,
      clienteId: clienteId ? Number(clienteId) : null,
      destinatario,
      voci,
      totaleImponibile,
      importoBollo,
      totale,
      modalitaPagamento: modalitaPagamento || 'MP05',
      dataScadenzaPagamento: dataScadenzaPagamento ? new Date(dataScadenzaPagamento) : null,
      stato: stato || 'BOZZA',
      note: note || '',
    },
    include: { cliente: { select: { id: true, nomeReferente: true, email: true } } },
  });

  return NextResponse.json(fattura, { status: 201 });
}
