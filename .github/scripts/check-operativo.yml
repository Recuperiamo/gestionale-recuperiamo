const fs = require('fs');

function fail(msg) {
  console.error(`::error::${msg}`);
  process.exit(1);
}

// 1. Recupera la lista dei file modificati dalla variabile ambiente
const changed = process.env.CHANGED_FILES ? process.env.CHANGED_FILES.split('\n').filter(Boolean) : [];
const requiredLog = 'LOG_OPERATIVO.md';
const requiredStandard = 'STANDARD_OPERATIVO.md';
const requiredReadme = 'README.md';
const requiredOnboarding = 'ONBOARDING_SESSION.md';
const requiredEndSession = 'END_SESSION.md';

const checklistFiles = [requiredStandard, requiredReadme, requiredOnboarding, requiredEndSession];

// 2. Se viene modificato QUALSIASI file tra quelli chiave, LOG_OPERATIVO.md deve essere tra i changed
const fileChiaveModificato = checklistFiles.some(f => changed.includes(f));
if (fileChiaveModificato && !changed.includes(requiredLog)) {
  fail('Se modifichi README.md, STANDARD_OPERATIVO.md, ONBOARDING_SESSION.md o END_SESSION.md, devi aggiornare LOG_OPERATIVO.md nella stessa PR.');
}

// 3. Se LOG_OPERATIVO.md è tra i file cambiati, controlla l’ultima entry
if (changed.includes(requiredLog)) {
  const log = fs.readFileSync(requiredLog, 'utf8');

  // Trova l’ultima entry tra i separatori ---
  const entries = log.split(/^---$/m).map(e => e.trim()).filter(Boolean);
  if (entries.length < 1) fail('LOG_OPERATIVO.md sembra vuoto, impossibile verificare ultima entry.');

  const ultima = entries[0].startsWith('#') ? entries[1] : entries[0]; // ignora titolo eventuale
  // 3a. Deve esserci la versione dello standard
  if (!/Versione STANDARD_OPERATIVO\.md/i.test(ultima)) fail('L’ultima entry di LOG_OPERATIVO.md deve riportare la versione di STANDARD_OPERATIVO.md.');
  // 3b. Deve esserci Scenario Test
  if (!/Scenario Test/i.test(ultima)) fail('L’ultima entry di LOG_OPERATIVO.md deve contenere "Scenario Test".');
  // 3c. Deve esserci la sezione "File coinvolti" con almeno una voce
  if (!/File coinvolti\*?\s*:\s*([^\n]*\n)+/i.test(ultima)) fail('L’ultima entry di LOG_OPERATIVO.md deve contenere la sezione "File coinvolti".');
  // 3d. Se la PR modifica STANDARD_OPERATIVO.md o README.md, queste voci devono apparire nella lista file coinvolti
  const filesInUltima = Array.from(ultima.matchAll(/- ([^\s]+)/g)).map(m => m[1]);
  for (const f of [requiredStandard, requiredReadme]) {
    if (changed.includes(f) && !filesInUltima.includes(f)) {
      fail(`Hai modificato ${f} ma non lo hai elencato tra i file coinvolti nell’ultima entry di LOG_OPERATIVO.md.`);
    }
  }
}

console.log('Controlli operativi superati.');