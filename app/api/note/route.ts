// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";

const prisma = new PrismaClient();

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get("clienteId");

  const note = await prisma.nota.findMany({
    where: clienteId ? { clienteId: Number(clienteId) } : undefined,
    orderBy: [{ data: 'asc' }, { createdAt: 'desc' }],
    include: {
      cliente: { select: { id: true, nomeReferente: true, email: true } },
    },
  });
  return Response.json(note);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  const body = await request.json();
  const { testo, clienteId, data, colore } = body;
  if (!testo?.trim()) {
    return Response.json({ error: 'Il testo è obbligatorio' }, { status: 400 });
  }

  // Recupera l'ID utente dalla sessione
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return Response.json({ error: 'Utente non trovato' }, { status: 404 });

  const nota = await prisma.nota.create({
    data: {
      testo: testo.trim(),
      clienteId: clienteId ? Number(clienteId) : null,
      data: data ? new Date(data) : null,
      colore: colore || '#7C3AED',
      autoreUserId: user.id,
    },
    include: {
      cliente: { select: { id: true, nomeReferente: true, email: true } },
    },
  });
  return Response.json(nota, { status: 201 });
}
