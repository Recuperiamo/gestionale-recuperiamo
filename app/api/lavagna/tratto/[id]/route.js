import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/authOptions";

export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    
    const rawId = params.id;
    const numericId = Number(rawId);
    const whereClause = Number.isNaN(numericId) ? { streamId: rawId } : { id: numericId };
    
    const tratto = await prisma.lavagnaTratto.findUnique({
      where: whereClause,
      select: {
        id: true,
        streamId: true,
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
    const isAutore = String(session.user.id) === String(tratto.autoreUserId);
    const sameCliente = String(session.user.clienteId) === String(tratto.lavagna.attivita.clienteId);
    
    if (session.user.role === "cliente" && (!sameCliente || !isAutore)) {
      return NextResponse.json({ error: "Puoi modificare solo i tuoi tratti" }, { status: 403 });
    }
    
    const body = await req.json();
    const updateData = {};
    if (body.punti) updateData.punti = body.punti;
    if (body.colore) updateData.colore = body.colore;
    if (body.spessore) updateData.spessore = body.spessore;
    
    const updated = await prisma.lavagnaTratto.update({
      where: { id: tratto.id },
      data: updateData
    });
    
    return NextResponse.json({ ok: true, tratto: updated });
  } catch (e) {
    console.error("PUT /api/lavagna/tratto/:id error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    const rawId = params.id;
    const numericId = Number(rawId);
    const whereClause = Number.isNaN(numericId) ? { streamId: rawId } : { id: numericId };

    const tratto = await prisma.lavagnaTratto.findUnique({
      where: whereClause,
      select: {
        id: true,
        streamId: true,
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
    const isAutore = String(session.user.id) === String(tratto.autoreUserId);
    const sameCliente = String(session.user.clienteId) === String(tratto.lavagna.attivita.clienteId);

    if (session.user.role === "cliente" && (!sameCliente || !isAutore)) {
      return NextResponse.json({ error: "Puoi cancellare solo i tuoi tratti" }, { status: 403 });
    }

    await prisma.lavagnaTratto.update({
      where: { id: tratto.id },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({ ok: true, id: tratto.id, streamId: tratto.streamId });
  } catch (e) {
    console.error("DELETE /api/lavagna/tratto/:id error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}