# Roadmap dettagliata – Gestionale Didattica (MVP)

---
Versione 2025-08-16 18:51 UTC+2

## Collegamento Issues a Milestone 1

- 2025-08-16 18:48 UTC+2 – Verifica collegamento manuale delle issue alla milestone.
- 2025-08-16 18:49 UTC+2 – Confermato collegamento delle seguenti issue a “Milestone 1 – Setup ambiente e architettura di progetto”:
    - #10 Creazione struttura cartelle e file di contesto
    - #11 Configurazione workflow CI/CD base e .gitignore
    - #12 Documentazione architetturale e scenario test
    - #13 Review setup architetturale e chiusura milestone
- 2025-08-16 18:50 UTC+2 – Richiesta log-operativo e comandi di push da parte dell’utente.

## Scenario test manuale
1. Accedi alla milestone su GitHub.
2. Verifica che tutte le issue #10, #11, #12, #13 risultino effettivamente collegate e visibili nella milestone.
3. Apri ciascuna issue e controlla che il campo “Milestone” sia settato correttamente.
4. Nessuna delle issue deve risultare “unassigned” rispetto alle milestone.

## Milestone 1 – Setup ambiente e architettura di progetto

**Descrizione:**  
Inizializzazione repo, struttura cartelle, workflow CI, linee guida di doc e primo scenario test architetturale.

### Issue 1.1 – Creazione struttura cartelle e file di contesto
- Implementare la struttura cartelle come da ARCHITETTURA_CARTELLE_BOZZA.md.
- Creare README.md e context.md per ogni cartella principale.
- Scenario test: tutte le cartelle presenti, ogni cartella con context.md o README.md, nessun componente core fuori da /src.

### Issue 1.2 – Configurazione workflow CI/CD base e gitignore
- Aggiungere workflow GitHub Actions per build/lint/test su push/PR.
- Definire .gitignore completo.
- Scenario test: push su main/PR attiva workflow, build e lint passano su repo pulito.

### Issue 1.3 – Documentazione architetturale e scenario test
- Aggiornare README.md e LOG_OPERATIVO.md dopo ogni modifica architetturale.
- Definire scenario test manuale per validazione struttura.
- Scenario test: documentazione aggiornata e coerente con struttura repo.

### Issue 1.4 – Review setup architetturale
- Review tra team e checklist finale milestone.
- Scenario test: milestone validata, log-operativo aggiornato e timestamp coerenti.

---

## Milestone 2 – Autenticazione, gestione utenti e permessi

**Descrizione:**  
Autenticazione, gestione login/logout, propagazione ruoli, accesso differenziato.

### Issue 2.1 – Implementazione login/logout NextAuth
- Setup provider credenziali, callback JWT/session, fix redirect.
- Scenario test: login/logout funzionanti, sessione corretta.

### Issue 2.2 – Gestione ruoli e propagazione permessi in sessione
- Implementare propagazione ruoli da relazione Prisma.
- Implementare middleware o guardie di accesso alle route riservate.
- Scenario test: dashboard mostra ruolo, accesso differenziato per ruolo.

### Issue 2.3 – Test manuale login/logout e permessi
- Stesura scenario test ed esecuzione con utenti di ruoli diversi.
- Scenario test: login/logout/admin/operator/visualizzatore gestiti come da specifica.

### Issue 2.4 – Aggiornamento doc e standard operativo per autenticazione
- Aggiornare README.md e STANDARD_OPERATIVO.md su flusso login/permessi.
- Scenario test: doc aggiornata e scenario test incluso.

### Issue 2.5 – Review milestone autenticazione
- Review milestone e chiusura con validazione log/timestamp.

---

## Milestone 3 – Gestione anagrafica clienti

**Descrizione:**  
CRUD clienti, validazioni, collegamento pacchetti ore.

### Issue 3.1 – Implementazione CRUD clienti backend (API/handler)
- Creare/aggiornare/eliminare clienti via API.
- Validazioni su dati obbligatori e fiscali.
- Scenario test: API CRUD funzionanti, errori gestiti.

