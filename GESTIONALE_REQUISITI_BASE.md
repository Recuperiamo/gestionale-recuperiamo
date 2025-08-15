# Gestionale Didattica - Requisiti Base (MVP)

## Scopo principale
- Gestione pacchetti ore
- Gestione clienti/studenti
- Agenda settimanale (prenotazioni/lezioni)
- Portale clienti/studenti (visualizzazione pacchetti, richieste modifica, agenda)

## Utenti
- **Admin/Insegnante**: gestisce tutto il sistema
- **Cliente/Studente**: può vedere pacchetti/ore/agenda, richiedere modifiche

## Ruoli
- Si parte con un ruolo unico Cliente/Studente (collegati), separazione futura se necessario

## Funzionalità MVP
- CRUD clienti/studenti (unificato)
- CRUD pacchetti ore
- Prenotazione e rendicontazione ore/lezioni
- Visualizzazione stato pacchetto
- Agenda settimanale (admin e clienti/studenti)
- Autenticazione ruoli base
- **Richiesta modifica prenotazione** da parte di clienti/studenti, con approvazione admin
- **Nota:** la fatturazione è sospesa per ora, sarà estensione futura

## Flusso d’uso (sintesi)
- **Admin**: crea/gestisce clienti, studenti, pacchetti, lezioni; gestisce richieste modifica prenotazioni
- **Cliente/Studente**: visualizza pacchetti/ore/agenda; può chiedere modifica prenotazione (es. spostamento, cancellazione) secondo regole da definire

## Dati minimi da gestire

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

## Moduli/Funzionalità escluse nella prima versione
- Fatturazione
- Gestione/richiesta/scambio materiali didattici
- Area lavagna condivisa
- Qualsiasi altro modulo avanzato

## Promemoria operativo

- NON iniziare la progettazione tecnica/codifica prima di aver completato la fase “Scenario Test - Progettazione”.
- Aggiornare LOG_OPERATIVO.md al termine di questa fase e prima di qualsiasi step progettuale.

---

## Prossimo step

- Scenario Test - Progettazione (da affrontare e validare PRIMA di generare struttura tecnica o codice)