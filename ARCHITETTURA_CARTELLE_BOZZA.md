# Bozza architettura cartelle e componenti – Gestionale Didattica (MVP)

## Obiettivi di architettura
- Separazione chiara tra front-end, back-end e documentazione
- Facilità di estensione futura e mantenimento
- Rintracciabilità dei deliverable progettuali e degli standard

---

## Struttura principale (root)

- /app/             → Entry point applicazione, logiche di routing, layout generali
- /src/             → Tutto il codice sorgente “core” (componenti, logica, fetcher)
  - /components/    → Componenti UI riusabili (tabelle, form, card, dialog, ecc.)
  - /fetcher/       → Funzioni di accesso dati/API (client/server)
  - /utils/         → Funzioni di utilità e helper condivisi
  - /models/        → Schemi entità dati (tipi, interfacce, validatori)
- /public/          → Asset statici (immagini, logo, favicon, documenti pubblici)
- /docs/            → Documentazione tecnica, guide, standard, mappa funzionale, schemi ER
- /tests/           → Test automatici/unitari (quando previsti)
- /scripts/         → Script di supporto (migrazioni, seed, automazioni)
- /.github/         → Workflow, template issue/PR, check-operativo
- /output.md        → Output generati temporanei/manuali
- /context.md       → File di contesto per onboarding/recupero stato

---

## Deliverable/documentazione in root
- LOG_OPERATIVO.md
- README.md
- STANDARD_OPERATIVO.md
- Tutte le mappe/checklist/scenari/strutture dati di fase (versionate)

---

## Note operative
- Ogni cartella avrà un context.md (o README.md) che ne spiega lo scopo.
- La struttura è pensata per MVP ma facilmente scalabile.
- Il dettaglio dei componenti UI e dei models verrà raffinato nella fase di sviluppo.
- Le modifiche strutturali vanno sempre tracciate in LOG_OPERATIVO.md

---

## Scenario test manuale
- Tutte le cartelle elencate sono create e referenziate a README.md
- Ogni cartella/documento ha un context.md o README.md di spiegazione
- Nessuna componente “core” fuori da src/
- Aggiornamento log e README.md immediato dopo ogni modifica architetturale
- Backup integrale architettura incollato in LOG_OPERATIVO.md

---