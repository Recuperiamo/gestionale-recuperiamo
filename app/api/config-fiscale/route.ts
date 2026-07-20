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

  let cfg = await prisma.configFiscale.findFirst();
  if (!cfg) {
    cfg = await prisma.configFiscale.create({ data: {} });
  }
  return NextResponse.json(cfg);
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const data = await req.json();
  const allowed = ['nome','cognome','partitaIva','codiceFiscale','indirizzo','cap','comune',
    'provincia','paese','email','pec','telefono','iban','banca','regimeFiscale','codiceAteco'];
  const update = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));

  let cfg = await prisma.configFiscale.findFirst();
  if (!cfg) {
    cfg = await prisma.configFiscale.create({ data: update });
  } else {
    cfg = await prisma.configFiscale.update({ where: { id: cfg.id }, data: update });
  }
  return NextResponse.json(cfg);
}
