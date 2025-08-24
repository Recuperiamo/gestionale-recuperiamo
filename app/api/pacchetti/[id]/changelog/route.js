import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
// GET /api/pacchetti/[id]/changelog
export async function GET(request, { params }) {
  const { id } = params;
  if (!id || isNaN(parseInt(id))) {
    return NextResponse.json({ error: "Parametro id non valido." }, { status: 400 });
  }
  try {
    const changelog = await prisma.pacchetto_ChangeLog.findMany({
      where: { pacchettoId: parseInt(id) },
      orderBy: { timestamp: "asc" },
      include: { attivita: true, pacchetto: true },
    });
    return NextResponse.json(changelog);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}