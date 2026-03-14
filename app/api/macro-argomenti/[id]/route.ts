// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/authOptions';
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
  if (body.materia !== undefined) data.materia = body.materia.trim() || 'Generale';
  if (body.ordine !== undefined) data.ordine = Number(body.ordine);

  // Operazione speciale: declassa a Argomento di un altro MacroArgomento
  if (body.op === 'declassa') {
    const { nuovoMacroArgomentoId } = body;
    // Crea un Argomento con lo stesso nome
    const nuovoArgomento = await prisma.argomento.create({
      data: {
        nome: (await prisma.macroArgomento.findUnique({ where: { id } }))?.nome || '',
        macroArgomentoId: nuovoMacroArgomentoId ? Number(nuovoMacroArgomentoId) : null,
        ordine: 0,
      }
    });
    // Sposta le lezioni figlie al nuovo argomento
    await prisma.lezione.updateMany({
      where: { macroArgomentoId: id },
      data: { argomentoId: nuovoArgomento.id, macroArgomentoId: null }
    });
    // Sposta gli argomenti figli al nuovo macroArgomento (se specificato)
    if (nuovoMacroArgomentoId) {
      await prisma.argomento.updateMany({
        where: { macroArgomentoId: id },
        data: { macroArgomentoId: Number(nuovoMacroArgomentoId) }
      });
    }
    await prisma.macroArgomento.delete({ where: { id } });
    return NextResponse.json({ ok: true, nuovoArgomento });
  }

  const updated = await prisma.macroArgomento.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  await prisma.macroArgomento.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ ok: true });
}
