// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const clienteId = session.user?.clienteId;
  if (!clienteId) return NextResponse.json([]);

  const fatture = await prisma.fattura.findMany({
    where: {
      clienteId: Number(clienteId),
      stato: { in: ['EMESSA', 'PAGATA'] },
    },
    select: {
      id: true, numero: true, anno: true, data: true,
      destinatario: true, voci: true,
      totaleImponibile: true, importoBollo: true,
      importoRivalsaInps: true, applicaRivalsaInps: true,
      totale: true, modalitaPagamento: true, stato: true, note: true,
    },
    orderBy: [{ anno: 'desc' }, { numero: 'desc' }],
  });

  return NextResponse.json(fatture);
}
