import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { prisma } from '../../../lib/prisma';

// Basic CRUD for Programma
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const clienteId = searchParams.get('clienteId');
    const materia = searchParams.get('materia');

    if (id) {
      const p = await prisma.programma.findUnique({ where: { id: Number(id) } });
      if (!p) return NextResponse.json({ error: 'Programma non trovato' }, { status: 404 });
      return NextResponse.json(p);
    }

    const where = {};
    if (clienteId) where.clienteId = Number(clienteId);
    if (materia) where.materia = materia;

    const list = await prisma.programma.findMany({ where, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(list);
  } catch (err) {
    console.error('[programma] GET error', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json();
    console.log('[programma] POST body', JSON.stringify(body));
    const { clienteId, materia, titolo, descrizione, data } = body;
    if (!clienteId || !titolo) return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });

    // Permission: admin/operator can create for any cliente, cliente can create only for their own clienteId
    const isCliente = session.user?.role === 'cliente';
    if (isCliente && Number(session.user?.clienteId) !== Number(clienteId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const created = await prisma.programma.create({
      data: {
        clienteId: Number(clienteId),
        materia: materia || null,
        titolo: String(titolo).trim(),
        descrizione: descrizione || null,
        data: data ? new Date(data) : null,
        autoreUserId: session.user?.id ?? null
      }
    });

    return NextResponse.json({ ok: true, programma: created }, { status: 201 });
  } catch (err) {
    console.error('[programma] POST error', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json();
    const { id, titolo, descrizione, materia, data } = body;
    if (!id) return NextResponse.json({ error: 'ID obbligatorio' }, { status: 400 });

    const existing = await prisma.programma.findUnique({ where: { id: Number(id) } });
    if (!existing) return NextResponse.json({ error: 'Programma non trovato' }, { status: 404 });

    // Authorization: admin/operator or owner (cliente)
    const isCliente = session.user?.role === 'cliente';
    if (isCliente && Number(session.user?.clienteId) !== Number(existing.clienteId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const update = {};
    if (typeof titolo === 'string') update.titolo = titolo.trim();
    if (typeof descrizione === 'string') update.descrizione = descrizione;
    if (typeof materia === 'string') update.materia = materia;
    if (data) update.data = new Date(data);

    if (!Object.keys(update).length) return NextResponse.json({ programma: existing });

    const updated = await prisma.programma.update({ where: { id: Number(id) }, data: update });
    return NextResponse.json({ ok: true, programma: updated });
  } catch (err) {
    console.error('[programma] PATCH error', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const clienteId = searchParams.get('clienteId');

    if (!id && !clienteId) return NextResponse.json({ error: 'Parametro mancante' }, { status: 400 });

    if (id) {
      const existing = await prisma.programma.findUnique({ where: { id: Number(id) } });
      if (!existing) return NextResponse.json({ error: 'Programma non trovato' }, { status: 404 });

      // Authorization
      const isCliente = session.user?.role === 'cliente';
      if (isCliente && Number(session.user?.clienteId) !== Number(existing.clienteId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await prisma.programma.delete({ where: { id: Number(id) } });
      return NextResponse.json({ ok: true, deleted: id });
    }

    // Delete all for clienteId (admin/operator only)
    if (!(session.user?.role === 'admin' || session.user?.role === 'operatore')) {
      return NextResponse.json({ error: 'Solo admin/operator possono eliminare massivamente' }, { status: 403 });
    }

    const result = await prisma.programma.deleteMany({ where: { clienteId: Number(clienteId) } });
    return NextResponse.json({ ok: true, deletedCount: result.count });
  } catch (err) {
    console.error('[programma] DELETE error', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
