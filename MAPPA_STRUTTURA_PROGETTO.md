# Mappa Struttura Progetto – Ultimo aggiornamento: 2025-08-23 13:54 (UTC+2)

```plaintext
gestionale-recuperiamo/
│
├── app/                       # Cartella principale Next.js (route, logica frontend/backend, componenti, API, layout)
│   ├── api/                   # Route API (Next.js Route Handlers)
│   │   ├── attivita/
│   │   │   └── route.js       # API: CRUD attività (usa Prisma, milestone 5, POST/GET/PATCH/DELETE, validazione, update ore pacchetto)
│   │   ├── user/
│   │   │   └── route.js       # API: gestione utenti
│   │   └── ...                # Altre route API
│   │
│   ├── lib/                   # Librerie interne (shared code)
│   │   └── prisma.js          # Inizializzazione ed export client Prisma (DA NON RIMUOVERE)
│   │
│   ├── layout.js              # RootLayout globale, include <SessionProvider>
│   ├── page.js                # Pagina principale (landing/homepage)
│   ├── not-found.js           # Pagina 404 custom
│   ├── ...                    # Altre pagine, layout, componenti
│
├── tests/                     # Test automatici/unitari (Jest, Testing Library, ecc.)
│   ├── components/
│   │   └── clienti/
│   │       ├── ClientiForm.integration.test.jsx
│   │       └── validateClientiForm.test.js
│   └── ...                    # Altri test organizzati per area/funzionalità
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
├── MAPPA_STRUTTURA_PROGETTO.md # Questo file, sempre aggiornato
└── ...
```

---

## Legenda Directory e File Chiave

- **app/**: Tutto il codice dell’applicazione Next.js (route, pagine, layout, API, provider, shared code, componenti).
    - **api/**: Endpoint backend, handler REST/POST/GET per ogni risorsa (CRUD attività, utenti, ecc).
    - **lib/prisma.js**: Client Prisma singleton, usato da tutte le route API per comunicare col database.
    - **layout.js**: Layout radice, include solo <SessionProvider> (non più provider custom).
    - **not-found.js**: Pagina custom 404.
- **tests/**: Test automatici (Jest, React Testing Library, ecc.), organizzati per area funzionale.  
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

## Note operative e scenario test/manuale

**Dopo ogni modifica strutturale:**
1. Aggiorna MAPPA_STRUTTURA_PROGETTO.md, README.md, STANDARD_OPERATIVO.md, LOG_OPERATIVO.md.
2. Esegui controllo duplicati file:
   ```powershell
   Get-ChildItem -Recurse -File | Group-Object Name | Where-Object { $_.Count -gt 1 } | Select-Object -ExpandProperty Name
   ```
   Se lista vuota: repo pulita. Se presenti file, risolvere e loggare.
3. Esegui:
   - `npm install`
   - `npx prisma generate`
   - `npm run build`
   - `npm run dev`
   - `npm test`
4. Naviga tra tutte le route e verifica funzionamento app, API, test.
5. Conferma che la struttura reale coincida con questa mappa.

---

## Scenario test/manuale milestone 5 – CRUD attività

1. POST `/api/attivita` → crea attività, aggiorna pacchetto
2. PATCH `/api/attivita` → aggiorna attività, aggiorna ore residue pacchetto
3. DELETE `/api/attivita` → elimina attività, ripristina ore residue pacchetto
4. GET `/api/attivita` e `/api/attivita?id=ID` → verifica stato attività e pacchetto
5. Edge-case: dati non validi/id errato → errore gestito, doppio inserimento crea record separati
6. Ripetere con pacchetti/attività diversi, verificare coerenza dati

---

**Ultimo aggiornamento mappa:** 2025-08-23 13:54 (UTC+2)  
**Mantieni SEMPRE aggiornata questa sezione dopo ogni modifica strutturale!**