### Issue 3.2 – Implementazione CRUD clienti frontend (UI/table/form)
- Form creazione/modifica clienti, tabella clienti, feedback validazioni.
- Scenario test: inserimento, modifica, eliminazione cliente da UI.

### Issue 3.3 – Collegamento clienti-pacchetti ore (relazione)
- Implementare relazione e visualizzazione pacchetti assegnati a cliente.
- Scenario test: visualizzazione e collegamento pacchetti a cliente corretto.

### Issue 3.4 – Test manuale CRUD clienti e relazioni
- Stesura scenario test, esecuzione casi limite e edge case.
- Scenario test: test manuale superato per tutte le operazioni.

### Issue 3.5 – Aggiornamento doc e standard operativo
- Aggiornare README.md, LOG_OPERATIVO.md, STANDARD_OPERATIVO.md.
- Scenario test: doc aggiornata e scenario di test incluso.

### Issue 3.6 – Review e chiusura milestone
- Review milestone e validazione log/timestamp.

---

## Milestone 4 – Gestione pacchetti ore

**Descrizione:**  
CRUD pacchetti ore, assegnazione clienti, monitoraggio e alert soglia.

### Issue 4.1 – Implementazione CRUD pacchetti ore (API/handler)
- Creare, modificare, eliminare pacchetti ore backend.
- Scenario test: API CRUD pacchetti ore funzionanti.

### Issue 4.2 – UI pacchetti ore e assegnazione a cliente
- Form creazione/modifica, tabella pacchetti, selezione cliente.
- Scenario test: UI pacchetti ore, assegnazione funzionante.

### Issue 4.3 – Monitoraggio e decremento ore automatico
- Logica decremento ore su attività, aggiornamento residuo.
- Scenario test: ogni attività scala correttamente ore residue.

### Issue 4.4 – Alert soglia/esaurimento pacchetti
- Implementare alert automatici su soglia (email/notifica UI).
- Scenario test: ricezione alert a soglia impostata.

### Issue 4.5 – Test manuale pacchetti ore e alert
- Esecuzione scenario test completo su flusso pacchetti/alert.
- Scenario test: edge case e casi limite coperti.

### Issue 4.6 – Aggiornamento doc e standard operativo
- Aggiornare README.md e documentazione di milestone.
- Scenario test: doc aggiornata e scenario incluso.

### Issue 4.7 – Review e chiusura milestone
- Review milestone e validazione log/timestamp.

---

## Milestone 5 – Gestione attività e rendicontazione

**Descrizione:**  
Registrazione e visualizzazione attività, collegamento a pacchetti, calcolo ore residue.

### Issue 5.1 – Implementazione CRUD attività (API/handler)
- Creare/modificare/eliminare attività, collegamento a pacchetti/cliente.
- Scenario test: API CRUD attività funzionanti.

### Issue 5.2 – UI attività e collegamento pacchetti
- Form, tabella, selettore pacchetto/cliente.
- Scenario test: UI attività collegata correttamente.

### Issue 5.3 – Calcolo automatico ore residue
- Aggiornamento ore residue dopo ogni attività.
- Scenario test: ore residue sempre coerenti.

### Issue 5.4 – Visualizzazione storico attività
- UI storico attività per cliente/pacchetto.
- Scenario test: storico attività navigabile e filtrabile.

### Issue 5.5 – Test manuale attività/rendicontazione
- Esecuzione scenario test completo attività/rendicontazione.
- Scenario test: edge case e coerenza dati.

### Issue 5.6 – Aggiornamento doc e standard operativo
- Aggiornare README.md, LOG_OPERATIVO.md, STANDARD_OPERATIVO.md.
- Scenario test: doc aggiornata e scenario incluso.

### Issue 5.7 – Review e chiusura milestone
- Review milestone, validazione log/timestamp.

---

## Milestone 6 – Fatturazione e amministrazione

**Descrizione:**  
Generazione documenti, gestione pagamenti, esportazione dati.

### Issue 6.1 – Generazione documenti fatturazione (proforma, fattura, ricevuta)
- Implementare generatori documenti (PDF/XLS).
- Scenario test: documenti generati e scaricabili.

### Issue 6.2 – Gestione stato pagamenti e scadenze
- UI e backend per aggiornare stato pagamenti e segnalazione scadenze.
- Scenario test: pagamenti aggiornabili, alert su scadenze.

