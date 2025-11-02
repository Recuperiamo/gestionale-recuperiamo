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

    // Approva e genera una password temporanea
    const tempPassword = Math.random().toString(36).slice(-10); // Password temporanea casuale
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Aggiorna la password dell'utente
    await prisma.user.update({
      where: { id: request.userId },
      data: { password: hashedPassword },
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

    const userInfo = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { email: true, name: true },
    });

    return NextResponse.json({ 
      message: `Password resettata per ${userInfo?.email}`,
      email: userInfo?.email,
      tempPassword, // In produzione, invia questa via email invece di mostrarla
    });
  } catch (error) {
    console.error('Errore nella revisione richiesta:', error);
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}
