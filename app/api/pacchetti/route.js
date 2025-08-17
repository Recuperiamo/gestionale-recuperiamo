import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function parseJsonBody(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function GET() {
  console.log("SONO NELLA GET DEL CRUD REALE PACCHETTI");
  try {
    const pacchetti = await prisma.pacchettoOre.findMany({
      include: { cliente: true },
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(pacchetti);
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero pacchetti' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await parseJsonBody(req);
    if (!data) return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
    const nuovoPacchetto = await prisma.pacchettoOre.create({ data });
    return NextResponse.json(nuovoPacchetto, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Errore nella creazione pacchetto' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const data = await parseJsonBody(req);
    if (!data) return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
    const { id, ...updateData } = data;
    if (!id) return NextResponse.json({ error: 'ID pacchetto mancante' }, { status: 400 });
    const updated = await prisma.pacchettoOre.update({ where: { id }, data: updateData });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Errore aggiornamento pacchetto' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const data = await parseJsonBody(req);
    if (!data) return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
    const { id } = data;
    if (!id) return NextResponse.json({ error: 'ID pacchetto mancante' }, { status: 400 });
    await prisma.pacchettoOre.delete({ where: { id } });
    return NextResponse.json({ result: 'Pacchetto eliminato' });
  } catch (error) {
    return NextResponse.json({ error: 'Impossibile eliminare il pacchetto' }, { status: 500 });
  }
}