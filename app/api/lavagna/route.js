import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";
/**
 * GET /api/lavagna?attivitaId=123
 * Titolo persistito: "dd/MM/yyyy HH:mm"
 * Titolo visuale lato admin: "dd/MM/yyyy HH:mm – NomeStudente"
 * Aggiunge sempre: nomeStudente
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const url = new URL(req.url);
    const attivitaIdParam = url.searchParams.get("attivitaId");
    if (!attivitaIdParam) {
      return NextResponse.json({ error: "attivitaId mancante" }, { status: 400 });
    }
    const attivitaId = Number(attivitaIdParam);
    if (isNaN(attivitaId)) {
      return NextResponse.json({ error: "attivitaId non valido" }, { status: 400 });
    }

    const att = await prisma.attivita.findUnique({
      where: { id: attivitaId },
      select: {
        id: true,
        clienteId: true,
        orario: true,
        orarioOriginale: true,
        cliente: {
          select: {
            id: true,
            nomeReferente: true,
            email: true
          }
        }
      }
    });
    if (!att) {
      return NextResponse.json({ error: "Attività inesistente" }, { status: 404 });
    }

    const role = (session.user.role || "").toLowerCase();

    if (role === "cliente" && session.user.clienteId !== att.clienteId) {
      return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
    }

    const dataLezione = att.orario
      ? new Date(att.orario)
      : att.orarioOriginale
        ? new Date(att.orarioOriginale)
        : null;

    const baseTitolo = dataLezione
      ? formatDataOra(dataLezione)
      : "Data non definita";

    let lavagna = await prisma.lavagna.findUnique({
      where: { attivitaId },
      select: { id: true, attivitaId: true, titolo: true }
    });

    if (!lavagna) {
      lavagna = await prisma.lavagna.create({
        data: { attivitaId, titolo: baseTitolo },
        select: { id: true, attivitaId: true, titolo: true }
      });
    } else {
      if (
        lavagna.titolo?.toLowerCase().startsWith("lavagna lezione") ||
        lavagna.titolo !== baseTitolo
      ) {
        lavagna = await prisma.lavagna.update({
          where: { attivitaId },
          data: { titolo: baseTitolo },
          select: { id: true, attivitaId: true, titolo: true }
        });
      }
    }

    const tratti = await prisma.lavagnaTratto.findMany({
      where: { lavagnaId: lavagna.id, deletedAt: null },
      orderBy: { id: "asc" },
      select: {
        id: true,
        strumento: true,
        colore: true,
        spessore: true,
        punti: true,
        autoreUserId: true,
        createdAt: true
      }
    });

    const nomeStudente =
      att.cliente?.nomeReferente ||
      att.cliente?.email ||
      `Cliente #${att.clienteId}`;

    let titoloVisuale = lavagna.titolo;
    if (role === "admin" || role === "operatore") {
      titoloVisuale = `${lavagna.titolo} – ${nomeStudente}`;
    }

    return NextResponse.json({
      lavagna: {
        id: lavagna.id,
        attivitaId: lavagna.attivitaId,
        titolo: lavagna.titolo,
        titoloVisuale,
        nomeStudente,
        tratti
      }
    });
  } catch (e) {
    console.error("GET /api/lavagna error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH: CREA LAVAGNA (POST)
export async function POST(req) {
  try {
    const { attivitaId } = await req.json();
    if (!attivitaId) return new Response("attivitaId mancante", { status: 400 });

    // Controlla che non esista già una lavagna per quell'attivitaId
    let lavagna = await prisma.lavagna.findUnique({
      where: { attivitaId: Number(attivitaId) },
      select: { id: true, attivitaId: true, titolo: true, createdAt: true }
    });

    if (!lavagna) {
      // Recupera la data/orario per il titolo
      const att = await prisma.attivita.findUnique({ where: { id: Number(attivitaId) } });
      let baseTitolo = att && att.orario ? new Date(att.orario).toLocaleString("it-IT") : "Nuova Lavagna";
      lavagna = await prisma.lavagna.create({
        data: { attivitaId: Number(attivitaId), titolo: baseTitolo },
        select: { id: true, attivitaId: true, titolo: true, createdAt: true }
      });
    }

    return Response.json({ lavagna });
  } catch (e) {
    return new Response("Errore creazione lavagna", { status: 500 });
  }
}

// PATCH: DELETE SINGOLA LAVAGNA
export async function DELETE(req) {
  const url = new URL(req.url, "http://localhost");
  const id = Number(url.searchParams.get("id"));
  if (!id) return new Response("ID mancante", { status: 400 });
  // Elimina lavagna e relativi tratti
  await prisma.lavagnaTratto.deleteMany({ where: { lavagnaId: id } });
  await prisma.lavagna.delete({ where: { id } });
  return Response.json({ ok: true });
}

function formatDataOra(d) {
  const gg = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${gg}/${mm}/${yyyy} ${hh}:${mi}`;
}