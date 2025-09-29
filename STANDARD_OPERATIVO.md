# STANDARD OPERATIVO – Gestionale Pacchetti Ore

> **IMPORTANTE:**  
> Tutte le regole vincolanti di processo, coding, naming, milestone, log operativo, checklist e test manuali sono raccolte qui.  
> Dopo ogni modifica strutturale o di policy, aggiorna SEMPRE questo file e LOG_OPERATIVO.md.

---

## 1. Regole di governance e collaborazione

- Segui SEMPRE tutte le regole vincolanti di formato e comportamento qui definite.
- Dopo ogni step significativo aggiorna LOG_OPERATIVO.md e fornisci i comandi git per commit/push.
- Ogni gruppo di comandi va dato in due blocchi distinti: CMD e PowerShell, nessun commento nei blocchi.
- Quando modifichi file, fornisci SEMPRE file completi, elenca prima i file coinvolti, non cambiare stile.
- Ogni sessione, ogni risposta, ogni modifica deve rispettare questo standard.
- Chiedi sempre chiarimenti se contesto o obiettivi non sono chiari.

## Gestione struttura, duplicati e file elencocompleto.txt

- Il file elencocompleto.txt, situato nella root della repository, contiene SEMPRE la lista aggiornata e completa di tutti i file e directory, e rappresenta la fotografia ufficiale della struttura del progetto.
- È OBBLIGATORIO aggiornare elencocompleto.txt:
    - Dopo ogni modifica strutturale (aggiunta, spostamento, eliminazione di file/cartelle)
    - Prima di ogni push/merge importante
    - Alla chiusura di ogni sessione di lavoro, come da checklist END_SESSION.md
- All’inizio di ogni sessione, è OBBLIGATORIO consultare elencocompleto.txt per:
    - Validare la coerenza tra la struttura reale in locale e quella dichiarata
    - Verificare la presenza di possibili duplicati/omonimie prima di proporre/creare nuovi file
- In caso di assenza o incoerenza di elencocompleto.txt, FERMARE le lavorazioni e segnalare in chat prima di procedere.
- Nessun push/merge di modifiche strutturali è consentito senza aggiornamento contestuale di elencocompleto.txt, MAPPA_STRUTTURA_PROGETTO.md, LOG_OPERATIVO.md e README.md.

---
---

## 2. Policy di controllo avanzato (CI/CD e log operativo)

- Se una PR modifica README.md, STANDARD_OPERATIVO.md, ONBOARDING_SESSION.md o END_SESSION.md, LOG_OPERATIVO.md deve essere aggiornato nella stessa PR.
- L’ultima entry del log deve contenere: timestamp UTC+2, versione STANDARD_OPERATIVO.md, “File coinvolti”, “Scenario Test”.
- In assenza dei vincoli, il workflow CI/CD blocca la PR.

---

## 3. Policy di aggiornamento file strutturali e milestone

- Dopo ogni modifica strutturale aggiorna SEMPRE README.md, STANDARD_OPERATIVO.md, LOG_OPERATIVO.md, MAPPA_STRUTTURA_PROGETTO.md.
- Alla chiusura di ogni milestone, controlla coerenza e progressività orari nel log, chiudi milestone, crea subito nuova milestone.
- Nessun file o cartella di progetto può essere presente fuori dalla root gestionale-recuperiamo.

---

## 4. Regole di contribuzione, coding e workflow

- Tutti i file e cartelle DEVONO risiedere nella root della repo gestionale-recuperiamo.
- Tutte le operazioni (git, npm, test ecc.) vanno eseguite solo nella root.
- Non lasciare codice core al di fuori di `/app`.
- Non introdurre nuovi file/componenti senza controllo duplicati (vedi policy sotto).
- Non modificare stack (Next.js, Prisma, ecc.) senza issue/PR e aggiornamento file.
- Commit e branch: lavora su feature/fix branch, descrivi i commit in modo chiaro.

---

## 5. Policy anti-doppioni e controllo struttura

- **Prima di proporre, creare, rinominare o spostare file o directory, controlla SEMPRE la presenza di duplicati/omonimie usando “elencocompleto.txt” (root della repo, sempre aggiornato).**
- **Se “elencocompleto.txt” manca o non è aggiornato, procedere solo dopo verifica manuale e segnalazione in chat.**
- Prima di ogni chiusura milestone:  
  ```powershell
  Get-ChildItem -Recurse -File | Group-Object Name | Where-Object { $_.Count -gt 1 } | Select-Object -ExpandProperty Name
  ```
