import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/authOptions";

export async function DELETE(_req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

    const id = Number(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "ID non valido" }, { status: 400 });

    const tratto = await prisma.lavagnaTratto.findUnique({
      where: { id },
      select: {
        id: true,
        autoreUserId: true,
        lavagna: {
          select: {
            attivita: { select: { clienteId: true } }
          }
        }
      }
    });
    if (!tratto) return NextResponse.json({ error: "Tratto non trovato" }, { status: 404 });

    const isAdmin = ["admin", "operatore"].includes(session.user.role);
    const isAutore = session.user.id === tratto.autoreUserId;
    const sameCliente = session.user.clienteId === tratto.lavagna.attivita.clienteId;

    if (session.user.role === "cliente" && (!sameCliente || !isAutore)) {
      return NextResponse.json({ error: "Puoi cancellare solo i tuoi tratti" }, { status: 403 });
    }

    await prisma.lavagnaTratto.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/lavagna/tratto/:id error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}