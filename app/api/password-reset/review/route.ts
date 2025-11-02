import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    // Verifica che l'utente sia admin
    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { role: true },
    });

    if (!adminUser || adminUser.role.name !== 'admin') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const { requestId, action } = await req.json();

    if (!requestId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 });
    }

    const request = await prisma.passwordResetRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return NextResponse.json({ error: 'Richiesta non trovata' }, { status: 404 });
    }

    if (request.status !== 'PENDING') {
      return NextResponse.json({ error: 'Richiesta già processata' }, { status: 400 });
    }

    if (action === 'reject') {
      // Rifiuta la richiesta
      await prisma.passwordResetRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          reviewedBy: adminUser.id,
          reviewedAt: new Date(),
        },
      });

      return NextResponse.json({ message: 'Richiesta rifiutata' });
    }

    // Approva e ELIMINA l'utente così può ri-registrarsi
    const userToDelete = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { email: true, name: true },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }

    // Elimina l'utente (cascade eliminerà anche le sue relazioni)
    await prisma.user.delete({
      where: { id: request.userId },
    });

    // Marca la richiesta come completata
    await prisma.passwordResetRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        reviewedBy: adminUser.id,
        reviewedAt: new Date(),
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ 
      message: `Utente ${userToDelete.email} eliminato. Può ora ri-registrarsi con la stessa email.`,
      email: userToDelete.email,
    });
  } catch (error) {
    console.error('Errore nella revisione richiesta:', error);
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}
