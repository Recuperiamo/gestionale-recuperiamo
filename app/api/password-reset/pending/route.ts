import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    // Verifica che l'utente sia admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { role: true },
    });

    if (!user || user.role.name !== 'admin') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    // Recupera tutte le richieste pending
    const pendingRequests = await prisma.passwordResetRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests: pendingRequests });
  } catch (error) {
    console.error('Errore nel recupero richieste pending:', error);
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}
