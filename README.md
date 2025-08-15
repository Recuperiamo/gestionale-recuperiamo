# Gestionale Pacchetti Ore – Documentazione progettuale

---

## Backup integrale documentazione progettuale Fase 2

---

### Mappa funzionale (MAPPA_FUNZIONALE_Version13.md)

# Mappa funzionale – Gestionale Didattica (MVP)

## Obiettivo gestionale
Supportare la gestione operativa e amministrativa delle attività didattiche, con particolare attenzione a: pacchetti ore, anagrafica clienti, fatturazione, monitoraggio attività, e reporting.

---

## Funzionalità principali

### 1. Gestione anagrafica clienti
- Creazione, modifica, eliminazione di clienti (enti, aziende, privati)
- Gestione dettagli: dati fiscali, contatti, note operative

### 2. Gestione pacchetti ore
- Creazione/assegnazione di pacchetti ore a clienti
- Monitoraggio consumo ore per cliente e per progetto
- Segnalazione automatica esaurimento/soglia ore

### 3. Gestione attività e rendicontazione
- Registrazione attività svolte (data, ora, descrizione, operatore, cliente associato)
- Collegamento attività a pacchetti ore
- Calcolo automatico ore residue

### 4. Fatturazione e amministrazione
- Generazione documenti di fatturazione (proforma, fattura, ricevuta)
- Esportazione dati per amministrazione
- Stato pagamenti e scadenze

### 5. Reportistica e dashboard
- Visualizzazione riepiloghi per cliente, attività, pacchetti ore, fatturato
- Esportazione report (PDF, XLS)
- Indicatori di performance (ore erogate, residuo, valore economico)

---

## Funzionalità secondarie/di supporto

### 6. Gestione utenti e permessi
- Ruoli: amministratore, operatore, visualizzatore
- Accesso e gestione differenziata dei dati a seconda del ruolo

### 7. Notifiche e alert
- Alert automatici su scadenze, esaurimento ore, mancata rendicontazione

### 8. Audit e storico modifiche
- Log delle modifiche su dati critici (anagrafica, pacchetti, attività)

---

## Funzionalità future (fuori MVP, opzionali)
- Integrazione con sistemi esterni (es. CRM, contabilità)
- Accesso clienti (portalino)
- Integrazione calendario
- App mobile

---

## Note operative
- Ogni funzionalità dovrà essere poi mappata su entità dati e componenti UI nelle prossime fasi.
- La mappa funzionale può essere aggiornata in iterazioni successive prima del “GO”.

---

### Checklist progettazione (PROGETTAZIONE_CHECKLIST_Version73.md)

# Checklist Fase 2 – Progettazione Gestionale Didattica

## 1. Raccolta e validazione requisiti
- [x] Requisiti raccolti e documentati (`GESTIONALE_REQUISITI_BASE.md`)
- [x] Entry di chiusura fase requisiti su `LOG_OPERATIVO.md`
- [x] Validazione formale (in chat e nel log) per passaggio a Fase 2

## 2. Progettazione tecnica – Deliverable da produrre e validare
- [ ] Mappa funzionale (elenco e descrizione funzioni principali/secondarie)
- [ ] Bozza struttura dati (entità, relazioni, attributi chiave; anche schema ER/tabella)
- [ ] Bozza architettura cartelle/componenti (con spiegazione suddivisione logica)
- [ ] Lista milestone/fasi di sviluppo (sequenza, priorità, dipendenze)

## 3. Scenario test manuale per la progettazione
- [ ] Tutti i deliverable sono presenti e accessibili
- [ ] Deliverable coerenti coi requisiti raccolti
- [ ] Nessun file di codice/progetto generato prima della validazione
- [ ] Validazione formale e “GO” alla progettazione/codifica approvati (in chat e su `LOG_OPERATIVO.md`)

## 4. Aggiornamento documenti di processo
- [ ] Entry di chiusura fase progettazione su `LOG_OPERATIVO.md` (completa e dettagliata)
- [ ] Aggiornamento `STANDARD_OPERATIVO.md` se necessario
- [ ] Aggiornamento `README.md` se necessario

---

## Note operative
- Usa questa checklist per monitorare lo stato tra una sessione e l’altra.
- Non passare alla codifica se non hai tutte le spunte nella sezione 3.
- Ogni step significativo va tracciato sia in chat che su `LOG_OPERATIVO.md`.
- In caso di revisione, aggiorna questa checklist e il log.

---

### Scenario test progettazione (SCENARIO_TEST_PROGETTAZIONE_Version73.md)

# Scenario Test Manuale – Progettazione Gestionale Didattica

## Obiettivo
Validare la fase di progettazione tecnica prima di qualsiasi attività di codifica, assicurando che siano prodotti e approvati tutti i deliverable di progetto secondo requisiti e standard.

---

## Deliverable richiesti

1. **Mappa funzionale**
   - Elenco delle funzioni principali e secondarie del gestionale, con descrizione sintetica del loro obiettivo.
