// @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/authOptions";
import prisma from "../../../../../lib/prisma";

/**
 * PATCH /api/pacchetti/[id]/saldato
 * Aggiorna il flag saldato di un pacchetto (solo admin)
 * Body: { saldato: boolean }
 */
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { role: true }
    });

    if (!dbUser || (dbUser.role?.name !== "admin" && dbUser.role?.name !== "operatore")) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();

    if (typeof body.saldato !== "boolean") {
      return NextResponse.json({ error: "Campo saldato mancante o non booleano" }, { status: 400 });
    }

    const pacchetto = await prisma.pacchettoOre.update({
      where: { id: parseInt(id) },
      data: { saldato: body.saldato }
    });

    return NextResponse.json(pacchetto);
  } catch (error) {
    console.error("Errore aggiornamento saldato pacchetto:", error);
    return NextResponse.json({ error: "Errore aggiornamento" }, { status: 500 });
  }
}
