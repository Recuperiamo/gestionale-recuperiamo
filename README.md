# Gestionale Pacchetti Ore – Recuperiamo

## Descrizione
Applicazione web per la gestione dei pacchetti ore, clienti e attività, sviluppata in Next.js 15, TypeScript e Tailwind CSS.

---

## Panoramica e Funzionalità

- Gestione anagrafica clienti (CRUD)
- Gestione pacchetti ore associati ai clienti (CRUD)
- Gestione attività collegate a clienti e pacchetti, con calcolo automatico ore residue
- Ruoli utenti, permessi e autenticazione (NextAuth.js + Prisma)
- Alert automatici sulle soglie ore residue dei pacchetti
- Storico modifiche pacchetti (changelog)
- Dashboard, reportistica, filtri avanzati su attività e clienti
- Esportazione storico attività (PDF/XLS)
- UI modulare, responsive, navigazione tra tutte le sezioni principali

---

## Struttura della repository

Consulta **MAPPA_STRUTTURA_PROGETTO.md** per la struttura aggiornata e completa del progetto.

- `/app/` — Unico entrypoint applicativo (route, API, layout, componenti, shared code)
- `/public/` — Asset statici
- `/prisma/` — Schema e migrazioni Prisma
- `/tests/` — Test automatici
- File root: `README.md`, `STANDARD_OPERATIVO.md`, `LOG_OPERATIVO.md`, `MAPPA_STRUTTURA_PROGETTO.md`, configurazione Next.js/Tailwind/Prisma/ESLint
- **elencocompleto.txt** — Elenco completo e aggiornato di tutti i file e path presenti nella repository. Da usare sempre per controllo duplicati e rischi di conflitto nomi (vedi STANDARD_OPERATIVO.md).

---

## Avvio rapido

