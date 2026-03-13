// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const id = Number(params.id);
  const role = session.user?.role;
  const isAdmin = role === 'admin' || role === 'operatore';

  const argomento = await prisma.argomentoDidattico.findUnique({
    where: { id },
    include: {
      assegnazioni: { include: { cliente: { select: { id: true, nomeReferente: true } } } }
    }
  });

  if (!argomento) return NextResponse.json({ error: 'Non trovato' }, { status: 404 });

  if (!isAdmin) {
    const clienteId = Number(session.user?.clienteId);
    const assegnato = argomento.assegnazioni.some(a => a.clienteId === clienteId);
    if (!assegnato) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  return NextResponse.json(argomento);
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const id = Number(params.id);
  const body = await req.json();
  const data = {};
  if (body.titolo !== undefined) data.titolo = body.titolo.trim();
  if (body.materia !== undefined) data.materia = body.materia.trim() || 'Generale';
  if (body.anno !== undefined) data.anno = body.anno?.trim() || null;
  if (body.tags !== undefined) data.tags = Array.isArray(body.tags) ? body.tags.map(t => t.trim()).filter(Boolean) : [];
  if (body.mappaHtml !== undefined) data.mappaHtml = body.mappaHtml || null;
  if (body.teoriaHtml !== undefined) data.teoriaHtml = body.teoriaHtml || null;
  if (body.eserciziHtml !== undefined) data.eserciziHtml = body.eserciziHtml || null;

  const updated = await prisma.argomentoDidattico.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  await prisma.argomentoDidattico.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ ok: true });
}
