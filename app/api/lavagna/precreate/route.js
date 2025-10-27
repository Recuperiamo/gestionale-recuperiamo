import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const attivitaIds = Array.isArray(body.attivitaIds) ? body.attivitaIds : [];
    if (!attivitaIds.length) {
      return NextResponse.json({ created: 0, skipped: 0 });
    }

    const attivitaList = await prisma.attivita.findMany({
      where: { id: { in: attivitaIds } },
      select: { id: true, clienteId: true, orario: true, orarioOriginale: true }
    });

    let created = 0;
    let skipped = 0;

    for (const a of attivitaList) {
      if (session.user.role === "cliente" && session.user.clienteId !== a.clienteId) {
        skipped++;
        continue;
      }
      const exists = await prisma.lavagna.findUnique({ where: { attivitaId: a.id } });
      if (exists) {
        skipped++;
        continue;
      }
      const d = a.orario ? new Date(a.orario) :
                a.orarioOriginale ? new Date(a.orarioOriginale) : new Date();
      const titolo = formatDataOra(d);
      await prisma.lavagna.create({
        data: { attivitaId: a.id, titolo }
      });
      created++;
    }

    return NextResponse.json({ created, skipped });
  } catch (e) {
    console.error("POST /api/lavagna/precreate error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function formatDataOra(d) {
  try {
    return new Date(d).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Rome"
    }).replace(/, /, ' ');
  } catch {
    const gg = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${gg}/${mm}/${yyyy} ${hh}:${mi}`;
  }
}