import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/clienti/[id]/attivita
export async function GET(request, { params }) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  try {
    const attivita = await prisma.attivita.findMany({
      where: {
        pacchetto: {
          clienteId: parseInt(id)
        }
      },
      include: {
        pacchetto: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    return NextResponse.json(attivita);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}