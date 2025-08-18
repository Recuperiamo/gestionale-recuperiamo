// ATTENZIONE: Questo file è deprecato. Tutte le route devono usare Prisma!
import fs from "fs";
import path from "path";

// Percorso file temporaneo (NON in produzione)
const DATA_PATH = path.resolve(process.cwd(), "tmp_pacchetti.json");

// Carica pacchetti dal file, oppure array vuoto
function loadPacchetti() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  } catch {
    return [];
  }
}
function savePacchetti(pacchetti) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(pacchetti, null, 2), "utf-8");
}

// Funzioni CRUD
export async function getPacchettoById(id) {
  const pacchetti = loadPacchetti();
  console.log("DEBUG getPacchettoById. id richiesto:", id, "lista pacchetti:", JSON.stringify(pacchetti));
  return pacchetti.find(p => String(p.id) === String(id)) || null;
}

export async function updatePacchettoById(id, data) {
  const pacchetti = loadPacchetti();
  console.log("DEBUG updatePacchettoById. id richiesto:", id, "data:", data, "lista pacchetti:", JSON.stringify(pacchetti));
  const idx = pacchetti.findIndex(p => String(p.id) === String(id));
  if (idx === -1) {
    console.log("DEBUG updatePacchettoById. id NON trovato!");
    return null;
  }
  pacchetti[idx] = { ...pacchetti[idx], ...data };
  savePacchetti(pacchetti);
  console.log("DEBUG updatePacchettoById. pacchetto aggiornato:", pacchetti[idx]);
  return pacchetti[idx];
}

export async function deletePacchettoById(id) {
  const pacchetti = loadPacchetti();
  console.log("DEBUG deletePacchettoById. id richiesto:", id, "lista pacchetti:", JSON.stringify(pacchetti));
  const idx = pacchetti.findIndex(p => String(p.id) === String(id));
  if (idx === -1) {
    console.log("DEBUG deletePacchettoById. id NON trovato!");
    return false;
  }
  const deleted = pacchetti.splice(idx, 1);
  savePacchetti(pacchetti);
  console.log("DEBUG deletePacchettoById. pacchetto cancellato:", deleted);
  return true;
}

export async function getPacchettiByClienteId(clienteId) {
  const pacchetti = loadPacchetti();
  console.log("DEBUG getPacchettiByClienteId. clienteId richiesto:", clienteId, "lista pacchetti:", JSON.stringify(pacchetti));
  return pacchetti.filter(p => String(p.clienteId) === String(clienteId));
}

function getNextId(pacchetti) {
  const maxId = pacchetti.reduce((max, p) => Math.max(max, Number(p.id)), 0);
  return String(maxId + 1);
}

export async function createPacchetto(data) {
  const pacchetti = loadPacchetti();
  const newPacchetto = { ...data, id: getNextId(pacchetti) };
  pacchetti.push(newPacchetto);
  savePacchetti(pacchetti);
  console.log("DEBUG createPacchetto. nuovo pacchetto creato:", newPacchetto, "lista pacchetti aggiornata:", JSON.stringify(pacchetti));
  return newPacchetto;
}