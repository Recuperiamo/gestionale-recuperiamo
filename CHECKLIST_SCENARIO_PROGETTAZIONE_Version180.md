# Checklist e Scenario Test Manuale – Progettazione Gestionale Didattica

---

## 1. Checklist Fase 2 – Progettazione

### 1.1 Raccolta e validazione requisiti
- [x] Requisiti raccolti e documentati (`REQUISITI_E_PROGETTAZIONE.md`)
- [x] Entry di chiusura fase requisiti su `LOG_OPERATIVO.md`
- [x] Validazione formale (in chat e nel log) per passaggio a Fase 2

### 1.2 Progettazione tecnica – Deliverable da produrre e validare
- [x] Mappa funzionale (elenco e descrizione funzioni principali/secondarie)
- [x] Bozza struttura dati (entità, relazioni, attributi chiave; anche schema ER/tabella)
- [x] Bozza architettura cartelle/componenti (con spiegazione suddivisione logica)
- [x] Lista milestone/fasi di sviluppo (sequenza, priorità, dipendenze)

### 1.3 Scenario test manuale per la progettazione
- [x] Tutti i deliverable sono presenti e accessibili
- [x] Deliverable coerenti coi requisiti raccolti
- [x] Nessun file di codice/progetto generato prima della validazione
- [x] Validazione formale e “GO” alla progettazione/codifica approvati (in chat e su `LOG_OPERATIVO.md`)

### 1.4 Aggiornamento documenti di processo
- [x] Entry di chiusura fase progettazione su `LOG_OPERATIVO.md` (completa e dettagliata)
- [x] Aggiornamento `STANDARD_OPERATIVO.md` se necessario
- [x] Aggiornamento `README.md` se necessario

---

## 2. Scenario Test Manuale – Fase Progettazione

### Obiettivo
Verificare che tutti i deliverable progettuali richiesti siano stati prodotti, versionati, validati e siano accessibili secondo lo standard operativo, prima di autorizzare il passaggio alla codifica.

### Checklist scenario test

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

### Note operative e di validazione

- Nessuna codifica o creazione di file tecnici è consentita fino a superamento di questo scenario test.
- In caso di revisione/modifica di un deliverable, aggiornare contestualmente file singolo, LOG_OPERATIVO.md e README.md.
- Conservare sempre lo storico dei backup in coda a LOG_OPERATIVO.md.
- Riepilogo stato e to-do devono essere chiaramente visibili nella parte alta del log.

### Scenario di superamento

- Il PO/Responsabile progetto prende visione della checklist e conferma “GO” alla codifica sia in chat, sia con entry dedicata in LOG_OPERATIVO.md.
- La repository risulta pronta, tracciata e validabile per passaggio a fase di sviluppo.

---

## 3. Scenario Test Manuale – Deliverable Progettazione

### Obiettivo
Validare la fase di progettazione tecnica prima di qualsiasi attività di codifica, assicurando che siano prodotti e approvati tutti i deliverable di progetto secondo requisiti e standard.

### Deliverable richiesti

1. **Mappa funzionale**
   - Elenco delle funzioni principali e secondarie del gestionale, con descrizione sintetica del loro obiettivo.
2. **Bozza di struttura dati**
   - Rappresentazione (anche preliminare) delle entità chiave, relazioni tra dati, e principali attributi.
   - Può essere uno schema ER, una tabella di sintesi, o un diagramma.
3. **Bozza di architettura delle cartelle e componenti**
   - Proposta di struttura delle principali cartelle (es. src/, app/, public/, ecc.) e dei macro-componenti, con spiegazione della suddivisione logica.
4. **Lista delle milestone/fasi di sviluppo**
   - Sequenza delle macro-fasi (ad es: setup ambiente, implementazione autenticazione, gestione utenti, …), con priorità e dipendenze.

### Scenario di validazione manuale

- Tutti i deliverable sopra elencati sono presenti e accessibili nella repository/project documentation.
- La mappa funzionale è coerente con i requisiti raccolti.
- La struttura dati è sufficiente per permettere una progettazione tecnica dettagliata nella fase successiva.
- La proposta di architettura di cartelle e componenti rispetta le linee guida tecniche (STANDARD_OPERATIVO.md, eventuali vincoli tecnologici).
- La lista delle milestone copre tutte le funzionalità previste, con priorità e dipendenze corrette.
- **Validazione formale:**  
  Nessun file di progetto/codice viene generato prima dell’approvazione esplicita (in chat e/o nel log-operativo) di tutti i deliverable di progettazione da parte del responsabile progetto/PO.
- **Criterio di superamento:**  
  Il responsabile progetto/PO conferma in chat e con apposita entry in LOG_OPERATIVO.md che la fase di progettazione è “GO”.

### Checklist di validazione

- [x] Tutti i deliverable richiesti sono presenti e accessibili
- [x] Coerenza rispetto ai requisiti raccolti (vedi REQUISITI_E_PROGETTAZIONE.md)
- [x] Struttura dati e architettura cartelle/componenti sufficientemente dettagliate
- [x] Milestone/fasi complete e ordinate
- [x] Validazione e “GO” alla codifica approvati e loggati

### Note
- In caso di revisione o modifica a uno qualsiasi dei deliverable, aggiornare contestualmente la documentazione e il log operativo.
- Nessuna codifica o creazione di file tecnici fino a validazione conclusa.

---