2. **Bozza di struttura dati**
   - Rappresentazione (anche preliminare) delle entità chiave, relazioni tra dati, e principali attributi.
   - Può essere uno schema ER, una tabella di sintesi, o un diagramma.
3. **Bozza di architettura delle cartelle e componenti**
   - Proposta di struttura delle principali cartelle (es. src/, app/, public/, ecc.) e dei macro-componenti, con spiegazione della suddivisione logica.
4. **Lista delle milestone/fasi di sviluppo**
   - Sequenza delle macro-fasi (ad es: setup ambiente, implementazione autenticazione, gestione utenti, …), con priorità e dipendenze.

---

## Scenario di validazione manuale

- Tutti i deliverable sopra elencati sono presenti e accessibili nella repository/project documentation.
- La mappa funzionale è coerente con i requisiti raccolti.
- La struttura dati è sufficiente per permettere una progettazione tecnica dettagliata nella fase successiva.
- La proposta di architettura di cartelle e componenti rispetta le linee guida tecniche (STANDARD_OPERATIVO.md, eventuali vincoli tecnologici).
- La lista delle milestone copre tutte le funzionalità previste, con priorità e dipendenze corrette.
- **Validazione formale:**  
  Nessun file di progetto/codice viene generato prima dell’approvazione esplicita (in chat e/o nel log-operativo) di tutti i deliverable di progettazione da parte del responsabile progetto/PO.
- **Criterio di superamento:**  
  Il responsabile progetto/PO conferma in chat e con apposita entry in LOG_OPERATIVO.md che la fase di progettazione è “GO”.

---

## Checklist di validazione

- [ ] Tutti i deliverable richiesti sono presenti e accessibili
- [ ] Coerenza rispetto ai requisiti raccolti (vedi GESTIONALE_REQUISITI_BASE.md)
- [ ] Struttura dati e architettura cartelle/componenti sufficientemente dettagliate
- [ ] Milestone/fasi complete e ordinate
- [ ] Validazione e “GO” alla codifica approvati e loggati

---

## Note
- In caso di revisione o modifica a uno qualsiasi dei deliverable, aggiornare contestualmente la documentazione e il log operativo.
- Nessuna codifica o creazione di file tecnici fino a validazione conclusa.

---

### Bozza struttura dati (STRUTTURA_DATI_BOZZA.md)

# Bozza struttura dati – Gestionale Didattica (MVP)

## Entità principali

### CLIENTE
- id_cliente (PK)
- ragione_sociale
- tipo_cliente (azienda, ente, privato)
- partita_iva/codice_fiscale
- email
- telefono
- indirizzo
- note
- data_creazione

---

### PACCHETTO_ORE
- id_pacchetto (PK)
- id_cliente (FK → CLIENTE)
- descrizione
- ore_acquistate
- ore_residue
- data_attivazione
- data_scadenza
- stato (attivo, esaurito, scaduto)
- note

---

### ATTIVITÀ
- id_attività (PK)
- id_pacchetto (FK → PACCHETTO_ORE)
- id_operatore (FK → UTENTE)
- data
- ora_inizio
- ora_fine
- durata_ore
- descrizione
- note

---

### FATTURA
- id_fattura (PK)
- id_cliente (FK → CLIENTE)
- id_pacchetto (FK → PACCHETTO_ORE)
- numero_fattura
- data_emissione
- importo
- stato_pagamento (da saldare, saldo parziale, saldata)
- data_scadenza
- data_pagamento
- note

---

### UTENTE
- id_utente (PK)
- nome
- cognome
- email
- ruolo (amministratore, operatore, visualizzatore)
- stato (attivo, sospeso)
- data_creazione

---

### NOTIFICA
- id_notifica (PK)
- destinatario (id_utente o id_cliente)
- tipo_notifica (scadenza, esaurimento ore, amministrazione, ecc.)
- testo
- data_creazione
- letto (boolean)

---

### LOG_MODIFICHE
- id_log (PK)
- entità_modificata (CLIENTE, PACCHETTO_ORE, ATTIVITÀ, ecc.)
- id_record
- azione (creazione, modifica, cancellazione)
- autore (id_utente)
- data_ora
- dettagli

---

## Relazioni principali

- Un CLIENTE può avere molti PACCHETTO_ORE
- Un PACCHETTO_ORE può avere molte ATTIVITÀ
- Un CLIENTE può avere molte FATTURA
- Un PACCHETTO_ORE può essere associato a 0...n FATTURA (opzionale)
- Un ATTIVITÀ è svolta da un UTENTE (operatore)
- Le NOTIFICHE possono essere associate a UTENTE e/o CLIENTE

---

## Note operative

