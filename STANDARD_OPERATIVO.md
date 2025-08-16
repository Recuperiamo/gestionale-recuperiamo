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

---