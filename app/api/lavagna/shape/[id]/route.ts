// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/authOptions";

export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

    const rawId = params.id;
    const body = await req.json().catch(() => ({}));
    const numericId = Number(rawId);
    const dbId = Number.isNaN(numericId) ? (Number(body?.dbId) || null) : numericId;
    if (!dbId) {
      // Cannot resolve DB id; ignore but return 200 to keep UX smooth
      return NextResponse.json({ ok: true, noop: true });
    }

    const existing = await prisma.lavagnaShape.findUnique({
      where: { id: dbId },
      select: { id: true, lavagna: { select: { attivita: { select: { clienteId: true } } } } }
    });
    if (!existing) return NextResponse.json({ error: "Shape non trovata" }, { status: 404 });
    if (session.user.role === "cliente") {
      const sameCliente = String(session.user.clienteId) === String(existing.lavagna.attivita.clienteId);
      if (!sameCliente) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
    }

    const data = {};
    for (const k of ["kind","x","y","w","h","x1","y1","x2","y2","colore","spessore"]) {
      if (Object.prototype.hasOwnProperty.call(body, k)) data[k] = body[k];
    }
    const updated = await prisma.lavagnaShape.update({
      where: { id: dbId },
      data,
      select: {
        id: true,
        lavagnaId: true,
        kind: true,
        x: true, y: true, w: true, h: true,
        x1: true, y1: true, x2: true, y2: true,
        colore: true, spessore: true,
        autoreUserId: true,
        createdAt: true
      }
    });
    const response = NextResponse.json({ shape: updated });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (e) {
    console.error("PUT /api/lavagna/shape/:id error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

    const rawId = params.id;
    const numericId = Number(rawId);
    if (Number.isNaN(numericId)) {
      // If it's not a DB id, nothing to delete server-side
      return NextResponse.json({ ok: true, noop: true });
    }

    const existing = await prisma.lavagnaShape.findUnique({
      where: { id: numericId },
      select: { id: true, lavagna: { select: { attivita: { select: { clienteId: true } } } } }
    });
    if (!existing) return NextResponse.json({ ok: true });
    if (session.user.role === "cliente") {
      const sameCliente = String(session.user.clienteId) === String(existing.lavagna.attivita.clienteId);
      if (!sameCliente) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
    }

    await prisma.lavagnaShape.update({ where: { id: numericId }, data: { deletedAt: new Date() } });
    const response = NextResponse.json({ ok: true, id: numericId });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (e) {
    console.error("DELETE /api/lavagna/shape/:id error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
