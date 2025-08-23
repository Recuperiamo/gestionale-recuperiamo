# STANDARD OPERATIVO E FORMATTAZIONE (VINCOLANTE)

> **IMPORTANTE:**  
> Se modifichi la struttura del progetto o le regole operative, aggiorna SEMPRE questo file e avvisa in LOG_OPERATIVO.md e in chat.

## Regole di governance e collaborazione

- Segui SEMPRE tutte le regole vincolanti di formato e comportamento in questo file.
- Ogni gruppo di comandi va dato in due blocchi distinti: CMD e PowerShell, nessun commento nei blocchi, una riga = un comando, spiegazioni solo fuori.
- Quando modifichi file, fornisci sempre file completi (non patch), elenca prima i file coinvolti, non cambiare stile.
- Dopo ogni step significativo aggiorna LOG_OPERATIVO.md e fornisci i comandi git per commit/push (se serve).

- **LOG_OPERATIVO:** Aggiorna sempre e chiedi conferma se rilevi omissioni.
- **Aggiorna standard e README:** Ricorda di aggiornare questo file e README.md dopo cambiamenti strutturali o di regole.
- **Verifica periodica stato:** Fornisci spontaneamente riepiloghi dello stato del progetto dopo modifiche rilevanti, o se il log operativo diventa lungo.
- **Impatto e rischi:** Avvisa sempre se una modifica può mettere a rischio la struttura o la mantenibilità, o se noti file non integrati nella UI.
- Se ci sono dubbi, chiedi prima di agire. Ricorda all’utente all’inizio di ogni sessione: “Segui la procedura standard, controlla sempre STANDARD_OPERATIVO.md, aggiorna LOG_OPERATIVO.md dopo ogni step.”
- Se la struttura del progetto o le regole cambiano, aggiorna questo file e avvisa in chat e nel log operativo.
- Se c’è un errore formale e l’utente scrive “RIFORMATTA”, fornisci subito la versione corretta senza spiegazioni extra.

---

## Policy di controllo avanzato (CI/CD e log operativo)

- Se una PR modifica README.md, STANDARD_OPERATIVO.md, ONBOARDING_SESSION.md o END_SESSION.md, LOG_OPERATIVO.md deve essere aggiornato nella stessa PR.
- L’ultima entry di LOG_OPERATIVO.md deve contenere obbligatoriamente:
  - Timestamp con data e ora in formato `[YYYY-MM-DD HH:MM UTC+2]`
  - La versione di STANDARD_OPERATIVO.md applicata (o la data di ultima modifica)
  - Una sezione “File coinvolti” che elenchi tutti i file chiave modificati nella PR
  - Una sezione “Scenario Test” che descriva come validare manualmente la modifica
- Se la PR modifica README.md o STANDARD_OPERATIVO.md, questi file devono essere obbligatoriamente elencati nella sezione “File coinvolti”.
- In assenza di uno qualsiasi di questi elementi, il workflow CI/CD blocca la PR.

---
# STANDARD_OPERATIVO

## Regole vincolanti (aggiornamento: 2025-08-17 16:45 UTC+2)
## Regole vincolanti (da rispettare SEMPRE)

- MAPPA_STRUTTURA_PROGETTO.md va SEMPRE aggiornata e fornita come file COMPLETO, mai in formato PATCH, ma sempre come nuova versione integrale aggiornata rispetto alla precedente.
- Dopo ogni modifica strutturale (aggiunta, spostamento, rinomina, eliminazione di file o cartelle), aggiorna SEMPRE anche STANDARD_OPERATIVO.md e README.md, e avvisa in chat.
- - Tutti gli orari nel LOG_OPERATIVO.md devono essere in formato UTC+2, progressivi e coerenti.

- Prima di proporre o creare nuovi file/componenti, controlla SEMPRE se esiste già un file con nome simile (anche con estensione diversa) nella repo o nei path coinvolti. Segnala in chat ogni caso dubbio o rischio di duplicato/conflitto.
- Ogni gruppo di comandi va dato in due blocchi distinti: CMD e PowerShell, nessun commento nei blocchi, una riga = un comando, spiegazioni solo fuori. Fornisci sempre i comandi completi (mai parziali).
- Scenario test/manuale: suggerisci e descrivi sempre uno scenario per ogni nuova feature/issue.

---
- Ogni file React/JSX in app/, app/components/ e percorsi analoghi DEVE avere `import React from "react";` in testa, anche se Next.js 13+ e anche se non esplicitamente richiesto.
- Nelle API route Next.js (.ts/.js in app/api/...), NON usare tipizzazione TypeScript inline nei parametri delle callback. Se necessario, aggiungere `// @ts-nocheck` in testa al file per evitare warning/errori TS non risolvibili.
- Dopo ogni modifica strutturale, aggiornare sempre sia LOG_OPERATIVO.md che README.md e STANDARD_OPERATIVO.md, segnalando in chat l'avvenuto aggiornamento.
- [Altre regole preesistenti qui...]


## 1. Comandi

- Ogni gruppo di comandi va SEMPRE dato in due blocchi distinti:
  - CMD: blocco di backticks con SOLO le righe di comando (una riga = un comando)
  - PowerShell: blocco di backticks con SOLO le righe di comando (una riga = un comando)
- Nessun commento o testo dentro i blocchi. Spiegazioni SOLO fuori.
- Se un ambiente non è applicabile lo indichi fuori dal blocco ma lasci il blocco (anche vuoto se necessario) per consistenza.
- Non unire mai più comandi sulla stessa riga.
- Niente prompt iniziali tipo C:\> dentro ai blocchi.

## 2. File

