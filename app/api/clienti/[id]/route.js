import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Endpoint dettaglio cliente: GET /api/clienti/:id
export async function GET(request, { params }) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "ID cliente mancante" }, { status: 400 });
  }
  try {
    const cliente = await prisma.client.findUnique({
      where: { id: Number(id) },
    });
    if (!cliente) {
      return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });
    }
    return NextResponse.json(cliente, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Errore durante la lettura del dettaglio cliente: " + error.message },
      { status: 500 }
    );
  }
}