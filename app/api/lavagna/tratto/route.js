import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

    const body = await req.json();
    const { lavagnaId, strumento, colore, spessore, punti } = body || {};

    if (!lavagnaId || !Array.isArray(punti) || punti.length < 2) {
      return NextResponse.json({ error: "Dati tratto non validi" }, { status: 400 });
    }

    // Fallback per id utente
    let autoreUserId = session.user?.id ?? session.user?.sub ?? null;

    // Se ancora nullo prova da email
    if (!autoreUserId && session.user?.email) {
      const u = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });
      if (u) autoreUserId = u.id;
    }

    if (autoreUserId === null || autoreUserId === undefined) {
      return NextResponse.json({ error: "Sessione priva di user.id" }, { status: 401 });
    }

    // Se il campo è Int in schema, prova convert
    // COMMENTA questa sezione se il tuo schema usa String per User.id
    if (typeof autoreUserId === "string") {
      const maybeNum = Number(autoreUserId);
      if (!Number.isNaN(maybeNum)) {
        autoreUserId = maybeNum;
      }
      // Se conversione impossibile e schema è Int, lancia errore esplicito
      // const isIntSchema = true; // setta false se non serve
      // if (isIntSchema && Number.isNaN(maybeNum)) {
      //   return NextResponse.json({ error: "Tipo user.id non numerico, migrazione richiesta."}, { status: 400 });
      // }
    }

    const lavagna = await prisma.lavagna.findUnique({
      where: { id: lavagnaId },
      select: { id: true, attivitaId: true, attivita: { select: { clienteId: true } } }
    });
    if (!lavagna) return NextResponse.json({ error: "Lavagna non trovata" }, { status: 404 });

    if (session.user.role === "cliente" && session.user.clienteId !== lavagna.attivita.clienteId) {
      return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
    }

    if (punti.length > 4000) {
      return NextResponse.json({ error: "Troppi punti nel tratto (>4000)" }, { status: 413 });
    }

    const tratto = await prisma.lavagnaTratto.create({
      data: {
        lavagnaId,
        autoreUserId,
        strumento: strumento || "penna",
        colore: strumento === "gomma" ? null : (colore || "#20489a"),
        spessore: spessore ?? 3,
        punti
      },
      select: {
        id: true, strumento: true, colore: true, spessore: true, punti: true,
        autoreUserId: true, createdAt: true
      }
    });

    return NextResponse.json({ tratto }, { status: 201 });
  } catch (e) {
    console.error("POST /api/lavagna/tratto error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}