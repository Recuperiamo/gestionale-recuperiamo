// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET ?key=lezioniCss
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  if (key) {
    const config = await prisma.config.findUnique({ where: { key } });
    return NextResponse.json({ value: config?.value ?? null });
  }

  const all = await prisma.config.findMany();
  return NextResponse.json(Object.fromEntries(all.map(c => [c.key, c.value])));
}

// POST { key, value }
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { key, value } = await req.json();
  if (!key) return NextResponse.json({ error: 'Key obbligatoria' }, { status: 400 });

  const config = await prisma.config.upsert({
    where: { key },
    update: { value: value ?? '' },
    create: { key, value: value ?? '' }
  });

  return NextResponse.json(config);
}