- I campi note sono opzionali e servono per dettagli operativi.
- Gli stati (es. stato pacchetto, stato fattura, ruolo utente) vanno mappati su enum/tabella di riferimento.
- In fase di progettazione dettagliata, le entità potranno essere raffinate/estese (es. aggiunta storicizzazione, gestione allegati, ecc.).
- Possibili estensioni future: entità PROGETTO, gestione documenti, storico accessi.

---

### Bozza architettura cartelle (ARCHITETTURA_CARTELLE_BOZZA.md)

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

### Milestone/fasi di sviluppo (MILESTONE_FASI_DI_SVILUPPO.md)

# Lista milestone/fasi di sviluppo – Gestionale Didattica (MVP)

## Obiettivo
Definire la sequenza di macro-fasi operative per lo sviluppo, con priorità e dipendenze.

---

## Milestone principali

1. **Setup ambiente e infrastruttura**
   - Inizializzazione progetto (repo, dipendenze base, struttura cartelle)
   - Configurazione workflow GitHub Actions e check automatici
   - Setup ambienti locali e test

2. **Implementazione autenticazione e gestione utenti**
   - Gestione ruoli: amministratore, operatore, visualizzatore
   - Login/logout, gestione stato utente

3. **Gestione anagrafica clienti**
   - CRUD clienti con validazioni
   - Collegamento ai pacchetti ore

4. **Gestione pacchetti ore**
   - Creazione/assegnazione pacchetti a clienti
   - Monitoraggio ore residue e segnalazioni

5. **Gestione attività/rendicontazione**
   - Registrazione attività collegate a pacchetti
   - Calcolo automatico ore residue

6. **Fatturazione e amministrazione**
   - Generazione e gestione documenti (proforma, fattura, ricevuta)
   - Stato pagamenti

7. **Dashboard e reportistica**
   - Cruscotto riepiloghi clienti, pacchetti, attività, fatturato
   - Esportazione dati/report

8. **Notifiche, alert e log modifiche**
   - Alert automatici (scadenze, esaurimento ore…)
   - Storico modifiche (audit)

9. **Documentazione tecnica e di processo**
   - Aggiornamento continuo dei deliverable progettuali
   - Scenario test manuale finale e validazione

---

## Note operative
- Ogni milestone è suddivisibile in task più piccoli per la gestione day-by-day.
- Non procedere allo sviluppo di milestone successive senza check/test/validazione della precedente.
- Aggiornare LOG_OPERATIVO.md e README.md dopo ogni avanzamento significativo.
- In caso di variazioni o revisioni, tracciare sempre la motivazione e la nuova sequenza.

---

## Scenario test manuale
- Ogni milestone è chiara, atomica, tracciabile e validabile.
- Le dipendenze sono esplicite.
- Il file MILESTONE_FASI_DI_SVILUPPO.md è presente, accessibile e integralmente riportato nella coda di LOG_OPERATIVO.md.
- Pronto per revisione, raffinamento o scomposizione in task operativi.

---

### Scenario test manuale finale progettazione (SCENARIO_TEST_MANUALE_PROGETTAZIONE.md)

# Scenario test manuale finale – Fase progettazione gestionale didattica

## Obiettivo
Verificare che tutti i deliverable progettuali richiesti siano stati prodotti, versionati, validati e siano accessibili secondo lo standard operativo, prima di autorizzare il passaggio alla codifica.

---

## Checklist scenario test

- [x] Mappa funzionale presente e coerente con i requisiti raccolti
- [x] Bozza struttura dati presente, completa e coerente con la mappa funzionale
- [x] Bozza architettura cartelle/componenti presente, chiara, scalabile
- [x] Lista milestone/fasi di sviluppo prodotta, prioritaria e tracciabile
- [x] Tutti i file deliverable sono presenti come file singoli, incollati integralmente in coda a LOG_OPERATIVO.md, e referenziati in README.md
- [x] LOG_OPERATIVO.md aggiornato dopo ogni step significativo, senza omissioni, nessuna entry troncata
- [x] README.md aggiornato e completo di backup documentazione progettuale
- [x] STANDARD_OPERATIVO.md aggiornato se necessario
- [x] Nessun file strategico risulta troncato o mancante sulla repo GitHub
- [x] Validazione esplicita: il responsabile progetto/PO conferma in chat e con apposita entry in LOG_OPERATIVO.md che la fase di progettazione è “GO”

---

## Note operative e di validazione

- Nessuna codifica o creazione di file tecnici è consentita fino a superamento di questo scenario test.
- In caso di revisione/modifica di un deliverable, aggiornare contestualmente file singolo, LOG_OPERATIVO.md e README.md.
- Conservare sempre lo storico dei backup in coda a LOG_OPERATIVO.md.
- Riepilogo stato e to-do devono essere chiaramente visibili nella parte alta del log.

---

## Scenario di superamento

- Il PO/Responsabile progetto prende visione della checklist e conferma “GO” alla codifica sia in chat, sia con entry dedicata in LOG_OPERATIVO.md.
- La repository risulta pronta, tracciata e validabile per passaggio a fase di sviluppo.

---