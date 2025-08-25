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
- Segnala in chat ogni dubbio, rischio di duplicato, anomalia o refactor

---

## Ultimo aggiornamento

2025-08-25 23:01 UTC+2
