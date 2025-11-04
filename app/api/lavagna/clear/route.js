import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';

// DELETE /api/lavagna/clear?lavagnaId=123  --> soft delete tutti i tratti (deletedAt)
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const url = new URL(req.url);
    const lavagnaIdParam = url.searchParams.get('lavagnaId');
    if (!lavagnaIdParam) return NextResponse.json({ error: 'lavagnaId mancante' }, { status: 400 });
    const lavagnaId = Number(lavagnaIdParam);
    if (Number.isNaN(lavagnaId)) return NextResponse.json({ error: 'lavagnaId non valido' }, { status: 400 });

    const lavagna = await prisma.lavagna.findUnique({
      where: { id: lavagnaId },
      select: { id: true, attivita: { select: { clienteId: true } } }
    });
    if (!lavagna) return NextResponse.json({ error: 'Lavagna non trovata' }, { status: 404 });

    const role = session.user.role;
    if (role === 'cliente') return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });

    const now = new Date();

    // Soft delete di tutti i tratti non già cancellati
    await prisma.lavagnaTratto.updateMany({
      where: { lavagnaId, deletedAt: null },
      data: { deletedAt: now }
    });

    // Soft delete di tutte le forme non già cancellate
    await prisma.lavagnaForma.updateMany({
      where: { lavagnaId, deletedAt: null },
      data: { deletedAt: now }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/lavagna/clear error', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
