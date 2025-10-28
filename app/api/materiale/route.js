import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/authOptions'

// Cartella dove vengono salvati i materiali (crea se non esiste)
// On production (serverless platforms like Vercel) the filesystem is ephemeral
// and not writable under the project directory. Use the OS temp dir there
// to avoid hard crashes; for a proper production setup use external storage.
const UPLOAD_DIR = process.env.NODE_ENV === 'production'
  ? path.join(os.tmpdir(), 'recuperiamo-materiali')
  : path.resolve(process.cwd(), "uploads", "materiali");
const INDEX_FILE = path.join(UPLOAD_DIR, "materiali.json");

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  try { await fs.access(INDEX_FILE); }
  catch { await fs.writeFile(INDEX_FILE, "[]", "utf-8"); }
}

async function readIndex() {
  await ensureUploadDir();
  try {
    const raw = await fs.readFile(INDEX_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
async function writeIndex(list) {
  await ensureUploadDir();
  await fs.writeFile(INDEX_FILE, JSON.stringify(list, null, 2), "utf-8");
}

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

  await ensureUploadDir();
  const index = await readIndex();

  if (fileId) {
    // Download file
    const meta = index.find(m => m.id === fileId);
    if (!meta) return NextResponse.json({ error: "File non trovato" }, { status: 404 });
    // Permessi: admin/operator tutto, studente solo i suoi
    if (user?.role !== "admin" && user?.role !== "operatore") {
      if (String(meta.clienteId) !== String(user?.clienteId)) {
        return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
      }
    }
    const filePath = path.join(UPLOAD_DIR, meta.nomeSalvato);
    try {
      const fileBuf = await fs.readFile(filePath);
      // Serve images/files inline so that <img src="/api/materiale?fileId=..."> renders
      // in the browser instead of forcing a download. Keep Content-Type accurate.
      return new NextResponse(fileBuf, {
        headers: {
          "Content-Type": meta.mime || "application/octet-stream",
          // use inline disposition to allow direct rendering in-page
          "Content-Disposition": `inline; filename="${meta.nomeOriginale}"`
        }
      });
    } catch {
      return NextResponse.json({ error: "Errore lettura file" }, { status: 500 });
    }
  } else {
    // Lista materiali filtrata per permessi
    let results = index;
    if (user?.role === "admin" || user?.role === "operatore") {
      // Admin/operator: filtro opzionale per clienteId
      if (filterClienteId) {
        results = results.filter(m => String(m.clienteId) === String(filterClienteId));
      }
    } else {
      // Studente: vede solo i suoi
      results = results.filter(m => String(m.clienteId) === String(user?.clienteId));
    }
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
    // Se non passato, usa quello della sessione
    clienteId = user?.clienteId;
  }
  if (!clienteId) {
    return NextResponse.json({ error: "clienteId obbligatorio" }, { status: 400 });
  }

  // Titolo/label: opzionale, default datalog
  let titolo = formData.get("titolo");
  if (!titolo) {
    const now = new Date();
    titolo = now.toISOString().slice(0,19).replace(/[-:T]/g,"_");
  }
  const materia = formData.get("materia") || "";

  await ensureUploadDir();
  const id = uuidv4();
  const ext = path.extname(file.name);
  const nomeSalvato = `${id}${ext}`;
  const filePath = path.join(UPLOAD_DIR, nomeSalvato);

  try {
    const arrayBuffer = await file.arrayBuffer();
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));
  } catch (err) {
    // Attempt fallback: try writing to OS tmp dir (if not already used)
    console.error('[materiale] write file error, attempting fallback:', err);
    try {
      const fallbackDir = path.join(os.tmpdir(), 'recuperiamo-materiali');
      await fs.mkdir(fallbackDir, { recursive: true });
      const fallbackPath = path.join(fallbackDir, nomeSalvato);
      const arrayBuffer = await file.arrayBuffer();
      await fs.writeFile(fallbackPath, Buffer.from(arrayBuffer));
      // Use fallback index in temp as well
      console.warn('[materiale] wrote file to fallback tmp dir:', fallbackPath);
      // adjust INDEX_FILE usage below by setting a temporary index file variable
      // (we'll still try to update the primary index; if that fails, log and continue)
    } catch (err2) {
      console.error('[materiale] fallback write failed:', err2);
      return NextResponse.json({ error: 'Errore salvataggio file' }, { status: 500 });
    }
  }

  const index = await readIndex();
  const meta = {
    id,
    nomeSalvato,
    nomeOriginale: file.name,
    titolo,
    materia,
    clienteId,
    tipo: ext.replace(/^\./, "").toLowerCase(),
    updatedAt: new Date().toISOString(),
    mime: file.type || "application/octet-stream"
  };
  index.push(meta);
  await writeIndex(index);

  return NextResponse.json({ ok: true, materiale: meta });
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

  await ensureUploadDir();
  let index = await readIndex();

  // Elimina materiale singolo
  if (fileId) {
    const i = index.findIndex(m => m.id === fileId);
    if (i === -1) return NextResponse.json({ error: "Materiale non trovato" }, { status: 404 });
    const filePath = path.join(UPLOAD_DIR, index[i].nomeSalvato);
    try { await fs.unlink(filePath); } catch {}
    index.splice(i, 1);
    await writeIndex(index);
    return NextResponse.json({ ok: true, deleted: fileId });
  }

  // Elimina tutti o batch per clienteId
  if (clienteId && all) {
    let toDelete = index.filter(m => String(m.clienteId) === String(clienteId));
    // Filtra per date se presenti
    if (from || to) {
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;
      toDelete = toDelete.filter(m => {
        const upd = new Date(m.updatedAt);
        if (fromDate && upd < fromDate) return false;
        if (toDate && upd > toDate) return false;
        return true;
      });
    }
    const ids = toDelete.map(m => m.id);
    for (const mat of toDelete) {
      try { await fs.unlink(path.join(UPLOAD_DIR, mat.nomeSalvato)); } catch {}
    }
    index = index.filter(m => !ids.includes(m.id));
    await writeIndex(index);
    return NextResponse.json({ ok: true, deleted: ids.length });
  }

  return NextResponse.json({ error: "Parametro mancante per cancellazione" }, { status: 400 });
}