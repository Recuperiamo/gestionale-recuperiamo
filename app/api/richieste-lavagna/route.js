import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { prisma } from "../../../lib/prisma";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get("clienteId");
    const stato = searchParams.get("stato");

    let where = {};
    
    if (clienteId) {
      where.clienteId = parseInt(clienteId);
    }
    
    if (stato) {
      where.stato = stato;
    }

    const richieste = await prisma.richiestaLavagna.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ richieste });
  } catch (error) {
    console.error("Errore GET /api/richieste-lavagna:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const body = await req.json();
    const { clienteId, titolo, noteStudente } = body;

    if (!clienteId) {
      return NextResponse.json({ error: "clienteId richiesto" }, { status: 400 });
    }

    const richiesta = await prisma.richiestaLavagna.create({
      data: {
        clienteId: parseInt(clienteId),
        titolo: titolo || `Lavagna ${new Date().toLocaleString("it-IT")}`,
        noteStudente: noteStudente || null,
        stato: "pending",
      },
    });

    return NextResponse.json({ richiesta }, { status: 201 });
  } catch (error) {
    console.error("Errore POST /api/richieste-lavagna:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const isAdmin = ["admin", "operatore"].includes(session.user.role);
    if (!isAdmin) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const body = await req.json();
    const { id, azione, noteAdmin } = body;

    if (!id || !azione) {
      return NextResponse.json({ error: "id e azione richiesti" }, { status: 400 });
    }

    const richiesta = await prisma.richiestaLavagna.findUnique({
      where: { id: parseInt(id) },
    });

    if (!richiesta) {
      return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 });
    }

    if (azione === "approva") {
      // Recupera info cliente per nome lavagna
      const cliente = await prisma.client.findUnique({
        where: { id: richiesta.clienteId },
        select: { nomeReferente: true },
      });

      const nomeStudente = cliente?.nomeReferente || `Studente ${richiesta.clienteId}`;
      const timestamp = new Date().toLocaleString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const titoloLavagna = `[Richiesta] ${nomeStudente} - ${timestamp}`;

      // Crea attività ad-hoc per il cliente con stato "lavagna"
      const attivita = await prisma.attivita.create({
        data: {
          clienteId: richiesta.clienteId,
          descrizione: titoloLavagna,
          oreConsumate: 0,
          orario: new Date(),
          durataOre: 1,
          stato: "lavagna",
        },
      });

      // Crea lavagna associata
      const lavagna = await prisma.lavagna.create({
        data: {
          attivitaId: attivita.id,
          titolo: titoloLavagna,
        },
      });

      // Aggiorna richiesta
      const updated = await prisma.richiestaLavagna.update({
        where: { id: parseInt(id) },
        data: {
          stato: "approved",
          noteAdmin,
          processedAt: new Date(),
          processedBy: session.user.email || session.user.name || "admin",
          lavagnaId: lavagna.id,
        },
      });

      return NextResponse.json({ richiesta: updated, lavagna, attivita });
    } else if (azione === "rifiuta") {
      const updated = await prisma.richiestaLavagna.update({
        where: { id: parseInt(id) },
        data: {
          stato: "rejected",
          noteAdmin,
          processedAt: new Date(),
          processedBy: session.user.email || session.user.name || "admin",
        },
      });

      return NextResponse.json({ richiesta: updated });
    } else {
      return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
    }
  } catch (error) {
    console.error("Errore PATCH /api/richieste-lavagna:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const isAdmin = ["admin", "operatore"].includes(session.user.role);
    if (!isAdmin) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id richiesto" }, { status: 400 });
    }

    await prisma.richiestaLavagna.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Errore DELETE /api/richieste-lavagna:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
