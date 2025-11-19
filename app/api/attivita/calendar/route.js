import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { prisma } from '../../../lib/prisma';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = await req.json();
    const { clienteId, descrizione, orario, durataOre } = body;
    if (!clienteId || !descrizione || !orario) return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });

    // Permission: cliente can create only for their own clienteId
    const isCliente = session.user?.role === 'cliente';
    if (isCliente && Number(session.user?.clienteId) !== Number(clienteId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const attivita = await prisma.attivita.create({
      data: {
        pacchettoId: null,
        clienteId: Number(clienteId),
        descrizione: String(descrizione).slice(0, 200),
        orario: new Date(orario),
        durataOre: Number(durataOre) || 1,
        stato: 'Prenotata'
      }
    });
    return NextResponse.json({ ok: true, attivita }, { status: 201 });
  } catch (err) {
    console.error('[attivita/calendar] POST error', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