- Se vengono trovati doppioni, risolvi e documenta in LOG_OPERATIVO.md prima di chiudere la milestone.
- Ogni nuova cartella deve includere un file `context.md` con scopo, regole e best practice aggiornate.
- Aggiorna sempre MAPPA_STRUTTURA_PROGETTO.md dopo ogni modifica strutturale.
- **La generazione e/o l’aggiornamento di “elencocompleto.txt” è OBBLIGATORIA dopo ogni modifica strutturale alla repo.**

---

## 6. Policy naming, struttura e formato

- Cartelle e file: lower-case con trattino o camelCase (NO spazi).
- Componenti React: PascalCase.
- Funzioni/variabili: camelCase.
- Modelli dati: PascalCase.
- README.md non deve contenere regole operative, solo info progetto/utente.
- Tutte le policy, convenzioni e checklist operative sono qui.

---

## 7. Regole test/manuale/CI

- Ogni nuova feature/bugfix richiede scenario test/manuale, descritto qui e nel log.
- Test automatici in `/tests`, esegui sempre `npm test` prima del push.
- Ogni build/test/refactor va tracciato in LOG_OPERATIVO.md.

---

## 8. Policy aggiornamento, debug, push

- Dopo ogni modifica fornisci sempre i comandi per push sia del solo log sia di tutti i file modificati/creati.
- In debug, fornire sempre file completi.
- Nella fase di audit/chiusura milestone, correggi eventuali discrepanze di timestamp/log prima di archiviare.

---

## 9. Policy di logging e scenario test

- Ogni modifica va registrata in LOG_OPERATIVO.md con timestamp UTC+2, reverse order.
- Dopo ogni commit/push significativo, aggiorna log e file coinvolti.
- Alla chiusura milestone: controlla coerenza orari, crea subito nuova milestone.

---

## 10. Policy .gitignore

- Escludi SEMPRE: node_modules, output build (.next, dist, out), file temporanei (*.log, *.tmp, temp/, tmp/), .env*, output test/coverage, scarti editor, file temporanei custom.
- Non escludere MAI: LOG_OPERATIVO.md, STANDARD_OPERATIVO.md, README.md, file di configurazione/deliverable.

---

## 11. Policy struttura cartelle e file

- Consulta sempre MAPPA_STRUTTURA_PROGETTO.md per la struttura aggiornata.
- Non creare/lasciare residui in `/src` o cartelle legacy.
- Tutto il codice applicativo in `/app`.

---

## 12. Policy milestone, audit e checklist

- Alla chiusura di ogni milestone, esegui audit retroattivo: verifica commit, log, scenario test, documentazione.
- Compila checklist di chiusura solo dopo verifica oggettiva.
- NO checklist “simulate” o presunte.
- Ogni audit retroattivo loggato in LOG_OPERATIVO.md.

---

## 13. Policy provider dati/mock file

- Vietato usare file mock in produzione.
- Durante migrazioni/test, file mock vanno in `/__deprecated__/` o `src/lib/legacy/`.
- Controlla sempre assenza di mock nelle route API reali prima di chiudere milestone.

---

## 14. Policy aggiornamento documentazione

- Dopo ogni modifica strutturale/operativa aggiorna anche README.md, LOG_OPERATIVO.md, MAPPA_STRUTTURA_PROGETTO.md.
- Le policy di coding, naming, log, test, milestone, debug e scenario test sono SOLO qui.

---

## 15. Scenario test/manuale standard

1. Clona la repo, installa dipendenze (`npm install`)
2. Esegui `npx prisma generate`, `npm run build`, `npm run dev`
3. Naviga tra tutte le route, verifica funzionamento app
4. Esegui controllo duplicati (`Get-ChildItem...`)
5. Verifica che la struttura reale coincida con MAPPA_STRUTTURA_PROGETTO.md
6. Accertati che non esistano directory o riferimenti a `/src/`
7. Verifica che README.md NON contenga policy operative

---

Ultimo aggiornamento: 2025-08-25 23:01 UTC+2
# STANDARD OPERATIVO – Gestionale Pacchetti Ore

> **IMPORTANTE:**  
> Tutte le regole vincolanti di processo, coding, naming, milestone, log operativo, checklist e test manuali sono raccolte qui.  
> Dopo ogni modifica strutturale o di policy, aggiorna SEMPRE questo file e LOG_OPERATIVO.md.

---

## 1. Regole di governance e collaborazione
- Segui SEMPRE tutte le regole vincolanti di formato e comportamento qui definite.
- Dopo ogni step significativo aggiorna LOG_OPERATIVO.md e fornisci i comandi git per commit/push.
- Ogni gruppo di comandi va dato in due blocchi distinti: CMD e PowerShell, nessun commento nei blocchi.
- Quando modifichi file, fornisci SEMPRE file completi, elenca prima i file coinvolti, non cambiare stile.
- Ogni sessione, ogni risposta, ogni modifica deve rispettare questo standard.
- Chiedi sempre chiarimenti se contesto o obiettivi non sono chiari.

