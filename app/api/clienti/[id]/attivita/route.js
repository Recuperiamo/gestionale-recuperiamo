// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma"; // 5 livelli su fino alla root

// GET /api/clienti/[id]/attivita
export async function GET(request, { params }) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID non valido" }, { status: 400 });
    }

    const attivita = await prisma.attivita.findMany({
      where: { clienteId: id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(attivita);
  } catch (e) {
    console.error("Errore GET /api/clienti/[id]/attivita:", e);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}