- Quando fornisci codice di file esistenti o nuovi: usa sempre blocchi con sintassi \```<linguaggio> name=percorso/file.ext
- Dare il FILE COMPLETO (non patch diff).
- Se devo modificare più file: elencarli prima, poi ognuno nel suo blocco file.
- Non introdurre refactor invisibili: mantieni lo stile già presente.

## 3. Conservazione stack

- Se pensi serva una nuova dipendenza: chiedi prima “Proponi alternative senza dipendenze”.
- Non modificare package.json, toolchain, build system senza esplicito consenso.
- Se chiedo qualcosa che implica cambiare stack senza necessità: avvisami e chiedi conferma.

## 4. Nuove funzioni / refactor

- Prima chiedi: “Dammi elenco file prima di codice” se il cambiamento tocca più file o introduce concetti non visti.
- Spiega in anticipo l’impatto in 3–5 bullet sintetici.
- Fornisci sempre Scenario Test Manuale alla fine sotto etichetta: “SCENARIO TEST”.

## 5. Errori / formattazione

- Se segnalo che i comandi sono su una riga o mal formattati, NON attribuire la colpa a me.
- Rispondi con scuse brevi e riformatta secondo lo standard.
- Se sbagli formato e io scrivo solo: “RIFORMATTA”, devi ripubblicare subito gli stessi comandi/formato corretto senza testo superfluo.

## 6. Asincrono

- Quando trasformi una funzione sync in async: indicare esattamente ogni punto chiamante da aggiornare.
- Evita pseudo-patch: mostra versioni finali dei file.

## 7. Output atteso

- Quando mi chiedi di eseguire comandi: elenca esattamente cosa incollare di ritorno (A, B, C…).
- Mai abbreviare i comandi: niente “(ripeti per gli altri)”.

## 8. Sicurezza / placeholder

- Per dati sensibili usa placeholder chiaramente marcati (ES: <ADMIN_EMAIL_PLACEHOLDER>).
- Non generare segreti reali.

## 9. Linguaggio

- Italiano, tecnico ma chiaro e sintetico.
- Non usare tono accusatorio.

## 10. Quando dubbi

- Se c’è ambiguità: fermati e chiedi chiarimento prima di generare codice.

---

## Aggiornamento LOG_OPERATIVO.md e backup GitHub

- Dopo ogni modifica significativa (nuovo file, refactor, fix, scenario test, modifica struttura, merge, ecc.), aggiorna SEMPRE LOG_OPERATIVO.md in root, seguendo il formato standard.
- Al termine della modifica, fornisci:
  - LOG_OPERATIVO.md aggiornato (file completo)
  - Blocchi comandi Git (CMD e PowerShell) per aggiungere, committare e pushare la modifica.
- Dopo i comandi, chiedi sempre output completo, eventuali errori e conferma che il log sia aggiornato.
- **In ogni nuova entry di LOG_OPERATIVO.md, inserisci obbligatoriamente la versione o la data di STANDARD_OPERATIVO.md applicata a quella modifica. Se non esiste un vero sistema di versionamento, usa la data di ultima modifica del file.**

Esempio comandi:

CMD:
```
git add LOG_OPERATIVO.md
git add <file_coinvolti>
git commit -m "Aggiorna LOG_OPERATIVO.md e <breve_descrizione>"
git push
```

PowerShell:
```
git add LOG_OPERATIVO.md
git add <file_coinvolti>
git commit -m "Aggiorna LOG_OPERATIVO.md e <breve_descrizione>"
git push
```

## **Riepilogo:**
- Ogni sessione, ogni risposta, ogni modifica deve rispettare questo standard.
- Aggiorna il file se aggiungi nuove regole strutturali.
- Versiona SEMPRE il file su GitHub!

---

## 11. Stack, struttura e regole tecniche vincolanti

- **Framework:** Next.js (ultima LTS disponibile) con TypeScript.
- **Styling:** È obbligatorio l’uso di Tailwind CSS.
- **Root codice:** Tutto il codice sorgente deve essere sotto la cartella `/src`.
- **Routing:** Usare esclusivamente App Router (`/src/app`). L’uso del pages router legacy NON è consentito.
- **Dev server:** Usare Webpack (Turbopack disabilitato/stabile non adottato fino a nuovo standard).
- **Alias import:** Mantenere come unico alias di default `@/*`.
- **ESLint e Prettier:** DevDependencies obbligatorie, con configurazione condivisa in repo.
- **Struttura minima progetto:**  
  - `src/` (contenente tutto il codice applicativo)
  - `src/app/` (root del routing)
  - `src/styles/` (stili globali Tailwind, se necessario)
  - `public/` (asset pubblici)
  - `README.md`, `STANDARD_OPERATIVO.md`, `LOG_OPERATIVO.md` in root
  - File di configurazione Next.js e toolchain in root (es: `next.config.js`, `tailwind.config.js`, `tsconfig.json`, ecc.)
- **Bootstrap progetto:**  
  Il progetto deve essere inizializzato in modo che rispetti tutte le regole sopra. Qualunque modifica a questi vincoli deve essere discussa, approvata e documentata PRIMA di essere applicata.

---

## Aggiornamento e validazione regole stack

- Qualsiasi modifica a queste impostazioni tecniche va discussa PRIMA in issue dedicata e approvata via PR, con aggiornamento obbligatorio di questo file e del README.md.
- Tutte le PR che modificano la struttura o lo stack devono riportare l’estratto aggiornato di questa sezione nello spazio descrizione della PR.

# STANDARD OPERATIVO

## Principi fondamentali

- Tutti i file e le cartelle di progetto DEVONO risiedere esclusivamente all’interno della root della repository gestionale-recuperiamo.
- NESSUN file o cartella di progetto può essere presente fuori dalla cartella gestionale-recuperiamo.
- Tutte le operazioni di sviluppo, git, npm, test e gestione CI/CD devono essere eseguite solo dentro gestionale-recuperiamo.
- La root superiore può contenere solo la cartella gestionale-recuperiamo e (opzionalmente) documenti personali NON collegati al progetto.

## Aggiornamento struttura

- Dopo ogni intervento strutturale, aggiornare sempre LOG_OPERATIVO.md, STANDARD_OPERATIVO.md e README.md.
- Ogni anomalia o deviazione va documentata tempestivamente nel log operativo.

## Test e validazione

- Ogni modifica strutturale DEVE essere seguita da test manuale: `npm install`, `npm run dev`, `git status` eseguiti da dentro la repo.
- Nessun warning di lockfile multipli deve essere presente.
- Il log operativo e la documentazione vanno aggiornati immediatamente dopo i test.

## Regole per .gitignore

- Utilizzare un file .gitignore in root aggiornato secondo stack Next.js/Node.
- Escludere SEMPRE: node_modules, output di build (.next, dist, out), file temporanei (*.log, *.tmp, temp/, tmp/), configurazioni locali (.env, .env.*, tranne .env.example), output di test/coverage e file di sistema/OS.
- Escludere anche tutti i file temporanei custom (es: elenco_clonata.txt) e output.md.
- Non devono MAI essere esclusi: LOG_OPERATIVO.md, STANDARD_OPERATIVO.md, README.md, file di configurazione strategici, deliverable di progetto.
- Aggiornare .gitignore ogni volta che si introducono nuovi file di build/output temporanei.
- Dopo ogni modifica a .gitignore, aggiornare STANDARD_OPERATIVO.md e README.md.
# STANDARD_OPERATIVO.md

...

## Testing automatico (Jest + React Testing Library)

- Per ogni modifica strutturale o feature che impatta il frontend, aggiungi o aggiorna i test automatici in `/tests`.
- La struttura minima di test richiede:
  - `jest.config.js` con testEnvironment: "jsdom" e preset per Next.js
  - `babel.config.js` con preset `"next/babel"`
  - Dipendenze dev: jest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, babel-jest, jest-environment-jsdom, identity-obj-proxy
- Ogni test in JSX DEVE funzionare senza errori. Se ricevi errori di parsing JSX, verifica la presenza e correttezza di `babel.config.js`.
- Esegui i test con `npm test`. Tutti i test devono passare prima di effettuare il push.
- Aggiorna LOG_OPERATIVO.md, README.md e STANDARD_OPERATIVO.md dopo ogni modifica a questa struttura.

...

# STANDARD OPERATIVO - Recuperiamo Gestionale

...

## Flusso autenticazione e gestione utenti/ruoli (milestone 9)

- Stack: NextAuth.js (auth), Prisma ORM, PostgreSQL.
- Installazione obbligatoria (dev):  
  - `npm install next-auth @prisma/client prisma`
- Lo schema utenti/ruoli è centralizzato in Prisma.
- Adapter NextAuth.js configurato per PostgreSQL.
- Policy di commit/log: ogni variazione di stack auth, modello utenti, policy ruoli deve essere registrata in LOG_OPERATIVO.md e aggiornata su README.md.

### Scenario test/manuale autenticazione

1. Decisione stack e motivazione documentate su LOG_OPERATIVO.md e README.md.
2. Dipendenze installate e visibili in package.json.
3. Adapter configurato (vedi esempio in README.md).
4. Tutte le modifiche pushate, log aggiornato.

...

## Comandi obbligatori installazione stack auth

- `npm install next-auth @prisma/client prisma`
- `npx prisma init`
- Aggiungere/aggiornare schema Prisma per User e Role
- `npx prisma migrate dev --name init_auth`

...

# STANDARD OPERATIVO - Recuperiamo Gestionale

...

## Flusso autenticazione e gestione utenti/ruoli (milestone 9)

- Stack: NextAuth.js (auth), Prisma ORM, PostgreSQL.
- Installazione obbligatoria (dev):  
  - `npm install next-auth @prisma/client prisma`
  - `npx prisma init`
- Dopo `prisma init` sono obbligatori: cartella `/prisma` e file `schema.prisma`.
- Lo schema utenti/ruoli è centralizzato in Prisma.
- Adapter NextAuth.js configurato per PostgreSQL.
- Policy di commit/log: ogni variazione di stack auth, modello utenti, policy ruoli deve essere registrata in LOG_OPERATIVO.md e aggiornata su README.md.

### Scenario test/manuale autenticazione

1. Decisione stack e motivazione documentate su LOG_OPERATIVO.md e README.md.
2. Dipendenze installate e visibili in package.json.
3. Adapter configurato (vedi esempio in README.md).
4. Tutte le modifiche pushate, log aggiornato.

...

## Comandi obbligatori installazione stack auth

- `npm install next-auth @prisma/client prisma`
- `npx prisma init`
- Aggiungere/aggiornare schema Prisma per User e Role
- `npx prisma migrate dev --name init_auth`

...
# STANDARD OPERATIVO - Recuperiamo Gestionale

...

## Flusso autenticazione e gestione utenti/ruoli (milestone 9)

- Schema Prisma utenti/ruoli: modelli User, Role, Account, Session, VerificationToken.
- User obbligatoriamente associato a un Role.
- Ruoli predefiniti: admin, operatore, visualizzatore.
- Policy: ogni modifica a schema utenti/ruoli richiede aggiornamento log e README.md.

### Scenario test/manuale schema utenti/ruoli

1. schema.prisma contiene i modelli User, Role, Account, Session, VerificationToken come descritto.
2. Migrazione effettuata senza errori.
3. Tabella Role popolata con almeno i tre ruoli predefiniti.
4. Tutte le modifiche documentate e pushate.

## Comandi obbligatori migrazione iniziale schema auth

- `npx prisma migrate dev --name init_auth`
- (opzionale) Popolamento ruoli via script seed/prisma studio/manuale

...

# STANDARD OPERATIVO - Recuperiamo Gestionale

...

## Flusso autenticazione e gestione utenti/ruoli (milestone 9)

- Schema Prisma utenti/ruoli: modelli User, Role, Account, Session, VerificationToken.
- User obbligatoriamente associato a un Role.
- Ruoli predefiniti: admin, operatore, visualizzatore.
- Policy: ogni modifica a schema utenti/ruoli richiede aggiornamento log e README.md.

### Scenario test/manuale schema utenti/ruoli

1. schema.prisma contiene i modelli User, Role, Account, Session, VerificationToken come descritto.
2. Migrazione effettuata senza errori.
3. Tabella Role popolata con almeno i tre ruoli predefiniti.
4. Tutte le modifiche documentate e pushate.

## Comandi obbligatori migrazione iniziale schema auth

- `npx prisma generate`
- `npx prisma migrate dev --name init_auth`
- `npx prisma studio` (popolamento ruoli)

...

## Flusso configurazione NextAuth.js + Prisma (su /app/)

- File obbligatorio: `/app/api/auth/[...nextauth]/route.js`
- Provider richiesto: Credentials (email/password)
- Adapter: Prisma
- Ogni utente deve avere ruolo associato
- Callback NextAuth session/jwt arricchisce la sessione con `user.role`
- Ogni modifica va riportata su LOG_OPERATIVO.md e README.md

### Scenario test/manuale

1. Login con utente dotato di ruolo in DB → sessione con ruolo
2. Login negato se manca ruolo o password errata
3. Modifiche documentate e pushate

---
### Login custom NextAuth.js

- La pagina /app/auth/signin/page.js deve essere presente per l’autenticazione customizzata.
- Il form deve gestire errori e redirect.
- Ogni modifica va riportata su LOG_OPERATIVO.md e README.md.

### Login e propagazione ruolo NextAuth

- La configurazione NextAuth deve usare la callback `redirect` per forzare il redirect post-login su `/`.
- La callback `authorize` in CredentialsProvider deve includere la relazione `role` nella query Prisma:
  ```js
  include: { role: true }
  ```
- L’oggetto user restituito da authorize deve avere `role: user.role?.name`.
- Le callback `jwt` e `session` propagano `role` nel token e nella sessione.
- Scenario test manuale obbligatorio dopo modifiche: login con utenti dei vari ruoli, verifica visibilità ruolo in dashboard.

---

### Debug loop login

- Se compare loop login NextAuth, controllare:
  - callbackUrl in query string
  - pages.signIn custom in config NextAuth
  - callback `redirect` configurata correttamente
  - esistenza della pagina di destinazione

---
# STANDARD OPERATIVO – Gestionale Recuperiamo

## Regole vincolanti per la struttura delle cartelle

- Segui la struttura definita in ARCHITETTURA_CARTELLE_BOZZA.md.
- Ogni cartella principale e ogni sottocartella di `/src` deve contenere un file `context.md` che ne spiega scopo e regole d’uso.
- Non usare mai file denominati README.md all’interno delle cartelle di progetto: la descrizione va sempre in `context.md`, conforme agli standard di progetto.
- Ogni aggiornamento strutturale va tracciato in LOG_OPERATIVO.md e nel presente file.
- Non collocare codice core al di fuori di `/src`.

## Procedura per l’aggiunta/modifica di cartelle

1. Crea la nuova cartella seguendo lo standard.
2. Inserisci un file `context.md` descrittivo con scopo, regole e best practice.
3. Aggiorna LOG_OPERATIVO.md e README.md.
4. Se la modifica è strutturale, aggiorna anche questo STANDARD_OPERATIVO.md.

---

Ultimo aggiornamento: 2025-08-16 19:05 UTC+2

# STANDARD OPERATIVO – Gestionale Recuperiamo

## Regole vincolanti per la struttura delle cartelle

- Segui la struttura definita in ARCHITETTURA_CARTELLE_BOZZA.md.
- Ogni cartella principale e ogni sottocartella di `/src` deve contenere un file `context.md` che ne spiega scopo e regole d’uso.
- Non usare mai file denominati README.md all’interno delle cartelle di progetto: la descrizione va sempre in `context.md`, conforme agli standard di progetto.
- Ogni aggiornamento strutturale va tracciato in LOG_OPERATIVO.md e nel presente file.
- Non collocare codice core al di fuori di `/src`.
- La presenza di file `context.md` extra (ad es. in root, _app, src/generated, ecc.) è ammessa se non interferisce con la gestione del codice, la build o i workflow: tali file devono essere documentati in README.md e qui, e servono per eventuali necessità di onboarding, documentazione supplementare o future evoluzioni.

## Procedura per l’aggiunta/modifica di cartelle

1. Crea la nuova cartella seguendo lo standard.
2. Inserisci un file `context.md` descrittivo con scopo, regole e best practice.
3. Aggiorna LOG_OPERATIVO.md e README.md.
4. Se la modifica è strutturale, aggiorna anche questo STANDARD_OPERATIVO.md.
5. Se aggiungi un context.md extra (fuori dallo standard), documentalo in README.md e qui.

---

Ultimo aggiornamento: 2025-08-16 20:45 UTC+2

# STANDARD_OPERATIVO.md

## Regole vincolanti di gestione e contribuzione

- **Routing:**  
  Tutte le pagine Next.js vanno create come sottocartelle di `app/` in root.  
  Non è più consentito l’uso di `src/app` né come cartella legacy né per nuove pagine.
- **Struttura:**  
  La root contiene:
  - `app/` — tutte le pagine e i layout Next.js
  - `src/` — componenti, utilità, moduli non di routing
  - Altri file di configurazione e documentazione
- **Log operativo:**  
  Ogni operazione strutturale e ogni evento importante deve essere registrato in `LOG_OPERATIVO.md` con data e orario UTC+2.
- **README:**  
  Deve sempre rispecchiare la struttura attuale del progetto e le policy di routing.
- **Milestone e commit:**  
  Alla chiusura di ogni milestone va controllata la coerenza e la progressività dei timestamp nel log.
- **Debug:**  
  In caso di conflitti o errori, seguire la procedura:  
  1. Verifica struttura con comandi CMD/PowerShell  
  2. Pulizia cache Next.js  
  3. Test server dev  
  4. Aggiornamento log e README
- **Scenario test manuale:**  
  Per ogni nuova pagina/feature, descrivere sempre uno scenario test manuale a supporto della verifica.
- **Push:**  
  Dopo ogni gruppo di modifiche, pushare sia i file modificati/creati sia log, README, STANDARD_OPERATIVO.
- **Aggiornamento file:**  
  Ogni modifica va riportata per intero o con stringhe di riferimento, mai solo parziale senza contesto.

---# STANDARD_OPERATIVO.md

## Regole vincolanti di gestione e contribuzione

- **Routing:**  
  Tutte le pagine Next.js vanno create come sottocartelle di `app/` in root.  
  Non è più consentito l’uso di `src/app` né come cartella legacy né per nuove pagine.
- **Struttura:**  
  La root contiene:
  - `app/` — tutte le pagine e i layout Next.js
  - `src/` — componenti, utilità, moduli non di routing
  - Altri file di configurazione e documentazione
- **Navbar:**  
  Ogni pagina principale deve includere la Navbar comune da `app/components/Navbar.js` (esclusa la pagina 404 custom).
- **Pagine principali:**  
  `/`, `/signin`, `/profile`, `/settings`, `/not-found` (404 custom, non elencata in navbar).
- **Log operativo:**  
  Ogni operazione strutturale e ogni evento importante deve essere registrato in `LOG_OPERATIVO.md` con data e orario UTC+2.
- **README:**  
  Deve sempre rispecchiare la struttura attuale del progetto e le policy di routing.
- **Milestone e commit:**  
  Alla chiusura di ogni milestone va controllata la coerenza e la progressività dei timestamp nel log.
- **Debug:**  
  In caso di conflitti o errori, seguire la procedura:  
  1. Verifica struttura con comandi CMD/PowerShell  
  2. Pulizia cache Next.js  
  3. Test server dev  
  4. Aggiornamento log e README
- **Scenario test manuale:**  
  Per ogni nuova pagina/feature, descrivere sempre uno scenario test manuale a supporto della verifica.
- **Push:**  
  Dopo ogni gruppo di modifiche, pushare sia i file modificati/creati sia log, README, STANDARD_OPERATIVO.
- **Aggiornamento file:**  
  Ogni modifica va riportata per intero o con stringhe di riferimento, mai solo parziale senza contesto.

---
# STANDARD_OPERATIVO.md

## Regole vincolanti di gestione e contribuzione

- **Routing:**  
  Tutte le pagine Next.js vanno create come sottocartelle di `app/` in root.  
  Non è più consentito l’uso di `src/app`.
- **Autenticazione:**  
  Il sistema di autenticazione utilizza NextAuth.js con credenziali (mock utente).  
  La route API NextAuth è: `/app/api/auth/[...nextauth]/route.js`.
  Pagine protette da autenticazione: `/`, `/profile`, `/settings`.
  Accesso libero a `/signin` e `/not-found`.
- **Navbar:**  
  Ogni pagina principale deve includere la Navbar comune da `app/components/Navbar.js` (esclusa la pagina 404 custom).
  Navbar mostra login/logout in base alla sessione.
- **Log operativo:**  
  Ogni operazione strutturale, evento importante o modifica all’autenticazione deve essere registrata in LOG_OPERATIVO.md (UTC+2).
- **README:**  
  Deve sempre rispecchiare la struttura attuale e includere scenario test manuale aggiornato.
- **Milestone e commit:**  
  Alla chiusura di ogni milestone va controllata la coerenza e progressività dei timestamp nel log.
- **Debug:**  
  In caso di conflitti o errori, seguire la procedura:  
  1. Verifica struttura  
  2. Pulizia cache  
  3. Test server dev  
  4. Aggiornamento log e README
- **Scenario test manuale:**  
  Aggiornare sempre per ogni feature/bugfix.
- **Push:**  
  Dopo ogni gruppo di modifiche, pushare file modificati/creati più log, README, STANDARD_OPERATIVO.
- **Aggiornamento file:**  
  Ogni modifica va riportata per intero o con stringhe di riferimento.

---
# STANDARD OPERATIVO – GESTIONALE PACCHETTI ORE

...

## Gestione Prisma e Database

- Per ogni modifica a `schema.prisma` (aggiunta/variazione modelli, relazioni, proprietà) è necessario eseguire:

  ```
  npx prisma generate
  ```

- **Nota:**  
  Questo comando va eseguito ogni volta che cambi lo schema Prisma, o se sposti/ricrei la cartella `node_modules`.

- Ricordati di eseguire anche le migration:

  ```
  npx prisma migrate dev
  ```

...
# STANDARD_OPERATIVO.md (estratto aggiornato 2025-08-17)

## Regole protezione accessi e ruoli

- Tutti i controlli di accesso alle pagine sensibili (es: dashboard) devono essere implementati sia lato server (`middleware.js`) che lato client (nei componenti React).
- Solo utenti con ruolo `admin` possono accedere a `/` (dashboard). Gli altri vengono reindirizzati a `/profilo`.
- La pagina `/profilo` è accessibile a tutti gli utenti autenticati e rappresenta la landing page di default per operatori e visualizzatori.
- Navbar: mostrare link “Dashboard” solo ad admin, “Profilo” a tutti.
- Dopo login, admin viene reindirizzato a `/`, altri ruoli a `/profilo` (gestito nella callback redirect di NextAuth).
- Ogni modifica strutturale deve essere riflessa in questo file, in README.md e nel log operativo.

## Scenario test manuale (obbligatorio per ogni release)

1. Login come admin → accesso a `/`, link “Dashboard” e “Profilo” visibili.
2. Login come operatore/visualizzatore → redirect e accesso solo a `/profilo`, nessun link dashboard.
3. Forzare `/` da browser con ruolo non admin → redirect su `/profilo`.
4. Logout/login con altro ruolo → comportamento coerente e link corretti.
---

# STANDARD OPERATIVO – Milestone 3 (Clienti)

## Modello dati clienti – Regole obbligatorie

### Campi obbligatori
- `nome_referente`: obbligatorio, non vuoto
- `email`: obbligatorio, non vuoto, formato valido

### Campi opzionali
- `telefono`: opzionale, formato base se presente
- `indirizzo`: opzionale
- `codice_fiscale`: opzionale, se presente dev'essere unico e valido (formato CF IT)
- `partita_iva`: opzionale, se presente dev'essere unica e valida (formato PIVA IT)
- `note`: opzionale, campo libero

### Validazioni chiave
- `nome_referente` e `email` devono essere sempre presenti e non vuoti.
- Se forniti, `codice_fiscale` e/o `partita_iva` devono essere unici e rispettare il formato previsto.
- Email deve rispettare il formato previsto.
- Telefono, se presente, deve rispettare il formato base.

### Edge-case da testare
- Cliente solo con nome ed email (senza altri dati): deve funzionare.
- Cliente con uno o entrambi tra CF e PIVA, formati validi e non duplicati.
- Tentato inserimento con CF/PIVA già presenti (duplicati).
- Inserimento con nome/email vuoti: errore.
- Aggiornamento con tentativo di duplicare CF/PIVA.
- Inserimento con tutti i campi opzionali riempiti.

---

## Scenario test manuale – CRUD clienti
(Vedi README.md per dettagli e casi)

# STANDARD_OPERATIVO

## Policy vincolanti di formato, log, milestone
- Ogni operazione strutturale deve essere riportata in LOG_OPERATIVO.md con data+ora (UTC+2), in ordine progressivo.
- Aggiornare sempre README.md e STANDARD_OPERATIVO.md dopo modifiche strutturali (endpoint, policy, directory).
- Dopo ogni commit/push significativo, verificare la coerenza e progressività dei timestamp.
- Alla chiusura milestone: controllare coerenza orari nel log, chiudere milestone, crearne una nuova ancorata all’ultimo orario del log.
- Ogni cambiamento strutturale (nuovi endpoint, refactor directory) va descritto in README.md e loggato.
- Scenario test manuale obbligatorio per ogni feature.
- In fase di debug, fornire sempre file completi.

## Endpoints attuali (ver. 2025-08-17 05:10 UTC+2)
- app/api/clienti/route.js (CRUD lista)
- app/api/clienti/[id]/route.js (dettaglio singolo cliente)


## Policy confronto struttura reale vs. architettura ideale

**OBBLIGATORIO – Ad ogni modifica strutturale:**

- Confronta sempre la struttura attuale del repository con il file `ARCHITETTURA_CARTELLE_BOZZA.md` (modello architetturale ideale).
- Qualsiasi variazione, refactor, nuova cartella o file che si discosti dal modello ideale va spiegata in `LOG_OPERATIVO.md` (motivazione e impatto).
- Se la variazione è strutturale, aggiorna anche `README.md` e il presente file.
- In caso di dubbio, passa sempre il file architetturale a Copilot per un confronto, oppure Copilot confronterà autonomamente la repo.
- **La bozza architetturale NON va aggiornata per ogni micro-evoluzione:** solo in caso di cambi di roadmap o revisione strategica, aggiornala e incolla la versione precedente in fondo a `LOG_OPERATIVO.md` per storico.
- Questo processo va seguito e documentato per garantire coerenza, scalabilità e onboarding efficace.

...

## Policy verifica file esistenti prima di nuove creazioni

**OBBLIGATORIO – Evitare duplicati e conflitti:**
- Prima di proporre o creare un nuovo file (soprattutto componenti, pagine, utility):
  - Verifica sempre se esiste già un file con lo stesso nome (anche con estensione diversa come .js/.jsx/.ts/.tsx) nella stessa directory o in directory affini.
  - In caso di dubbio, chiedi sempre conferma all’autore o esegui una ricerca nell’intera repository.
  - Segnala e documenta nel LOG_OPERATIVO.md qualsiasi anomalia, rischio di duplicazione o necessità di refactor.
  - Integra sempre la verifica di eventuali file duplicati negli scenari di test manuale.

  # STANDARD OPERATIVO

## Regole vincolanti

1. **Controllo file duplicati/cloni**
   - Prima di proporre o creare nuovi file/componenti, controlla SEMPRE se esiste già un file con nome simile (anche con estensione diversa) nella repo o nei path coinvolti.
   - Prima di ogni chiusura milestone, esegui il seguente comando PowerShell dalla root del progetto per individuare file duplicati (stesso nome, qualsiasi estensione/directory):

     ```powershell
     Get-ChildItem -Recurse -File | Group-Object Name | Where-Object { $_.Count -gt 1 } | Select-Object -ExpandProperty Name
     ```

   - Se il risultato è vuoto, annota nel LOG_OPERATIVO.md che la repo è pulita.
   - Se vengono elencati file, individua le posizioni con:
     ```powershell
     Get-ChildItem -Recurse -File | Where-Object { $_.Name -eq "NOME_FILE_DUPLICATO" }
     ```
     Valuta se sono realmente cloni/doppioni da eliminare/merge/refactor. Documenta SEMPRE nel LOG_OPERATIVO.md e risolvi prima di chiudere la milestone.

2. **Aggiornamento file strutturali**
   - Dopo ogni modifica strutturale (nuove policy, nuova milestone, refactor fondamentali, ecc.), aggiorna sempre sia STANDARD_OPERATIVO.md che README.md e segnala in LOG_OPERATIVO.md.

3. **Scenario test manuale controllo duplicati**
   - Esegui il comando PowerShell sopra riportato.
   - Se non esistono duplicati, annota il controllo in LOG_OPERATIVO.md.
   - Se esistono, documenta ogni caso (nome file, percorso, motivo della duplicazione), valuta e risolvi prima di chiudere la milestone.

4. **Gestione orari log**
   - Tutte le voci del LOG_OPERATIVO.md devono riportare data e ora (UTC+2), essere coerenti e progressivi.
   - Alla chiusura milestone, controllare la coerenza dei timestamp e creare subito una nuova milestone.

5. **Push file**
   - Dopo ogni aggiornamento ai file strutturali o log, eseguire sempre il push completo (vedi scenari test/manuali).

---

## Esempio di annotazione LOG_OPERATIVO.md

```
## 2025-08-17 11:20 UTC+2
- Eseguito controllo duplicati file con PowerShell: Get-ChildItem -Recurse -File | Group-Object Name | Where-Object { $_.Count -gt 1 } | Select-Object -ExpandProperty Name
- Nessun file duplicato trovato nell’intero progetto. Struttura pulita.
```

---

## Altri scenari test/manuali

- Dopo ogni modifica strutturale, verifica che nessun file chiave sia stato duplicato/spostato senza aggiornare le importazioni.
- Aggiorna sempre README.md e LOG_OPERATIVO.md in caso di variazioni alle policy o alla struttura.

...
### Accesso alla gestione clienti dalla Dashboard Admin

- La **Dashboard Admin** è la home privata dopo il login admin (file: `app/page.js`).
- Accanto al pulsante “Profilo” in alto a destra è presente il bottone “Gestione clienti”, visibile solo per utenti con ruolo `admin`.
- Il bottone porta a `/clienti`.
- La protezione della rotta `/clienti` è già garantita lato backend.

...

# ... [contenuto precedente] ...

## Regole milestone “Collegamento clienti-pacchetti ore” (2025-08-17)

- Ogni pacchetto ore è associato a UN solo cliente (`clienteId`), ogni cliente può avere N pacchetti.
- Eliminazione di un cliente comporta eliminazione automatica dei pacchetti associati (cascade).
- Tutti i nuovi file/feature devono essere tracciati nel LOG_OPERATIVO.md con orario UTC+2 e scenario test.
- Ogni modifica strutturale prevede aggiornamento contestuale di README.md, STANDARD_OPERATIVO.md e LOG_OPERATIVO.md.
- Non sono ammessi duplicati di componenti, API o modelli: verifica preventiva obbligatoria.

# STANDARD_OPERATIVO

## Regole vincolanti

- Ogni modifica strutturale richiede aggiornamento di questo file e di README.md.
- Dopo ogni operazione, aggiorna LOG_OPERATIVO.md con timestamp UTC+2 e scenario test.
- Comandi push sempre forniti in doppio formato (CMD e PowerShell).
- File API e lib condivise in JS puro per compatibilità Next+Babel.
- Se esistono file `.ts` ridondanti, eliminarli o convertirli.
- Nessuna modifica o commit senza aggiornamento di log e scenario test.
- Aggiornamento orari nel log-operativo in fase di chiusura milestone: devono essere coerenti, progressivi, e corrispondere ai commit.
- Dopo la chiusura di una milestone, crea subito la milestone successiva.

## Struttura file attuale

- `/app/api/pacchetti/route.js` — CRUD pacchetti ore (JS puro)
- `/src/lib/prisma.js` — Prisma client singleton (JS puro)
- `/LOG_OPERATIVO.md` — log operativo con timestamp, scenario test
- `/README.md` — scenario test CRUD e descrizione endpoints
- `/STANDARD_OPERATIVO.md` — regole vincolanti aggiornate

## Scenario test manuale CRUD aggiornato

1. **GET:**  
    ```sh
    curl http://localhost:3000/api/pacchetti
    ```
2. **POST:**  
    ```sh
    curl -X POST http://localhost:3000/api/pacchetti -H "Content-Type: application/json" -d "{\"clienteId\":35,\"descrizione\":\"Pacchetto prova\",\"oreAcquistate\":10,\"oreResidue\":10,\"dataAttivazione\":\"2025-08-17T21:00:00.000Z\",\"stato\":\"attivo\"}"
    ```
3. **PATCH:**  
    ```sh
    curl -X PATCH http://localhost:3000/api/pacchetti -H "Content-Type: application/json" -d "{\"id\":1,\"descrizione\":\"Pacchetto modificato\",\"oreResidue\":5}"
    ```
4. **DELETE:**  
    ```sh
    curl -X DELETE http://localhost:3000/api/pacchetti -H "Content-Type: application/json" -d "{\"id\":1}"
    ```

## Note operative

- In debug, fornire sempre file completi.
- Se ci sono rischi di duplicati (es. file simili in JS/TS), segnalare.
- Aggiornare README.md e questo file a ogni cambiamento strutturale o di scenario test.
- Per la chiusura milestone, controllare coerenza e progressività dei timestamp nel log-operativo.

## [2025-08-17 23:20 UTC+2] - Integrazione gestione pacchetti in dettaglio cliente

- Creato componente `PacchettiClienteList.jsx` in `src/components/clienti/` per visualizzare e gestire i pacchetti associati ad un cliente, con funzioni CRUD e collegamento alle API esistenti.
- Integrato il nuovo componente come sezione aggiuntiva all’interno di `ClienteDettaglioModal.jsx`.
- Aggiornata la struttura della vista dettaglio cliente secondo le regole di separazione e riusabilità.
- Effettuata verifica assenza di duplicati prima della creazione del nuovo file.
- Aggiornata STANDARD_OPERATIVO.md e README.md dopo la modifica strutturale.
# STANDARD OPERATIVO E FORMATTAZIONE (VINCOLANTE)

...

## Policy VINCOLANTE – Checklist di chiusura issue/milestone (2025-08-19 01:30 UTC+2)

- **Compilazione checklist:**  
  Le checklist di chiusura delle issue e delle milestone DEVONO essere compilate solo dopo aver verificato:
  1. Che tutte le task siano effettivamente implementate nel codice e/o nella documentazione.
  2. Che ci sia riscontro nei commit, nel LOG_OPERATIVO.md (con scenario test e orario), nei file README.md e in ogni file coinvolto.
  3. Che sia presente uno scenario test manuale, superato e riportato nel log.

- **Divieto di checklist “simulate” o “presunte”:**  
  NON è consentito spuntare task come completate senza verifica oggettiva di codice, log, file e scenario test.

- **Segnalazione e sospensione in caso di dubbio:**  
  In caso di dubbio sull’effettivo completamento di una task, la checklist va sospesa e va segnalato il dubbio in chat/documentazione.  
  La chiusura della issue/milestone va rimandata finché non c’è riscontro oggettivo.

- **Audit periodico e controllo retroattivo:**  
  Almeno una volta a milestone (o su richiesta), eseguire un audit delle checklist chiuse:
    - Verificare presenza di commit, log, scenario test e documentazione per ogni task segnata come completata.
    - In caso di discrepanze, correggere log e checklist e segnalare l’errore nei file di progetto.

- **Comandi di ricerca consigliati per audit:**

  CMD:
  ```
  findstr /spin "chiusa closed checklist" LOG_OPERATIVO.md
  findstr /spin "alert notification email soglia" src\* app\* README.md 
  
  # STANDARD_OPERATIVO.md
  ```

  PowerShell:
  ```
  Select-String -Path LOG_OPERATIVO.md -Pattern "chiusa|closed|checklist"
  Select-String -Path src\* -Pattern "alert|notification|email|soglia"
  Select-String -Path app\* -Pattern "alert|notification|email|soglia"
  Select-String -Path README.md -Pattern "alert|notification|email|soglia"
  Select-String -Path STANDARD_OPERATIVO.md -Pattern "alert|notification|email|soglia"
  ```

- **Documentazione e aggiornamento:**  
  Dopo ogni audit, riportare nel LOG_OPERATIVO.md:
    - Orario e outcome dell’audit
    - Eventuali discrepanze trovate e azioni correttive
    - Riferimento agli orari e ai commit delle checklist revisionate

...

## [2025-08-19] – Policy milestone alert soglia/esaurimento pacchetti

(Questa sezione è stata aggiornata e integrata con la nuova policy checklist)

...
# STANDARD OPERATIVO

...

## Regole vincolanti per le modali

- **Rendering condizionale modali**: Ogni componente modale deve essere renderizzato solo se la variabile di stato che ne controlla i dati (`dettaglioCliente`, ecc.) è valorizzata (non null/undefined).  
  Questo previene la comparsa di overlay/modal vuoti o in stato di caricamento quando nessun dato è selezionato dall’utente.
- Ad ogni modifica strutturale che coinvolge la UI o la logica di apertura/chiusura modali, aggiornare il presente file e il log-operativo.

...

# STANDARD OPERATIVO

...

## Regole anti-doppioni e milestone

- Prima di creare/modificare qualsiasi file o componente, verificare SEMPRE l’assenza di doppioni (.js/.tsx, src/ vs app/).
- Non devono mai coesistere file simili in percorsi diversi (layout.tsx/js, Alert.js/tsx, ecc).
- Directory di riferimento per l’applicativo: root principale (app/) e NON src/.
- Ogni attività che modifica/aggiunge file va tracciata in LOG_OPERATIVO.md con orario UTC+2.
- Gli errori di duplicazione e percorso rilevati (es. layout.tsx/js, uso improprio src/) sono bloccanti e devono essere evitati.
- Dopo ogni milestone, controllare coerenza timestamp log e archiviare milestone solo dopo verifica.
- Scenario test/manuale obbligatorio per ogni feature/bugfix.
- Dopo chiusura milestone, creare subito nuova milestone per la fase successiva (fase 4).

...

# STANDARD OPERATIVO - Provider dati, mock e prevenzione errori

## Policy su file mock e provider dati
- Qualsiasi file mock (es: `src/lib/pacchetti.mock.js`) va marcato chiaramente come deprecato.
- Non deve MAI essere importato da nessuna route API reale in `app/api/pacchetti/*`.
- Ogni nuova route deve essere implementata direttamente su Prisma.
- Prima del commit, lancia SEMPRE i comandi ricerca "from @/lib/pacchetti" e "mock" sulle route API.

## Naming e cartelle
- I file mock deprecati vanno spostati in `src/lib/legacy/` oppure rinominati con `.mock.js`.
- Nessun file in `/legacy/` o con `.mock.js` va mai usato in produzione.

## Scenario test manuale
1. CRUD completo da UI e Postman.
2. Check logs: assenza di warning/errore "mock", "params", "tmp_pacchetti.json".
3. Ricerca pattern mock in tutte le route API.

## Policy CI e pre-commit
- Integrare i comandi di check come pre-commit hook (es: Husky) e/o step di CI per bloccare merge accidentali di mock.
# STANDARD OPERATIVO - Provider dati, mock e prevenzione errori

## Policy su file mock e provider dati
- Qualsiasi file mock (es: `src/lib/pacchetti.mock.js`) va marcato chiaramente come deprecato.
- Non deve MAI essere importato da nessuna route API reale in `app/api/pacchetti/*`.
- Ogni nuova route deve essere implementata direttamente su Prisma.
- Prima del commit, lancia SEMPRE i comandi ricerca "from @/lib/pacchetti" e "mock" sulle route API.
- **Regola aggiuntiva:**  
  - Al termine di ogni milestone di migrazione/test, i file mock vanno eliminati o spostati in `__deprecated__` fuori dal path di produzione.
  - Ogni eliminazione va tracciata nel LOG_OPERATIVO.md.

## Naming e cartelle
- I file mock deprecati vanno spostati in `src/lib/legacy/` oppure rinominati con `.mock.js`.
- Nessun file in `/legacy/` o con `.mock.js` va mai usato in produzione.

## Scenario test manuale
1. CRUD completo da UI e Postman.
2. Check logs: assenza di warning/errore "mock", "params", "tmp_pacchetti.json".
3. Ricerca pattern mock in tutte le route API.
4. **Verifica assenza di file mock fuori da cartelle legacy/deprecated.**

## Policy CI e pre-commit
- Integrare i comandi di check come pre-commit hook (es: Husky) e/o step di CI per bloccare merge accidentali di mock.
- Al termine fase migrazione/test, controllare e confermare rimozione file mock.

## STANDARD OPERATIVO - Aggiornamento 2025-08-19 03:00 (UTC+2)

### Funzionalità: Alert soglia/esaurimento pacchetti ore

- Ogni pacchetto può avere una soglia (campo sogliaOreResidue): se le ore residue scendono al di sotto, compare un alert UI in alto, ben visibile.
- L’alert è chiudibile per singolo pacchetto; la logica impedisce duplicazioni simultanee.
- La soglia può essere lasciata vuota/nulla per disattivare l’alert su un pacchetto.
- È possibile estendere la logica per una soglia globale (al momento non implementata).
- L’invio email è opzionale e non implementato.
- Tutti i test manuali richiesti sono descritti nel LOG_OPERATIVO.md.

# STANDARD OPERATIVO

## Regole vincolanti

- Ogni modifica strutturale va documentata in questo file e in README.md.
- Dopo ogni aggiunta di feature nella UI, aggiornare lo scenario test/manuale e le istruzioni operative.
- I log operativi DEVONO riportare orario UTC+2 e seguire l’ordine richiesto (dal più recente al più vecchio).

## Scenario test/manuale aggiornato

### Modifica/Elimina pacchetto da UI

1. Accedere alla sezione pacchetti.
2. Per ogni riga, cliccare “Modifica”:
   - Si apre una modale con i dati precompilati.
   - Modificare almeno un campo e salvare.
   - Verificare che la tabella si aggiorni e che la modifica sia persistente via GET API.
   - Testare annullamento della modale (nessuna modifica deve essere applicata).
3. Per ogni riga, cliccare “Elimina”:
   - Si apre la modale di conferma.
   - Confermare eliminazione.
   - Verificare che la riga scompaia e che la cancellazione sia persistente via GET API.
   - Testare annullamento della conferma (nessuna cancellazione deve avvenire).
4. Simulare errori di rete/API e verificare la gestione degli errori nella UI.

## Istruzioni operative aggiornate

- Dopo ogni patch UI che modifica la struttura dei componenti o la UX, aggiornare README.md e LOG_OPERATIVO.md.
- Segnalare sempre in chat eventuali omissioni o rischi di duplicato.

- `app/api/auth/[...nextauth]/authOptions.ts` – configurazione NextAuth centralizzata
- `app/api/auth/[...nextauth]/route.js` – handler NextAuth
- `app/api/pacchetti/alert-letto/route.js` – API alert pacchetti

```diff
## 2025-08-22 21:50 UTC+2 — Integrazione AuthGuard per tutte le pagine admin protette

- Creato nuovo componente `app/components/AuthGuard.js`, DRY e centralizzato.
- Aggiornate tutte le pagine admin (`/clienti/page.js`, `/pacchetti/page.js`, `/dashboard/page.js`, `/page.js`) con wrapper `<AuthGuard>` e `<Navbar>`.
- Nessuna modifica a backend o logica NextAuth; nessun impatto su pagine pubbliche o signin.
- Scenario test manuale e comandi push sempre aggiornati in README.md.
```

# STANDARD OPERATIVO – Aggiornamento 2025-08-22

## Regole fondamentali

- Non creare più file o fix in `src/components/clienti`, `src/components/pacchetti`, `src/utils/clienti`.
- Tutti i componenti e moduli migrati vanno gestiti **esclusivamente** in `app/components` e `app/utils`.
- Dopo ogni refactor strutturale, eliminare i doppioni da `src/` e aggiornare README/log.
- Ad ogni modifica strutturale, aggiornare questo file e README.md segnalando la struttura corrente e regole di lavoro.
- In caso di rischio duplicati o confusione per path legacy, segnalare subito in chat e NON procedere fino a chiarimento.
- Ogni build/test dopo refactor deve essere seguito da scenario test manuale come descritto in README.
- Alla chiusura milestone, verificare che nessun file migrato sia rimasto in src/components o src/utils.

## Struttura corrente (post-migrazione 2025-08-22)

- Tutti i componenti clienti e pacchetti sono in `app/components/`
- Tutti gli utils migrati sono in `app/utils/`
- Le cartelle `src/components/clienti`, `src/components/pacchetti`, `src/utils/clienti` sono da considerarsi obsolete e non vanno più toccate.

---
# STANDARD OPERATIVO – Gestionale Recuperiamo

---

## Principi vincolanti

- **Struttura di riferimento:**  
  L’unica fonte valida per la struttura della repo è **MAPPA_STRUTTURA_PROGETTO.md**.  
  Ogni modifica strutturale (aggiunta, eliminazione, spostamento di cartelle/file chiave) impone l’aggiornamento di questo file, oltre che di README.md e LOG_OPERATIVO.md.
- **Root logica:**  
  Tutta la logica (UI, API, layout, shared code) è in `/app/`.  
  È vietato creare o usare `/src/` o altre strutture “legacy”.
- **Documentazione**  
  - **MAPPA_STRUTTURA_PROGETTO.md** — unica mappa aggiornata e con legenda della struttura.
  - **LOG_OPERATIVO.md** — log reverse order, con timestamp UTC+2.
  - **README.md** — solo riferimenti a file reali; non includere più visioni teoriche o bozze disallineate.

---

## Regole di processo

- Dopo ogni modifica strutturale, aggiorna SEMPRE:
    - MAPPA_STRUTTURA_PROGETTO.md
    - README.md
    - STANDARD_OPERATIVO.md
    - LOG_OPERATIVO.md
- Elimina ogni riferimento a `/src/` e a documenti di vision/bozza non più allineati.
- Ogni modifica che introduce/rimuove directory “core” va discussa e concordata in chat.
- **Verifiche periodiche:**
    - Cerca file duplicati/simili prima di proporre nuovi componenti o path.
    - Dopo ogni push, verifica che la struttura reale coincida con la mappa riportata.

---

## Debug e test

- **Scenario test integrità struttura:**  
  Vedi README.md per lo scenario manuale aggiornato.
- **Comandi di ricerca**:  
  Consulta sempre la sezione “comandi di debug” in chat per trovare file, directory o duplicati.

---

Ultimo aggiornamento: 2025-08-22 22:35 (UTC+2)

## Struttura progetto

- `app/`: pagine, API locali, layout principali (Next.js app router).
- `components/`: componenti React riusabili.
- `fetcher/`: funzioni per chiamate API lato frontend.
- `lib/`: helpers, utility e codice condiviso.
- `models/`: modelli dati e logica di dominio.
- `utils/`: utilities e helpers generici.
- `public/`: risorse statiche condivise.

## Regole base

- Aggiorna SEMPRE README.md e LOG_OPERATIVO.md dopo ogni modifica strutturale.
- Dopo ogni modifica alla struttura aggiorna anche questo file, indicando la sezione aggiornata.
- Tutte le operazioni, revisioni e fix devono essere tracciate nel LOG_OPERATIVO.md con data/ora UTC+2.
- Fornisci sempre scenario test/manuale per ogni milestone o modifica strutturale.

## Workflow commit & branch

- Lavora su branch feature o fix quando possibile.
- Descrivi ogni commit in modo chiaro, indicando se si tratta di refactor, fix, feature, docs, test.
- Dopo ogni milestone chiusa, verifica la coerenza e progressività degli orari nel log operativo.
- Crea subito una nuova milestone per la fase successiva dopo la chiusura di quella attuale.

## Naming & convenzioni

- Cartelle e file in lower-case separati da trattino (`-`) o camelCase.
- Componenti React: PascalCase.
- Funzioni e variabili: camelCase.
- Modelli dati: PascalCase.

## Scenario test/manuale

1. Verifica che la struttura delle cartelle sia conforme a quanto sopra.
2. Controlla che README.md, LOG_OPERATIVO.md e questo file siano coerenti tra loro.
3. Effettua una ricerca di eventuali riferimenti obsoleti a `/src/`.
4. Valida la build e il funzionamento del gestionale.

# STANDARD OPERATIVO E FORMATTAZIONE (VINCOLANTE)

...

## Regole vincolanti (aggiornamento: 2025-08-23 01:41 UTC+2)

- Tutto il codice applicativo (UI, API, componenti, moduli) deve essere sotto la cartella `/app` (root logica e tecnica).
- Non è più consentito l’uso di `/src` per codice, componenti, moduli o utilità. Qualsiasi file residuo in `/src` va eliminato.
- I test automatici sono gestiti nella cartella `/tests`, con struttura libera e scalabile (es: `/tests/components/clienti/`).
- File di configurazione (Next.js, Tailwind, Prisma, ecc.) e documentazione (README.md, STANDARD_OPERATIVO.md, LOG_OPERATIVO.md, MAPPA_STRUTTURA_PROGETTO.md) risiedono in root.
- Segui sempre la struttura e la legenda di MAPPA_STRUTTURA_PROGETTO.md. Aggiorna questo file e la mappa dopo ogni modifica strutturale.
- Policy anti-doppioni: prima di ogni chiusura milestone ed ogni nuova feature, esegui SEMPRE il controllo file duplicati (vedi comandi in README.md e sotto).
- Qualsiasi anomalia, variazione o rischio di duplicato va documentato in LOG_OPERATIVO.md e risolto prima della milestone successiva.
- Ogni modifica a README.md, STANDARD_OPERATIVO.md, o file strutturali, DEVE essere riportata nel log con timestamp UTC+2, scenario test e lista file coinvolti.
- Dopo ogni modifica strutturale: aggiorna README.md, STANDARD_OPERATIVO.md, LOG_OPERATIVO.md, MAPPA_STRUTTURA_PROGETTO.md.

...

## Policy struttura e aggiornamento directory

- Root codice: `/app/`
- Test automatici: `/tests/` (con struttura libera, es: `/tests/components/clienti/`)
- Configurazione e documentazione: solo in root
- Cartella `/src`: **VIETATA** per qualsiasi nuovo codice, componente, modulo, utilità.
- Dopo ogni refactor eliminare eventuali residui in `/src` e aggiorna la documentazione.
- Dopo ogni modifica, controlla che la struttura reale coincida con la mappa e aggiorna tutti i file di processo.

...

## Regole anti-doppioni

- Prima di proporre o creare nuovi file/componenti, controlla SEMPRE se esiste già un file con nome simile (anche con estensione diversa) nella repo o nei path coinvolti.
- Esegui sempre, prima di ogni milestone e dopo ogni refactor strutturale, il controllo:
  ```powershell
  Get-ChildItem -Recurse -File | Group-Object Name | Where-Object { $_.Count -gt 1 } | Select-Object -ExpandProperty Name
  ```
- Se sono presenti doppioni, risolvi e documenta nel LOG_OPERATIVO.md.
- Se la lista è vuota, annota nel log che la repo è pulita.
- Dopo ogni refactor elimina i doppioni residui da `/src` o altre cartelle dismesse.

...

## Policy test automatici

- Tutti i test sono in `/tests/`, con struttura libera e scalabile.
- Esegui i test con `npm test` e assicurati che tutti passino prima di push.
- Aggiorna README.md, STANDARD_OPERATIVO.md, LOG_OPERATIVO.md dopo ogni modifica a questa struttura.
- Non lasciare test annidati in vecchie directory (`src/components/__tests__` o simili).

...

## Scenario test/manuale struttura e duplicati

1. Esegui il controllo duplicati file (vedi comando sopra).
2. Verifica che la cartella `/src` sia assente o vuota.
3. Verifica che tutti i test siano in `/tests` e vengano eseguiti correttamente.
4. Aggiorna log e documentazione dopo ogni modifica.

...

## Struttura attuale (2025-08-23)

- `/app`: entrypoint unico, tutte le route, componenti, API, shared code.
- `/tests`: test automatici (es: `/tests/components/clienti/`)
- `/public`: asset statici
- `/prisma`: schema e migrazioni Prisma
- File di configurazione/doc root: `README.md`, `STANDARD_OPERATIVO.md`, `LOG_OPERATIVO.md`, `MAPPA_STRUTTURA_PROGETTO.md`, ecc.

...

## Regole di commit, milestone, log

- Dopo ogni modifica strutturale, aggiorna tutti i file di processo e la mappa.
- Alla chiusura di ogni milestone, verifica coerenza, progressività e presenza di timestamp UTC+2 nel log.
- Crea subito una nuova milestone dopo la chiusura della precedente.

...

Ultimo aggiornamento: 2025-08-23 02:00 UTC+2

## Scenario test/manuale milestone 5 – CRUD attività

1. POST `/api/attivita` → crea attività, aggiorna pacchetto
2. PATCH `/api/attivita` → aggiorna attività, aggiorna ore residue pacchetto
3. DELETE `/api/attivita` → elimina attività, ripristina ore residue pacchetto
4. GET `/api/attivita` e `/api/attivita?id=ID` → verifica stato attività e pacchetto
5. Edge-case: dati non validi/id errato → errore gestito, doppio inserimento crea record separati
6. Ripetere con pacchetti/attività diversi, verificare coerenza dati

## Scenario test/manuale milestone 5 – UI attività

1. Creare/modificare/eliminare attività da UI (`/attivita`)
2. Selezionare correttamente pacchetto e cliente (form con select, validazione)
3. Filtrare attività per cliente/pacchetto/data nella lista
4. Edge-case: attività senza pacchetto, errori validazione UI (form/feedback)
5. Navigazione dettagliata, azioni da tabella (modifica/elimina)
6. Ripetere con pacchetti/attività diversi, verificare coerenza dati

---
