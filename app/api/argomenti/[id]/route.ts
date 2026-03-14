// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const id = Number(params.id);
  const body = await req.json();
  const data = {};
  if (body.nome !== undefined) data.nome = body.nome.trim();
  if (body.macroArgomentoId !== undefined) data.macroArgomentoId = body.macroArgomentoId ? Number(body.macroArgomentoId) : null;
  if (body.ordine !== undefined) data.ordine = Number(body.ordine);

  // Operazione speciale: promuovi ad MacroArgomento
  if (body.op === 'promuovi') {
    const arg = await prisma.argomento.findUnique({ where: { id }, include: { macroArgomento: true } });
    const nuovoMacro = await prisma.macroArgomento.create({
      data: {
        nome: arg.nome,
        materia: arg.macroArgomento?.materia || 'Generale',
        ordine: 0,
      }
    });
    // Sposta le lezioni figlie al nuovo macroArgomento
    await prisma.lezione.updateMany({
      where: { argomentoId: id },
      data: { macroArgomentoId: nuovoMacro.id, argomentoId: null }
    });
    await prisma.argomento.delete({ where: { id } });
    return NextResponse.json({ ok: true, nuovoMacro });
  }

  const updated = await prisma.argomento.update({
    where: { id },
    data,
    include: { macroArgomento: true }
  });
  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  await prisma.argomento.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ ok: true });
}
