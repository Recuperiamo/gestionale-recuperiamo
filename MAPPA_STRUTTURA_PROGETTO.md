# Mappa Struttura Progetto – Ultimo aggiornamento: 2025-08-22 22:15 (UTC+2)

```plaintext
gestionale-recuperiamo/
│
├── app/                       # Cartella principale Next.js (tutte le route e la logica frontend/backend)
│   ├── api/                   # Route API (Next.js Route Handlers)
│   │   ├── attivita/
│   │   │   └── route.js       # API: CRUD attività (usa Prisma)
│   │   ├── user/
│   │   │   └── route.js       # API: gestione utenti
│   │   └── ...                # Altre route API
│   │
│   ├── lib/                   # Librerie interne (shared code)
│   │   └── prisma.js          # Inizializzazione e export client Prisma (DA NON RIMUOVERE)
│   │
│   ├── layout.js              # RootLayout globale, include <SessionProvider>
│   ├── page.js                # Pagina principale (landing/homepage)
│   ├── not-found.js           # Pagina 404 custom
│   ├── ...                    # Altre pagine o layout di sezione
│
├── prisma/                    # Schema e migrazioni Prisma
│   ├── schema.prisma          # Definizione modello database
│   └── migrations/            # Directory migrazioni
│
├── public/                    # File statici (immagini, favicon, ecc.)
│   └── ...
│
├── node_modules/              # Dipendenze npm (NON versionare)
│
├── .env / .env.local          # Variabili ambiente (database, secret, ecc.)
├── package.json               # Configurazione npm/yarn, scripts, dipendenze
├── README.md                  # Documentazione principale, include questa mappa
├── STANDARD_OPERATIVO.md      # Regole operative, convenzioni, checklist QA
├── LOG_OPERATIVO.md           # Log operativo sempre aggiornato (reverse chronological, UTC+2)
├── MAPPA_STRUTTURA_PROGETTO.md # File mappa struttura (questo file)
└── ...
```

---

## Legenda Directory e File Chiave

- **app/**: Tutto il codice dell’applicazione Next.js (route, pagine, layout, API, provider, shared code).
    - **api/**: Endpoint backend, handler REST/POST/GET per ogni risorsa (CRUD attività, utenti, ecc).
    - **lib/prisma.js**: Client Prisma singleton, usato da tutte le route API per comunicare col database.
    - **layout.js**: Layout radice, include solo <SessionProvider> (non più provider custom).
    - **not-found.js**: Pagina custom 404.
- **prisma/**: Tutto ciò che riguarda Prisma e il database.
    - **schema.prisma**: Definizione DB, modelli, relazioni.
    - **migrations/**: Migrazioni generate da Prisma migrate.
- **public/**: File statici serviti da Next.js.
- **.env / .env.local**: Variabili ambiente (NON committare secrets in repo pubblica!).
- **package.json**: Scripts, dipendenze, configurazione progetto.
- **README.md**: Documentazione utente/sviluppatore, inserire qui la mappa aggiornata.
- **STANDARD_OPERATIVO.md**: Regole di formato, processi, best practice (vedi anche “personal instructions” Copilot).
- **LOG_OPERATIVO.md**: Log operativo, sempre aggiornato, reverse chronological (ultimo evento in cima), orario UTC+2.
- **MAPPA_STRUTTURA_PROGETTO.md**: Questo file, mantiene la struttura e la legenda aggiornata.

---

## Note e punti di attenzione

- **Provider React**: Usare SOLO quelli indicati in layout.js (es: <SessionProvider>); evitare provider custom non documentati.
- **Import Prisma**: Usare sempre `import prisma from '../lib/prisma'` (path relativo corretto).
- **Aggiornamento struttura**: Dopo ogni modifica strutturale, aggiornare MAPPA_STRUTTURA_PROGETTO.md, README.md, STANDARD_OPERATIVO.md e LOG_OPERATIVO.md.
- **Non duplicare file di provider, prisma, ecc.**: Prima di creare nuovi file, cerca sempre duplicati o file simili.
- **Route API**: Ogni cartella sotto `app/api` rappresenta una risorsa REST, con un file `route.js` per gestirne i metodi.

---

## Scenario test integrità struttura

1. Da root, eseguire ricerca file chiave:
    - Verificare presenza e unicità di `app/lib/prisma.js`, `app/layout.js`, `prisma/schema.prisma`.
    - Cercare duplicati o file non documentati.
2. Da fresh clone, lanciare:
    - `npm install`
    - `npx prisma generate`
    - `npm run build` e `npm run dev`
    - Navigare tra tutte le route e testare API CRUD.
3. Dopo ogni modifica strutturale, confrontare la repo con questa mappa (tramite script o manualmente).

---

**Ultimo aggiornamento mappa:** 2025-08-22 22:15 (UTC+2)  
**Mantieni SEMPRE aggiornata questa sezione dopo ogni modifica strutturale!**