import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email richiesta' }, { status: 400 });
    }

    // Verifica che l'utente esista
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Non rivelare se l'email esiste o meno per sicurezza
      return NextResponse.json({ 
        message: 'Se l\'email è registrata, riceverai una notifica quando la richiesta sarà approvata' 
      });
    }

    // Verifica che non ci siano già richieste pending per questo utente
    const existingRequest = await prisma.passwordResetRequest.findFirst({
      where: {
        userId: user.id,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      return NextResponse.json({ 
        message: 'Hai già una richiesta di reset in attesa di approvazione' 
      });
    }

    // Crea la richiesta di reset
    await prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ 
      message: 'Richiesta inviata. Riceverai una notifica quando un amministratore la approverà' 
    });
  } catch (error) {
    console.error('Errore nella richiesta di reset password:', error);
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}
