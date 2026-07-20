// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function isAdmin(session) {
  const r = session?.user?.role;
  return r === 'admin' || r === 'operatore';
}

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const fattura = await prisma.fattura.findUnique({
    where: { id: Number(params.id) },
    include: { cliente: { select: { id: true, nomeReferente: true, email: true } } },
  });
  if (!fattura) return NextResponse.json({ error: 'Non trovata' }, { status: 404 });
  return NextResponse.json(fattura);
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const body = await req.json();
  const { destinatario, voci, data, clienteId, modalitaPagamento, dataScadenzaPagamento, note, stato } = body;

  const update: any = {};
  if (destinatario !== undefined) update.destinatario = destinatario;
  if (note !== undefined) update.note = note;
  if (stato !== undefined) update.stato = stato;
  if (modalitaPagamento !== undefined) update.modalitaPagamento = modalitaPagamento;
  if (dataScadenzaPagamento !== undefined) update.dataScadenzaPagamento = dataScadenzaPagamento ? new Date(dataScadenzaPagamento) : null;
  if (clienteId !== undefined) update.clienteId = clienteId ? Number(clienteId) : null;

  if (data !== undefined) update.data = new Date(data);

  if (voci !== undefined) {
    update.voci = voci;
    const totaleImponibile = voci.reduce((s, v) => s + (Number(v.totale) || 0), 0);
    const importoBollo = totaleImponibile > 77.47 ? 2 : 0;
    update.totaleImponibile = totaleImponibile;
    update.importoBollo = importoBollo;
    update.totale = totaleImponibile + importoBollo;
  }

  const fattura = await prisma.fattura.update({
    where: { id: Number(params.id) },
    data: update,
    include: { cliente: { select: { id: true, nomeReferente: true, email: true } } },
  });
  return NextResponse.json(fattura);
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const fattura = await prisma.fattura.findUnique({ where: { id: Number(params.id) } });
  if (!fattura) return NextResponse.json({ error: 'Non trovata' }, { status: 404 });
  if (fattura.stato !== 'BOZZA') return NextResponse.json({ error: 'Solo le bozze possono essere eliminate' }, { status: 400 });

  await prisma.fattura.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ ok: true });
}
