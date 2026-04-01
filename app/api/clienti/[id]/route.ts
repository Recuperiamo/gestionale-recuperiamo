// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';

const prisma = new PrismaClient();

// GET /api/clienti/[id] - dettaglio cliente
export async function GET(req, ctx) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Non autorizzato' }), { status: 401 });
  }
  try {
    const idStr = ctx?.params?.id || req.url.split('/').pop();
    const id = Number(idStr);
    if (!id || Number.isNaN(id)) {
      return new Response(JSON.stringify({ error: 'ID non valido' }), { status: 400 });
    }
    const isStaff = session.user?.role === 'admin' || session.user?.role === 'operatore';
    // Studente può leggere solo se stesso
    if (!isStaff && session.user?.clienteId !== id) {
      return new Response(JSON.stringify({ error: 'Non autorizzato' }), { status: 403 });
    }
    const cliente = await prisma.client.findUnique({ where: { id } });
    if (!cliente) return new Response(JSON.stringify({ error: 'Cliente non trovato' }), { status: 404 });
    return new Response(JSON.stringify(cliente), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Errore: ' + err.message }), { status: 500 });
  }
}

// Placeholder per PUT/DELETE se serviranno in futuro
export async function PUT() {
  return new Response(JSON.stringify({ error: 'Non implementato' }), { status: 405 });
}
export async function DELETE() {
  return new Response(JSON.stringify({ error: 'Non implementato' }), { status: 405 });
}