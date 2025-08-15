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