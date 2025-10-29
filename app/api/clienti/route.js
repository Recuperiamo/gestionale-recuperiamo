import { PrismaClient } from '@prisma/client';
import { MATERIE_AULA } from '../../../lib/materie';

const prisma = new PrismaClient();

const CLIENT_TYPES = ["REFERENTE", "STUDENTE"];

function normalizeClientType(value) {
  const normalized = (value || "").toString().trim().toUpperCase();
  return CLIENT_TYPES.includes(normalized) ? normalized : "REFERENTE";
}

const VALID_MATERIE = new Set(MATERIE_AULA);

function sanitizeMaterie(input) {
  if (!Array.isArray(input)) return [];
  const unique = [];
  const seen = new Set();
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const value = raw.trim();
    if (!value) continue;
    if (!VALID_MATERIE.has(value)) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    unique.push(value);
  }
  return unique;
}

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
    // PATCH: log diagnostico avanzato
    console.log('BODY RICEVUTO', body);
    console.log('EMAIL RICEVUTA DAL CLIENT:', JSON.stringify(body.email));
    console.log('EMAIL DOPO TRIM:', JSON.stringify(body.email?.trim()));
    console.log('EMAIL DOPO TRIM/LOWER:', JSON.stringify(body.email?.trim().toLowerCase()));

    const tipo = normalizeClientType(body.tipo);
    let referenteId = body.referenteId ? Number(body.referenteId) : null;
    let materieSelezionate = sanitizeMaterie(body.materie);

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
    // PATCH: validazione su email completamente ripulita
    const emailForValidation = body.email.trim().toLowerCase();
    if (!isValidEmail(emailForValidation)) {
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

    if (tipo === "STUDENTE") {
      if (materieSelezionate.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Seleziona almeno una materia in cui lo studente è seguito.' }),
          { status: 400 }
        );
      }
    }

    if (tipo === "STUDENTE" && referenteId) {
      const referente = await prisma.client.findUnique({
        where: { id: referenteId },
        select: { id: true, tipo: true }
      });
      if (!referente) {
        return new Response(
          JSON.stringify({ error: 'Referente selezionato inesistente' }),
          { status: 400 }
        );
      }
      if (referente.tipo !== "REFERENTE") {
        return new Response(
          JSON.stringify({ error: 'Il referente associato deve avere tipo REFERENTE' }),
          { status: 400 }
        );
      }
    }

    if (tipo === "REFERENTE") {
      referenteId = null;
      materieSelezionate = [];
    }

    // Creazione cliente
    const nuovoCliente = await prisma.client.create({
      data: {
        nomeReferente: body.nomeReferente.trim(),
        email: emailForValidation,
        telefono: body.telefono?.trim() || null,
        indirizzo: body.indirizzo?.trim() || null,
        codiceFiscale: body.codiceFiscale?.trim() || null,
        partitaIva: body.partitaIva?.trim() || null,
        note: body.note?.trim() || null,
        tipo,
        referenteId,
        materie: materieSelezionate,
        coloreTema: tipo === 'STUDENTE' ? (body.coloreTema || null) : null,
        linkVideolezione: tipo === 'STUDENTE' ? (body.linkVideolezione || null) : null,
      },
      include: {
        referente: {
          select: {
            id: true,
            nomeReferente: true,
            email: true,
            tipo: true
          }
        }
      }
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

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const tipoParam = url.searchParams.get('tipo');
    const includeStudenti = url.searchParams.get('includeStudenti') === '1';
    const where = {};
    if (tipoParam) {
      const normalizedTipo = normalizeClientType(tipoParam);
      where.tipo = normalizedTipo;
    }

    // Restituisci tutti i campi necessari per la tabella clienti (UI) e per la select (PacchettoForm)
    const clienti = await prisma.client.findMany({
      orderBy: { id: 'desc' },
      where,
      include: {
        referente: {
          select: {
            id: true,
            nomeReferente: true,
            email: true,
            tipo: true,
            materie: true
          }
        },
        studenti: includeStudenti
          ? {
              select: {
                id: true,
                nomeReferente: true,
                email: true,
                tipo: true,
                materie: true
              }
            }
          : undefined,
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
    const tipo = normalizeClientType(body.tipo);
    let referenteId = body.referenteId ? Number(body.referenteId) : null;
    let materieSelezionate = sanitizeMaterie(body.materie);

    if (referenteId && Number(referenteId) === Number(id)) {
      return new Response(
        JSON.stringify({ error: 'Uno studente non può essere referente di sé stesso' }),
        { status: 400 }
      );
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
    // PATCH: validazione su email completamente ripulita
    const emailForValidation = body.email.trim().toLowerCase();
    if (!isValidEmail(emailForValidation)) {
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

    if (tipo === "STUDENTE") {
      if (materieSelezionate.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Seleziona almeno una materia in cui lo studente è seguito.' }),
          { status: 400 }
        );
      }
    }

    if (tipo === "STUDENTE" && referenteId) {
      const referente = await prisma.client.findUnique({
        where: { id: referenteId },
        select: { id: true, tipo: true }
      });
      if (!referente) {
        return new Response(
          JSON.stringify({ error: 'Referente selezionato inesistente' }),
          { status: 400 }
        );
      }
      if (referente.tipo !== "REFERENTE") {
        return new Response(
          JSON.stringify({ error: 'Il referente associato deve avere tipo REFERENTE' }),
          { status: 400 }
        );
      }
    }

    if (tipo === "REFERENTE") {
      referenteId = null;
      materieSelezionate = [];
    }

    const cliente = await prisma.client.update({
      where: { id: Number(id) },
      data: {
        nomeReferente: body.nomeReferente.trim(),
        email: emailForValidation,
        telefono: body.telefono?.trim() || null,
        indirizzo: body.indirizzo?.trim() || null,
        codiceFiscale: body.codiceFiscale?.trim() || null,
        partitaIva: body.partitaIva?.trim() || null,
        note: body.note?.trim() || null,
        tipo,
        referenteId,
        materie: materieSelezionate,
        coloreTema: tipo === 'STUDENTE' ? (body.coloreTema || null) : null,
        linkVideolezione: tipo === 'STUDENTE' ? (body.linkVideolezione || null) : null,
      },
      include: {
        referente: {
          select: {
            id: true,
            nomeReferente: true,
            email: true,
            tipo: true
          }
        }
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