// @ts-nocheck
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

/**
 * GET /api/lavagna/snapshot?lavagnaId=X
 * Restituisce lo snapshot tldraw salvato per la lavagna.
 */
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const url = new URL(req.url);
  const lavagnaId = Number(url.searchParams.get("lavagnaId"));
  if (!lavagnaId) {
    return NextResponse.json({ error: "lavagnaId mancante" }, { status: 400 });
  }

  const lavagna = await prisma.lavagna.findUnique({
    where: { id: lavagnaId },
    select: { id: true, snapshot: true, attivitaId: true },
  });
  if (!lavagna) {
    return NextResponse.json({ error: "Lavagna non trovata" }, { status: 404 });
  }

  // Verifica accesso per i clienti
  if (session.user.role === "cliente") {
    const att = await prisma.attivita.findUnique({
      where: { id: lavagna.attivitaId },
      select: { clienteId: true },
    });
    if (!att || att.clienteId !== session.user.clienteId) {
      return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
    }
  }

  return NextResponse.json({ snapshot: lavagna.snapshot ?? null });
}

/**
 * POST /api/lavagna/snapshot
 * Salva lo snapshot tldraw per la lavagna.
 * Body: { lavagnaId: number, snapshot: object }
 */
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const { lavagnaId, snapshot } = body;
  if (!lavagnaId || !snapshot) {
    return NextResponse.json(
      { error: "lavagnaId e snapshot obbligatori" },
      { status: 400 }
    );
  }

  await prisma.lavagna.update({
    where: { id: Number(lavagnaId) },
    data: { snapshot },
  });

  return NextResponse.json({ ok: true });
}