### Issue 6.3 – Esportazione dati amministrativi
- Export dati clienti/pacchetti/fatture (XLS/PDF).
- Scenario test: export funzionante e dati coerenti.

### Issue 6.4 – Test manuale fatturazione/amministrazione
- Esecuzione scenario test completo.
- Scenario test: documenti, export, pagamenti funzionanti.

### Issue 6.5 – Aggiornamento doc e standard operativo
- Aggiornare README.md, LOG_OPERATIVO.md, STANDARD_OPERATIVO.md.
- Scenario test: doc aggiornata e scenario incluso.

### Issue 6.6 – Review e chiusura milestone
- Review milestone e validazione log/timestamp.

---

## Milestone 7 – Dashboard, reportistica e indicatori

**Descrizione:**  
Cruscotto riepiloghi, esportazione report, indicatori performance.

### Issue 7.1 – Visualizzazione dashboard riepilogativa
- UI dashboard con tabelle, grafici riepilogo clienti, pacchetti, attività.
- Scenario test: dashboard popolata e navigabile.

### Issue 7.2 – Esportazione report (PDF/XLS)
- Export riepiloghi da dashboard.
- Scenario test: report esportabili e dati corretti.

### Issue 7.3 – Indicatori performance e filtri dashboard
- Visualizzazione KPI (ore erogate, residuo, valore economico), filtri multipli.
- Scenario test: KPI e filtri funzionanti.

### Issue 7.4 – Test manuale dashboard/report
- Esecuzione scenario test completo dashboard/report.
- Scenario test: edge case coperti.

### Issue 7.5 – Aggiornamento doc e standard operativo
- Aggiornare README.md, LOG_OPERATIVO.md, STANDARD_OPERATIVO.md.
- Scenario test: doc aggiornata e scenario incluso.

### Issue 7.6 – Review e chiusura milestone
- Review milestone, validazione log/timestamp.

---

## Milestone 8 – Notifiche, alert e audit log

**Descrizione:**  
Notifiche automatiche, storico modifiche, alert scadenze/esaurimento.

### Issue 8.1 – Implementazione notifiche/alert automatici
- Alert su scadenze, esaurimento ore, mancata rendicontazione.
- Scenario test: ricezione/notifica alert.

### Issue 8.2 – Storico modifiche e audit log
- Log modifiche dati critici, accesso da admin.
- Scenario test: log modifiche accessibile e coerente.

### Issue 8.3 – Test manuale notifiche/audit
- Esecuzione scenario test completo notifiche/audit.
- Scenario test: edge case e coerenza storico.

### Issue 8.4 – Aggiornamento doc e standard operativo
- Aggiornare README.md, LOG_OPERATIVO.md, STANDARD_OPERATIVO.md.
- Scenario test: doc aggiornata e scenario incluso.

### Issue 8.5 – Review e chiusura milestone
- Review milestone, validazione log/timestamp.

---

## Milestone 9 – Documentazione finale e validazione progetto

**Descrizione:**  
Documentazione tecnica, scenario test finale, validazione e retrospettiva.

### Issue 9.1 – Aggiornamento finale README, log, standard operativo
- Aggiornare e validare tutta la documentazione.
- Scenario test: tutti i doc aggiornati e coerenti.

### Issue 9.2 – Validazione scenario test finale (E2E)
- Esecuzione scenario test end-to-end di progetto.
- Scenario test: tutti i flussi funzionanti.

### Issue 9.3 – Review, chiusura milestone e retrospettiva
- Review milestone, retrospettiva finale, archiviazione log e coerenza timestamp.
- Scenario test: milestone chiusa, log coerente, retrospettiva eseguita.

---

**Note operative:**  
- Ogni milestone segue struttura fissa: implementazione, test manuale, doc, review.
- La granularità delle issue è adattiva, ma nessuna funzionalità chiave rimane scoperta.
- Ogni modifica strutturale/documentale aggiorna anche README.md e STANDARD_OPERATIVO.md (come da standard).
- Gli scenario test manuale sono sempre inclusi e validati in LOG_OPERATIVO.md.