## 2. Struttura aggiunta recente
- Pagine prototipali introdotte: `/lavagna` e `/materiale`.
- Calendario unificato con modale richieste integrata anche da profilo cliente (`enableStudentRequests`).
- Gestione rapida richieste pending lato admin: badge cliccabile in “Lezioni Prenotate”.

## 3. Gestione struttura, duplicati e elencocompleto.txt
- `elencocompleto.txt` fotografa SEMPRE la struttura attuale.
- Aggiornalo obbligatoriamente dopo:
  - Aggiunta / rimozione / spostamento file o cartelle
  - Introduzione nuove pagine (es. `/lavagna`, `/materiale`)
  - Refactor con rinomina
- Controllo duplicati obbligatorio prima di push:
  - PowerShell:  
    `Get-ChildItem -Recurse -File | Group-Object Name | Where-Object { $_.Count -gt 1 } | Select-Object -ExpandProperty Name`
  - CMD equivalente via PowerShell o script dedicato.

## 4. Policy aggiornamento file strutturali
Aggiorna **SEMPRE** insieme quando cambia struttura o flusso core:
- README.md
- STANDARD_OPERATIVO.md
- LOG_OPERATIVO.md
- MAPPA_STRUTTURA_PROGETTO.md
- elencocompleto.txt

## 5. Workflow richieste modifica lezioni (vincolante)
1. Cliente apre calendario profilo → clic lezione futura → modale (RichiestaModificaModal).
2. Tipi consentiti: `cambio_data`, `cambio_orario`, `cancellazione`.
3. Admin vede badge “pending” → modale Approva/Rifiuta (override durata, note admin, orario definitivo).
4. Approva nuova modifica su lezione già modificata → richiesta precedente (approved) diventa `archived`.
5. Colonne:
   - “Data / Orario Lezione” → orario finale se approved, proposto se pending.
   - “Orario originario” → mostra orarioOriginale solo se approved (e differente) o archived.
6. Divieti:
   - Niente doppia richiesta pending/in_review sulla stessa lezione.
   - No richiesta su lezione passata (blocco lato client).

## 6. Scenario test richieste (baseline)
1. Cambio data → approve → badge “Modificata”
2. Cambio orario successivo → archiviazione precedente
3. Cancellazione → stato lezione = Cancellata
4. Rifiuto → stato = rejected (riga visibile cliente/admin, sparisce badge)
5. Catena 3 modifiche → orarioOriginale resta quello iniziale

## 7. Policy naming / layout (immutate)
- Componenti React: PascalCase
- Variabili/funzioni: camelCase
- Modelli DB: PascalCase
- Cartelle: kebab-case o camelCase, niente spazi
- Niente codice applicativo fuori da `/app`

## 8. Log Operativo
- Reverse chronological
- Ogni entry:
  - Timestamp UTC+2
  - Descrizione sintetica
  - File coinvolti
  - Scenario test (se pertinente)
- Non saltare aggiornamenti correlati tra file strutturali.

## 9. Route prototipali
- `/lavagna`: prototipo (lista lavagne, filtraggio admin vs cliente)
- `/materiale`: prototipo (repository materiale pubblico/assegnato)
- Finché prototipi: segnare ogni evoluzione funzionale nel log prima della stabilizzazione.

## 10. Calendario unificato
- Stesso componente base per admin e cliente
- Cliente: richieste attivate via `enableStudentRequests`
- Admin: gestione modali approvazione via badge in tabella lezioni

## 11. Policy test / CI (estratto)
- Prima del push: lint, test, controllo duplicati, aggiornamento log
- Ogni PR: se tocca README / STANDARD / MAPPA / LOG → devono essere coerenti (ultima entry log aggiornata)

## 12. Milestone e Audit
- Chiudi milestone solo dopo:
  - Audit duplicati
  - Coerenza timestamp log
  - Aggiornamento mappa + elencocompleto.txt
  - Scenario test eseguito

## 13. Materiale e Lavagna (linee guida temporanee)
- Finché non esistono API reali:
  - Mock limitati al minimo
  - Nessun commit di file reali di contenuto sensibile
- Future estensioni: ACL per materiale, versioning lavagna, tagging.

## 14. Sicurezza
- Nessuna credenziale in commit
- .env* nel gitignore
- Validare input richieste modifica lato server (stato lezione, duplicati, tempo minimo)

## 15. Ultimo aggiornamento
2025-09-29 03:50 UTC+2