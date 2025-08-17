import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper per parse body robusto
async function parseJsonBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// GET: lista clienti
export async function GET() {
  try {
    const clienti = await prisma.client.findMany({
      include: { pacchetti: true },
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(clienti);
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero clienti' }, { status: 500 });
  }
}

// POST: crea cliente
export async function POST(req: NextRequest) {
  try {
    const data = await parseJsonBody(req);
    if (!data) return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
    const nuovoCliente = await prisma.client.create({ data });
    return NextResponse.json(nuovoCliente, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Errore nella creazione cliente' }, { status: 500 });
  }
}

// PATCH: aggiorna cliente
export async function PATCH(req: NextRequest) {
  try {
    const data = await parseJsonBody(req);
    if (!data) return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
    const { id, ...updateData } = data;
    if (!id) return NextResponse.json({ error: 'ID cliente mancante' }, { status: 400 });
    const updated = await prisma.client.update({ where: { id }, data: updateData });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Errore aggiornamento cliente' }, { status: 500 });
  }
}

// DELETE: elimina cliente
export async function DELETE(req: NextRequest) {
  try {
    const data = await parseJsonBody(req);
    if (!data) return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
    const { id } = data;
    if (!id) return NextResponse.json({ error: 'ID cliente mancante' }, { status: 400 });
    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Impossibile eliminare il cliente' }, { status: 500 });
  }
}