```bash
git clone https://github.com/Recuperiamo/gestionale-recuperiamo.git
cd gestionale-recuperiamo
npm install
npm run dev
```
Accedi all’applicazione su [http://localhost:3000](http://localhost:3000)

---

## Sviluppo locale

### Prerequisiti

- Node.js 20.x o superiore
- npm 9.x o superiore
- Sistema operativo: Linux, macOS, Windows

### Comandi principali

```bash
npm run dev         # Avvio ambiente sviluppo
npm run build       # Build produzione
npm run lint        # Lint del codice
npm test            # Test automatici
```

---

## Testing

- Test automatici in `/tests/`
- Ogni modifica a test, struttura o feature deve essere seguita da test manuale e aggiornamento documentazione (vedi STANDARD_OPERATIVO.md)

---

## Policy .gitignore

- Sono SEMPRE esclusi: node_modules, .next, dist, out, *.log, *.tmp, .env*, test/coverage, scarti editor, file temporanei custom.
- NON sono MAI esclusi: LOG_OPERATIVO.md, STANDARD_OPERATIVO.md, README.md, file di configurazione strategici.

---

## Note operative e sviluppatori

- Per procedure di contribuzione, regole operative, naming, policy di commit, scenario test/manuale: vedi **STANDARD_OPERATIVO.md**
- Dopo ogni modifica strutturale, aggiorna **README.md**, **STANDARD_OPERATIVO.md**, **LOG_OPERATIVO.md** e **MAPPA_STRUTTURA_PROGETTO.md**
- Consulta **LOG_OPERATIVO.md** per la cronologia dettagliata delle operazioni
- **Usa SEMPRE elencocompleto.txt (root repo) per controllo duplicati file/nomi prima di ogni nuova creazione o proposta.**
- Segnala in chat ogni dubbio, rischio di duplicato, anomalia o refactor

---

## Ultimo aggiornamento
2025-08-25 23:01 UTC+2

---

## Nota (file deprecati)

Alcuni file placeholder/prototipali sono stati spostati nella cartella `/__deprecated__/` il 2025-10-28 per ridurre il noise nella struttura attiva del progetto mantenendo comunque una copia storica.

File spostati (esempi):
- `app/utils/exportToPdf.js`
- `app/utils/exportToXls.js`
- `app/api/clienti/[id]/route.js` (placeholder)
- `.github/workflows/deploy.yml` (placeholder)
- `placeholder_report.txt` (archiviato)

Se per qualche motivo è necessario ripristinare il contenuto originale, recuperalo dalla cartella `/__deprecated__/` o dalla storia Git della repository.

## Richieste Modifica Lezioni

Flusso:
1. Cliente apre /pacchetti-lezioni → Lezioni Prenotate → “Richiedi modifica”.
2. Tipi supportati: cambio_orario, cambio_data, cancellazione.
3. Vincoli: cancellazione >= 7 giorni; cambio giorno < 3 giorni non consentito.
4. Admin gestisce in /admin/modifiche:
   - Stato: pending → in_review → approved / rejected
   - Modale approvazione (non cancellazione) consente override orario e durata
5. Ore pacchetto aggiornate automaticamente (delta durata o rimborso cancellazione).

# Gestionale Pacchetti Ore – Recuperiamo

## Descrizione
Applicazione web per la gestione dei pacchetti ore, clienti, lezioni e materiale didattico, sviluppata in **Next.js 15**, **TypeScript** e **Tailwind CSS** (alcune parti possono essere ancora in JS durante la migrazione).

---

## Panoramica e Funzionalità

- Gestione anagrafica clienti (CRUD)
- Gestione pacchetti ore associati ai clienti (CRUD) con soglie ore residue e alert
- Gestione lezioni (attività) con consumo ore e stato (prenotata, svolta, spostata, cancellata, ripianificata…)
- Ruoli utenti, permessi e autenticazione (NextAuth.js + Prisma)
- Storico modifiche pacchetti (changelog)
- Richieste modifica lezioni:
  - Creazione dal calendario cliente (modale unificata)
  - Tipi: cambio data, cambio data+ora, cancellazione
  - Gestione rapida lato admin da “Lezioni Prenotate” (badge pending cliccabile)
  - Approvazione / rifiuto / override durata
  - Archiviazione automatica di richieste precedenti alla nuova approvata
- Calendario unificato (admin / cliente) con stessa base logica
- Dashboard, filtri avanzati e reportistica
- Esportazione storico attività (PDF/XLS) [feature esistente / eventuale evoluzione]
- Pagine “Lavagna” (spazio condiviso appunti – prototipo) e “Materiale” (repository stile classroom – prototipo)
- UI modulare, responsive
- Log operativo e standard operativo versionati
- Controllo duplicati e struttura tramite `elencocompleto.txt`
- Navbar dinamica in base al ruolo (aggiunte voci Lavagna e Materiale)

---

## Struttura della repository

Consulta **MAPPA_STRUTTURA_PROGETTO.md** per la struttura aggiornata e completa del progetto.

- `/app/` — Route, API, layout, componenti applicativi
  - `/app/pacchetti-lezioni` — Gestione e visualizzazione lezioni/pacchetti
  - `/app/profilo` — Calendario personale cliente + modale richieste
  - `/app/lavagna` — Spazio condiviso (proto)
  - `/app/materiale` — Repository materiale didattico (proto)
  - `/app/admin/modifiche` — Gestione richieste lato admin (modale approvazione)
- `/public/` — Asset statici
- `/prisma/` — Schema e migrazioni Prisma
- `/tests/` — Test automatici
- File root: `README.md`, `STANDARD_OPERATIVO.md`, `LOG_OPERATIVO.md`, `MAPPA_STRUTTURA_PROGETTO.md`, `elencocompleto.txt`
- Configurazioni: Next.js, Tailwind, ESLint, Prisma

---

## Avvio rapido

```bash
git clone https://github.com/Recuperiamo/gestionale-recuperiamo.git
cd gestionale-recuperiamo
npm install
npm run dev
```
Apri [http://localhost:3000](http://localhost:3000)

---

## Sviluppo locale

### Prerequisiti
- Node.js 20.x o superiore
- npm 9.x o superiore
- OS: Linux / macOS / Windows

### Comandi principali
```bash
npm run dev         # Avvio sviluppo
npm run build       # Build produzione
npm run lint        # Lint
npm test            # Test automatici
```

---

## Testing
- Test automatici in `/tests/`
- Ogni feature / fix → scenario test manuale + aggiornamento documentazione (vedi STANDARD_OPERATIVO.md)

---

## Richieste Modifica Lezioni (Sintesi Operativa)
- Cliente: clic su lezione futura nel calendario (profilo) → modale richiesta
- Admin: badge “pending” in tabella Lezioni Prenotate → modale approvazione/rifiuto
- Stati: pending, in_review (se introdotto), approved, rejected, archived
- Archiviazione automatica: nuove approvazioni invalidano la precedente approvata per la stessa lezione
- Orario originario mostrato in tabella richieste se differente dall’orario attuale

---

## Policy .gitignore
- Esclusi: `node_modules`, `.next`, `dist`, `out`, `*.log`, `*.tmp`, `.env*`, test coverage, file temporanei editor
- Mai esclusi: `LOG_OPERATIVO.md`, `STANDARD_OPERATIVO.md`, `README.md`, configurazioni

---

## Documentazione Operativa
- **STANDARD_OPERATIVO.md**: regole vincolanti
- **LOG_OPERATIVO.md**: cronologia operativa (reverse order)
- **MAPPA_STRUTTURA_PROGETTO.md**: mappa aggiornata (non ridurre lunghezza)
- **elencocompleto.txt**: elenco integrale file (usare per controllo duplicati)

---

## Ultimo aggiornamento

2025-09-29 03:50 UTC+2