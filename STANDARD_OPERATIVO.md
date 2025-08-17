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