import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- Validazioni helper ---
function isValidEmail(email) {
  // RegEx semplice per email
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidCF(cf) {
  // Codice fiscale italiano: 16 caratteri alfanumerici (base)
  return !cf || /^[A-Z0-9]{16}$/i.test(cf);
}
function isValidPIVA(piva) {
  // P.IVA italiana: 11 cifre
  return !piva || /^\d{11}$/.test(piva);
}

export async function POST(req) {
  try {
    const body = await req.json();
    console.log('BODY RICEVUTO', body);
    // Validazione obbligatorietà e formato
    if (!body.nomeReferente || !body.nomeReferente.trim()) {
      return new Response(
        JSON.stringify({ error: 'Il nome referente è obbligatorio' }),
        { status: 400 }
      );
    }
    if (!body.email || !body.email.trim()) {
      return new Response(
        JSON.stringify({ error: 'L\'email è obbligatoria' }),
        { status: 400 }
      );
    }
    if (!isValidEmail(body.email)) {
      return new Response(
        JSON.stringify({ error: 'Formato email non valido' }),
        { status: 400 }
      );
    }
    if (!isValidCF(body.codiceFiscale)) {
      return new Response(
        JSON.stringify({ error: 'Codice fiscale non valido (deve essere di 16 caratteri alfanumerici)' }),
        { status: 400 }
      );
    }
    if (!isValidPIVA(body.partitaIva)) {
      return new Response(
        JSON.stringify({ error: 'Partita IVA non valida (deve essere di 11 cifre)' }),
        { status: 400 }
      );
    }

    // Creazione cliente
    const nuovoCliente = await prisma.client.create({
      data: {
        nomeReferente: body.nomeReferente.trim(),
        email: body.email.trim(),
        telefono: body.telefono?.trim() || null,
        indirizzo: body.indirizzo?.trim() || null,
        codiceFiscale: body.codiceFiscale?.trim() || null,
        partitaIva: body.partitaIva?.trim() || null,
        note: body.note?.trim() || null,
      },
    });

    return new Response(JSON.stringify(nuovoCliente), { status: 201 });
  } catch (error) {
    if (
      error.code === 'P2002' &&
      error.meta?.target?.some((f) => f === 'codiceFiscale' || f === 'partitaIva')
    ) {
      return new Response(
        JSON.stringify({ error: 'Codice fiscale o partita IVA già presente! Modifica il dato.' }),
        { status: 409 }
      );
    }
    return new Response(
      JSON.stringify({ error: 'Errore imprevisto: ' + error.message }),
      { status: 500 }
    );
  }
}

// --- CRUD AGGIUNTIVO ---

export async function GET() {
  try {
    // Restituisci tutti i campi necessari per la tabella clienti (UI) e per la select (PacchettoForm)
    const clienti = await prisma.client.findMany({
      orderBy: { id: 'desc' },
      select: {
        id: true,
        nomeReferente: true,  // campo per la tabella clienti
        email: true,          // campo per la tabella clienti
        telefono: true,
        indirizzo: true,
        codiceFiscale: true,
        partitaIva: true,
        note: true,
      }
    });
    return new Response(JSON.stringify(clienti), { status: 200 });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Errore durante la lettura della lista clienti: ' + error.message }),
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID cliente mancante' }), { status: 400 });
    }
    await prisma.client.delete({ where: { id: Number(id) } });
    return new Response(JSON.stringify({ result: 'Cliente eliminato' }), { status: 200 });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Impossibile eliminare il cliente: ' + error.message }),
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const id = body.id;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID cliente mancante' }), { status: 400 });
    }
    // Validazioni come in POST
    if (!body.nomeReferente || !body.nomeReferente.trim()) {
      return new Response(
        JSON.stringify({ error: 'Il nome referente è obbligatorio' }),
        { status: 400 }
      );
    }
    if (!body.email || !body.email.trim()) {
      return new Response(
        JSON.stringify({ error: 'L\'email è obbligatoria' }),
        { status: 400 }
      );
    }
    if (!isValidEmail(body.email)) {
      return new Response(
        JSON.stringify({ error: 'Formato email non valido' }),
        { status: 400 }
      );
    }
    if (!isValidCF(body.codiceFiscale)) {
      return new Response(
        JSON.stringify({ error: 'Codice fiscale non valido (deve essere di 16 caratteri alfanumerici)' }),
        { status: 400 }
      );
    }
    if (!isValidPIVA(body.partitaIva)) {
      return new Response(
        JSON.stringify({ error: 'Partita IVA non valida (deve essere di 11 cifre)' }),
        { status: 400 }
      );
    }

    const cliente = await prisma.client.update({
      where: { id: Number(id) },
      data: {
        nomeReferente: body.nomeReferente.trim(),
        email: body.email.trim(),
        telefono: body.telefono?.trim() || null,
        indirizzo: body.indirizzo?.trim() || null,
        codiceFiscale: body.codiceFiscale?.trim() || null,
        partitaIva: body.partitaIva?.trim() || null,
        note: body.note?.trim() || null,
      }
    });
    return new Response(JSON.stringify(cliente), { status: 200 });
  } catch (error) {
    if (
      error.code === 'P2002' &&
      error.meta?.target?.some((f) => f === 'codiceFiscale' || f === 'partitaIva')
    ) {
      return new Response(
        JSON.stringify({ error: 'Codice fiscale o partita IVA già presente! Modifica il dato.' }),
        { status: 409 }
      );
    }
    return new Response(
      JSON.stringify({ error: 'Errore durante l\'aggiornamento: ' + error.message }),
      { status: 500 }
    );
  }
}
