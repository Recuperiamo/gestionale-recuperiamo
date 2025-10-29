import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

    const body = await req.json();
    const {
      // client-side identifiers and context
      id: clientShapeId,
      lavagnaId,
      // geometry and style
      kind,
      x, y, w, h,
      x1, y1, x2, y2,
      colore, spessore,
      autoreUserId: bodyAutoreUserId
    } = body || {};

    if (!lavagnaId || !kind) {
      return NextResponse.json({ error: "Dati shape non validi" }, { status: 400 });
    }

    // Resolve user id from session if not provided
    let autoreUserId = bodyAutoreUserId ?? session.user?.id ?? session.user?.sub ?? null;
    if (!autoreUserId && session.user?.email) {
      const u = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      if (u) autoreUserId = u.id;
    }
    if (autoreUserId === null || autoreUserId === undefined) {
      return NextResponse.json({ error: "Sessione priva di user.id" }, { status: 401 });
    }
    if (typeof autoreUserId === "string") {
      const n = Number(autoreUserId);
      if (!Number.isNaN(n)) autoreUserId = n;
    }

    // Authorization: only same cliente if role=cliente
    const lavagna = await prisma.lavagna.findUnique({
      where: { id: Number(lavagnaId) },
      select: { id: true, attivita: { select: { clienteId: true } } }
    });
    if (!lavagna) return NextResponse.json({ error: "Lavagna non trovata" }, { status: 404 });
    if (session.user.role === "cliente") {
      const sameCliente = String(session.user.clienteId) === String(lavagna.attivita.clienteId);
      if (!sameCliente) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
    }

    const created = await prisma.lavagnaShape.create({
      data: {
        lavagnaId: Number(lavagnaId),
        kind: String(kind),
        x, y, w, h,
        x1, y1, x2, y2,
        colore: colore ?? null,
        spessore: spessore ?? null,
        autoreUserId: autoreUserId ?? null
      },
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

    // Return DB shape and echo client id if provided
    return NextResponse.json({ shape: { ...created, clientId: clientShapeId || null } }, { status: 201 });
  } catch (e) {
    console.error("POST /api/lavagna/shape error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
