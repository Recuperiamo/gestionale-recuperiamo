// @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { prisma } from '../../../lib/prisma';
import { uploadFile, deleteFile } from '../../lib/storage';
import { v2 as cloudinary } from 'cloudinary';
// Ably removed: realtime notifications are now handled client-side via Socket.IO

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

async function proxyCloudinaryFile(blobUrl: string): Promise<Response | null> {
  // Tentativo 1: URL originale senza firma (funciona se il file è public type:upload)
  // Il server non manda Sec-Fetch/Referer del browser che triggera l'ACL Cloudinary
  try {
    const plain = await fetch(blobUrl)
    if (plain.ok) return plain
    console.warn(`[materiale] plain fetch ${plain.status} — provo signed URL`)
  } catch (e) {
    console.warn('[materiale] plain fetch error:', e)
  }

  // Tentativo 2: URL firmato con public_id corretto (estensione inclusa, nessun format transform)
  try {
    configureCloudinary()
    const m = blobUrl.match(/\/(image|raw|video)\/(upload|authenticated|private)\/(?:v\d+\/)?(.+?)(\.[^./]+)?$/)
    if (!m) return null
    const [, resourceType, deliveryType, pubIdNoExt, ext] = m
    // Includi sempre l'estensione nel public_id — evita trasformazioni f_xxx a pagamento
    const publicId = pubIdNoExt + (ext || '')
    const signedUrl = cloudinary.url(publicId, {
      resource_type: resourceType as any,
      type: deliveryType,
      sign_url: true,
      secure: true,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    })
    const signed = await fetch(signedUrl)
    if (signed.ok) return signed
    console.error(`[materiale] signed fetch ${signed.status} url=${signedUrl}`)
  } catch (err) {
    console.error('[materiale] signed URL error:', err)
  }
  return null
}

const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB safeguard for uploads

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

    // Cloudinary: proxy server-side (evita ACL/referer 401 del browser)
    // Vercel Blob: redirect diretto (pubblico)
    if (materiale.blobUrl.includes('cloudinary.com')) {
      const upstream = await proxyCloudinaryFile(materiale.blobUrl)
      if (!upstream) return NextResponse.json({ error: 'Errore recupero file' }, { status: 502 })
      return new NextResponse(upstream.body, {
        headers: {
          'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
          'Content-Disposition': upstream.headers.get('content-disposition') || 'inline',
          'Cache-Control': 'private, max-age=3600',
        }
      })
    }
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
      mime: m.mimeType,
      uploadBatchId: m.uploadBatchId
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

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return NextResponse.json({ error: "File troppo grande (limite 100 MB)" }, { status: 413 });
  }

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
  
  // Sottocategoria: solo per sezione MATERIALE
  let sottocategoria = null;
  if (sezione === "MATERIALE") {
    const sottocat = formData.get("sottocategoria");
    if (sottocat && ['TEORIA','SIMULAZIONI','ESERCIZI'].includes(sottocat.toUpperCase())) {
      sottocategoria = sottocat.toUpperCase();
    }
  }
  
  const uploadBatchId = formData.get("uploadBatchId") || null;

  try {
    const { url, provider } = await uploadFile(file.name, file, file.type || 'application/octet-stream');

    // Save metadata to database
    const materiale = await prisma.materialeDidattico.create({
      data: {
        clienteId: parseInt(clienteId),
        titolo: titolo.trim(),
        materia: materia || null,
        sezione,
        sottocategoria: sottocategoria || null,
        nomeOriginale: file.name,
        blobUrl: url,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        uploadedBy: user.email || 'unknown',
        uploadBatchId: uploadBatchId
      }
    });
    console.log(`[materiale] uploaded via ${provider}: ${url}`);

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
      await deleteFile(materiale.blobUrl);
    } catch (err) {
      console.error('[materiale] storage delete error:', err);
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
        await deleteFile(mat.blobUrl);
      } catch (err) {
        console.error(`[materiale] storage delete error for ${mat.id}:`, err);
      }
    }

    // Delete from database
    const result = await prisma.materialeDidattico.deleteMany({ where });
    
    // Realtime: emission handled on client after successful delete
    
    return NextResponse.json({ ok: true, deleted: result.count });
  }

  return NextResponse.json({ error: "Parametro mancante per cancellazione" }, { status: 400 });
}