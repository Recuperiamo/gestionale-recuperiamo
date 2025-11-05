import { NextResponse } from "next/server";
import { put, del } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { prisma } from '../../../lib/prisma';
// Ably removed: realtime notifications are now handled client-side via Socket.IO

// Recupera la sessione NextAuth dal server e normalizza le informazioni utente
async function getUserFromRequest(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return null;
    return {
      role: session.user?.role || null,
      clienteId: session.user?.clienteId ?? null,
      email: session.user?.email || null
    };
  } catch (err) {
    console.error('Errore recupero sessione in materiale route:', err);
    return null;
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");
  const filterClienteId = searchParams.get("clienteId");
  const user = await getUserFromRequest(req);

  if (fileId) {
    // Download file - redirect to blob URL
    const materiale = await prisma.materialeDidattico.findUnique({
      where: { id: parseInt(fileId) }
    });
    
    if (!materiale) {
      return NextResponse.json({ error: "File non trovato" }, { status: 404 });
    }

    // Permessi: admin/operator tutto, studente solo i suoi
    if (user?.role !== "admin" && user?.role !== "operatore") {
      if (String(materiale.clienteId) !== String(user?.clienteId)) {
        return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
      }
    }

    // Redirect to the Blob URL for download/viewing
    return NextResponse.redirect(materiale.blobUrl);
    
  } else {
    // Lista materiali filtrata per permessi
    let where = {};
    
    if (user?.role === "admin" || user?.role === "operatore") {
      // Admin/operator: filtro opzionale per clienteId
      if (filterClienteId) {
        where.clienteId = parseInt(filterClienteId);
      }
    } else {
      // Studente: vede solo i suoi
      if (user?.clienteId) {
        where.clienteId = user.clienteId;
      } else {
        return NextResponse.json([]);
      }
    }

    const materiali = await prisma.materialeDidattico.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Trasforma per compatibilità con il frontend esistente
    const results = materiali.map(m => ({
      id: m.id,
      titolo: m.titolo,
      materia: m.materia,
      sezione: m.sezione,
      clienteId: m.clienteId,
      nomeOriginale: m.nomeOriginale,
      tipo: m.nomeOriginale.split('.').pop()?.toLowerCase() || 'file',
      updatedAt: m.updatedAt.toISOString(),
      mime: m.mimeType
    }));

    return NextResponse.json(results);
  }
}

export async function POST(req) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  let formData;
  try {
    formData = await req.formData();
  } catch (err) {
    console.error('[materiale] error parsing formData:', err);
    return NextResponse.json({ error: 'Impossibile leggere dati upload' }, { status: 400 });
  }
  
  const file = formData.get("file");
  if (!file) return NextResponse.json({ error: "File mancante" }, { status: 400 });

  // clienteId obbligatorio!
  let clienteId = formData.get("clienteId");
  if (!clienteId) {
    clienteId = user?.clienteId;
  }
  if (!clienteId) {
    return NextResponse.json({ error: "clienteId obbligatorio" }, { status: 400 });
  }

  // Titolo/label: opzionale, default datalog
  let titolo = formData.get("titolo");
  if (!titolo || !titolo.trim()) {
    const now = new Date();
    titolo = now.toISOString().slice(0,19).replace(/[-:T]/g,"_");
  }
  
  const materia = formData.get("materia") || "";
  let sezione = (formData.get("sezione") || "MATERIALE").toString().trim().toUpperCase();
  if (!['MATERIALE','COMPITI','VOTI'].includes(sezione)) sezione = 'MATERIALE';
  
  const uploadBatchId = formData.get("uploadBatchId") || null;

  try {
    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Save metadata to database
    const materiale = await prisma.materialeDidattico.create({
      data: {
        clienteId: parseInt(clienteId),
        titolo: titolo.trim(),
        materia: materia || null,
        sezione,
        nomeOriginale: file.name,
        blobUrl: blob.url,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        uploadedBy: user.email || 'unknown',
        uploadBatchId: uploadBatchId
      }
    });

    // Realtime: emission handled on client after successful upload

    return NextResponse.json({ 
      ok: true, 
      materiale: {
        id: materiale.id,
        titolo: materiale.titolo,
        nomeOriginale: materiale.nomeOriginale,
        clienteId: materiale.clienteId,
        sezione: materiale.sezione,
        tipo: file.name.split('.').pop()?.toLowerCase() || 'file',
        updatedAt: materiale.updatedAt.toISOString(),
        mime: materiale.mimeType
      }
    });
    
  } catch (err) {
    console.error('[materiale] upload error:', err);
    return NextResponse.json({ 
      error: 'Errore durante il caricamento del file: ' + err.message 
    }, { status: 500 });
  }
}

// ==== DELETE: elimina singolo materiale o batch ====
export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");
  const clienteId = searchParams.get("clienteId");
  const all = searchParams.get("all") === "true";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const user = await getUserFromRequest(req);

  if (user?.role !== "admin" && user?.role !== "operatore") {
    return NextResponse.json({ error: "Solo admin/operatori possono cancellare materiale." }, { status: 403 });
  }

  // Elimina materiale singolo
  if (fileId) {
    const materiale = await prisma.materialeDidattico.findUnique({
      where: { id: parseInt(fileId) }
    });
    
    if (!materiale) {
      return NextResponse.json({ error: "Materiale non trovato" }, { status: 404 });
    }

    try {
      // Delete from Vercel Blob
      await del(materiale.blobUrl);
    } catch (err) {
      console.error('[materiale] blob delete error:', err);
      // Continue even if blob delete fails
    }

    // Delete from database
    await prisma.materialeDidattico.delete({
      where: { id: parseInt(fileId) }
    });

    // Realtime: emission handled on client after successful delete

    return NextResponse.json({ ok: true, deleted: fileId });
  }

  // Elimina tutti o batch per clienteId
  if (clienteId && all) {
    let where = { clienteId: parseInt(clienteId) };
    
    // Filtra per date se presenti
    if (from || to) {
      where.updatedAt = {};
      if (from) where.updatedAt.gte = new Date(from);
      if (to) where.updatedAt.lte = new Date(to);
    }

    const toDelete = await prisma.materialeDidattico.findMany({ where });
    
    // Delete from Vercel Blob
    for (const mat of toDelete) {
      try {
        await del(mat.blobUrl);
      } catch (err) {
        console.error(`[materiale] blob delete error for ${mat.id}:`, err);
      }
    }

    // Delete from database
    const result = await prisma.materialeDidattico.deleteMany({ where });
    
    // Realtime: emission handled on client after successful delete
    
    return NextResponse.json({ ok: true, deleted: result.count });
  }

  return NextResponse.json({ error: "Parametro mancante per cancellazione" }, { status: 400 });
}