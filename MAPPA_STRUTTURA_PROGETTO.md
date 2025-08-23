# MAPPA_STRUTTURA_PROGETTO.md – Ultimo aggiornamento: 2025-08-23 16:59 (UTC+2)

---

## STRUTTURA COMPLETA REPO

gestionale-recuperiamo/
│
├── app/
│   ├── api/
│   │   ├── attivita/
│   │   │   └── route.js
│   │   ├── user/
│   │   │   └── route.js
│   │   └── ...
│   ├── components/
│   │   ├── Navbar.js
│   │   └── attivita/
│   │       ├── AttivitaList.jsx
│   │       ├── AttivitaForm.jsx
│   │       ├── AttivitaDettaglioModal.jsx
│   │       └── ...
│   ├── lib/
│   │   └── prisma.js
│   ├── attivita/
│   │   └── page.js
│   ├── clienti/
│   │   └── page.js
│   ├── pacchetti/
│   │   └── page.js
│   ├── layout.js
│   ├── page.js
│   ├── not-found.js
│   └── ...
│
├── tests/
│   ├── components/
│   │   ├── attivita/
│   │   │   ├── AttivitaList.integration.test.jsx
│   │   │   ├── AttivitaForm.integration.test.jsx
│   │   │   └── AttivitaDettaglioModal.test.js
│   │   ├── clienti/
│   │   │   ├── ClientiForm.integration.test.jsx
│   │   │   └── validateClientiForm.test.js
│   │   └── ...
│   └── ...
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       ├── 20230823-initial/
│       │   └── migration.sql
│       └── ...
│
├── public/
│   ├── favicon.ico
│   ├── logo.png
│   └── ...
│
├── .env
├── .env.local
├── .gitignore
├── package.json
├── README.md
├── STANDARD_OPERATIVO.md
├── LOG_OPERATIVO.md
├── MAPPA_STRUTTURA_PROGETTO.md
└── ...

---

## LEGENDA DIRECTORY E FILE CHIAVE

- **app/**: Codice Next.js (route, pagine, layout, componenti, API, provider, shared code).
    - **attivita/**: Route e logica UI attività, filtri, modali.
    - **clienti/**: UI/CRUD clienti.
    - **pacchetti/**: UI/CRUD pacchetti.
    - **components/attivita/**: Tutti i componenti specifici per attività.
    - **api/**: Endpoint backend; CRUD attività, utenti, etc.
    - **lib/prisma.js**: Client Prisma singleton.
    - **layout.js**: Layout root globale.
    - **not-found.js**: Pagina custom 404.
- **tests/**: Test automatici (unit/integration, organized per area).
- **prisma/**: Modello e migrazioni database (schema.prisma, migrations).
- **public/**: File statici serviti da Next.js.
- **.env / .env.local**: Variabili ambiente (NON committare secrets).
- **README.md**: Documentazione principale, scenario test manuale, mappa struttura.
- **STANDARD_OPERATIVO.md**: Regole di formato, processi, best practice.
- **LOG_OPERATIVO.md**: Log operativo, reverse-chronological (UTC+2, ultimo evento in cima).
- **MAPPA_STRUTTURA_PROGETTO.md**: Questo file, sempre aggiornata.

---

## NOTE OPERATIVE

- TUTTI i file devono essere elencati nella struttura effettiva a ogni milestone o su richiesta.
- SE vengono creati nuovi moduli/componenti, aggiorna questa mappa e segnala il possibile rischio di duplicati.
- Dopo ogni modifica strutturale, aggiorna anche README.md, STANDARD_OPERATIVO.md, LOG_OPERATIVO.md.
- Esegui SEMPRE il controllo duplicati file:
  ```powershell
  Get-ChildItem -Recurse -File | Group-Object Name | Where-Object { $_.Count -gt 1 } | Select-Object -ExpandProperty Name
  ```
  Se la lista è vuota repo OK, altrimenti risolvi subito e logga.

---

## SCENARIO TEST MANUALE (release attuale: filtro attività per intervallo temporale)

1. Seleziona “Cliente”: la tabella mostra solo le attività di quel cliente.
2. Seleziona “Pacchetto”: la tabella mostra solo le attività di quel pacchetto.
3. Imposta solo “Dal”: la tabella mostra tutte le attività dalla data selezionata in poi.
4. Imposta solo “Al”: la tabella mostra tutte le attività fino a quella data inclusa.
5. Imposta sia “Dal” che “Al”: la tabella mostra solo le attività tra le due date (estremi inclusi).
6. Combinazioni con altri filtri funzionano (AND logico).
7. Reset filtri: tornano tutte le attività.
8. Tabella vuota: se nessuna attività corrisponde ai filtri, compare il messaggio “Nessuna attività trovata”.
9. Creazione/modifica/eliminazione: la tabella si aggiorna sempre secondo i filtri attivi.

---

## ULTIMO AGGIORNAMENTO MAPPA

**Data e ora**: 2025-08-23 16:59 (UTC+2)  
**Nota**: Struttura coerente con milestone attuale (feature filtri attività con intervallo temporale Dal-Al).  
**Mantieni SEMPRE aggiornata questa sezione dopo ogni modifica strutturale!**