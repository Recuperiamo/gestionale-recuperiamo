export const runtime = "nodejs";
console.log("==> CARICATO route.js CORRETTO IN app/api/pacchetti/[id]/route.js");
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request, contextPromise) {
  const { params } = await contextPromise;
  const id = Number(params.id);
  try {
    const pacchetto = await prisma.pacchettoOre.findUnique({
      where: { id },
      include: { cliente: true }
    });
    if (!pacchetto) {
      return NextResponse.json({ error: "Pacchetto non trovato" }, { status: 404 });
    }
    return NextResponse.json(pacchetto);
  } catch (error) {
    return NextResponse.json({ error: "Errore nel recupero pacchetto" }, { status: 500 });
  }
}

export async function PUT(request, contextPromise) {
  const { params } = await contextPromise;
  const id = Number(params.id);
  const data = await request.json();
  try {
    const pacchettoAggiornato = await prisma.pacchettoOre.update({
      where: { id },
      data,
    });
    return NextResponse.json(pacchettoAggiornato);
  } catch (error) {
    return NextResponse.json({ error: "Pacchetto non trovato o update fallito" }, { status: 404 });
  }
}

export async function DELETE(request, contextPromise) {
  const { params } = await contextPromise;
  const id = Number(params.id);
  try {
    await prisma.pacchettoOre.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Pacchetto non trovato o delete fallita" }, { status: 404 });
  }
}