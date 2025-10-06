# Requisiti, Mappa Funzionale e Struttura Dati – Gestionale Didattica (MVP)

---

## 1. Requisiti Base

### Scopo principale
- Gestione pacchetti ore
- Gestione clienti/studenti
- Agenda settimanale (prenotazioni/lezioni)
- Portale clienti/studenti (visualizzazione pacchetti, richieste modifica, agenda)

### Utenti
- **Admin/Insegnante**: gestisce tutto il sistema
- **Cliente/Studente**: può vedere pacchetti/ore/agenda, richiedere modifiche

### Ruoli
- Si parte con un ruolo unico Cliente/Studente (collegati), separazione futura se necessario

### Funzionalità MVP
- CRUD clienti/studenti (unificato)
- CRUD pacchetti ore
- Prenotazione e rendicontazione ore/lezioni
- Visualizzazione stato pacchetto
- Agenda settimanale (admin e clienti/studenti)
- Autenticazione ruoli base
- **Richiesta modifica prenotazione** da parte di clienti/studenti, con approvazione admin
- **Nota:** la fatturazione è sospesa per ora, sarà estensione futura

### Flusso d’uso (sintesi)
- **Admin**: crea/gestisce clienti, studenti, pacchetti, lezioni; gestisce richieste modifica prenotazioni
- **Cliente/Studente**: visualizza pacchetti/ore/agenda; può chiedere modifica prenotazione (es. spostamento, cancellazione) secondo regole da definire

### Dati minimi da gestire
- **Cliente**
  - nome
  - email
  - telefono (opzionale ma consigliato)
  - note
  - stato (attivo/non attivo)
- **Studente**
  - nome
  - email
  - cliente di riferimento
  - stato (attivo/non attivo)
- **Pacchetto**
  - ore totali
  - ore residue
  - data acquisto
  - cliente
  - studente
- **Prenotazione**
  - data/ora
  - durata
  - studente
  - note specifiche della lezione
  - stato (prenotata/erogata/modificata)
  - (opzionale: log richieste modifica)
- **Fattura**
  - (Non gestita in MVP)

### Moduli/Funzionalità escluse nella prima versione
- Fatturazione
- Gestione/richiesta/scambio materiali didattici
- Area lavagna condivisa
- Qualsiasi altro modulo avanzato

### Promemoria operativo
- NON iniziare la progettazione tecnica/codifica prima di aver completato la fase “Scenario Test - Progettazione”.
- Aggiornare LOG_OPERATIVO.md al termine di questa fase e prima di qualsiasi step progettuale.

---

## 2. Mappa Funzionale

### 2.1 Funzionalità principali

**1. Gestione anagrafica clienti**
- Creazione, modifica, eliminazione di clienti (enti, aziende, privati)
- Gestione dettagli: dati fiscali, contatti, note operative

**2. Gestione pacchetti ore**
- Creazione/assegnazione di pacchetti ore a clienti
- Monitoraggio consumo ore per cliente e per progetto
- Segnalazione automatica esaurimento/soglia ore

**3. Gestione attività e rendicontazione**
- Registrazione attività svolte (data, ora, descrizione, operatore, cliente associato)
- Collegamento attività a pacchetti ore
- Calcolo automatico ore residue

**4. Fatturazione e amministrazione**
- Generazione documenti di fatturazione (proforma, fattura, ricevuta)
- Esportazione dati per amministrazione
- Stato pagamenti e scadenze

**5. Reportistica e dashboard**
- Visualizzazione riepiloghi per cliente, attività, pacchetti ore, fatturato
- Esportazione report (PDF, XLS)
- Indicatori di performance (ore erogate, residuo, valore economico)

### 2.2 Funzionalità secondarie/di supporto

**6. Gestione utenti e permessi**
- Ruoli: amministratore, operatore, visualizzatore
- Accesso e gestione differenziata dei dati a seconda del ruolo

**7. Notifiche e alert**
- Alert automatici su scadenze, esaurimento ore, mancata rendicontazione

**8. Audit e storico modifiche**
- Log delle modifiche su dati critici (anagrafica, pacchetti, attività)

### 2.3 Funzionalità future (fuori MVP, opzionali)
- Integrazione con sistemi esterni (es. CRM, contabilità)
- Accesso clienti (portalino)
- Integrazione calendario
- App mobile

### 2.4 Note operative
- Ogni funzionalità dovrà essere poi mappata su entità dati e componenti UI nelle prossime fasi.
- La mappa funzionale può essere aggiornata in iterazioni successive prima del “GO”.

---

## 3. Bozza Struttura Dati

### Entità principali

#### CLIENTE
- id_cliente (PK)
- ragione_sociale
- tipo_cliente (azienda, ente, privato)
- partita_iva/codice_fiscale
- email
- telefono
- indirizzo
- note
- data_creazione

#### PACCHETTO_ORE
- id_pacchetto (PK)
- id_cliente (FK → CLIENTE)
- descrizione
- ore_acquistate
- ore_residue
- data_attivazione
- data_scadenza
- stato (attivo, esaurito, scaduto)
- note

#### ATTIVITÀ
- id_attività (PK)
- id_pacchetto (FK → PACCHETTO_ORE)
- id_operatore (FK → UTENTE)
- data
- ora_inizio
- ora_fine
- durata_ore
- descrizione
- note

#### FATTURA
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

#### UTENTE
- id_utente (PK)
- nome
- cognome
- email
- ruolo (amministratore, operatore, visualizzatore)
- stato (attivo, sospeso)
- data_creazione

#### NOTIFICA
- id_notifica (PK)
- destinatario (id_utente o id_cliente)
- tipo_notifica (scadenza, esaurimento ore, amministrazione, ecc.)
- testo
- data_creazione
- letto (boolean)

#### LOG_MODIFICHE
- id_log (PK)
- entità_modificata (CLIENTE, PACCHETTO_ORE, ATTIVITÀ, ecc.)
- id_record
- azione (creazione, modifica, cancellazione)
- autore (id_utente)
- data_ora
- dettagli

### Relazioni principali

- Un CLIENTE può avere molti PACCHETTO_ORE
- Un PACCHETTO_ORE può avere molte ATTIVITÀ
- Un CLIENTE può avere molte FATTURA
- Un PACCHETTO_ORE può essere associato a 0...n FATTURA (opzionale)
- Un ATTIVITÀ è svolta da un UTENTE (operatore)
- Le NOTIFICHE possono essere associate a UTENTE e/o CLIENTE

### Note operative struttura dati

- I campi note sono opzionali e servono per dettagli operativi.
- Gli stati (es. stato pacchetto, stato fattura, ruolo utente) vanno mappati su enum/tabella di riferimento.
- In fase di progettazione dettagliata, le entità potranno essere raffinate/estese (es. aggiunta storicizzazione, gestione allegati, ecc.).
- Possibili estensioni future: entità PROGETTO, gestione documenti, storico accessi.

---

## 4. Promemoria operativo e prossimo step

- NON iniziare la progettazione tecnica/codifica prima di aver completato la fase “Scenario Test - Progettazione”.
- Aggiornare LOG_OPERATIVO.md al termine di questa fase e prima di qualsiasi step progettuale.
- Prossimo step: Scenario Test - Progettazione (da affrontare e validare PRIMA di generare struttura tecnica o codice).

---