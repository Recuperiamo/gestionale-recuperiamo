# Gestionale Pacchetti Ore

## Descrizione
Applicazione web per la gestione dei pacchetti ore, sviluppata in Next.js 15, TypeScript e Tailwind CSS.

---

## Struttura del progetto (2025-08-15)

- **src/**  
  Codice applicativo principale (componenti, modelli, fetcher, utils, ecc.).
- **public/**  
  File statici e asset pubblici.
- **package.json / package-lock.json**  
  Gestione dipendenze e script di progetto.
- **next.config.ts**  
  Configurazione Next.js.
- **eslint.config.mjs**  
  Configurazione ESLint.
- **tsconfig.json**  
  Configurazione TypeScript.
- **postcss.config.mjs**  
  Configurazione PostCSS (necessario per Tailwind).
- **.gitignore**  
  File e cartelle esclusi dal versionamento.
- **README.md**  
  Questo file.
- **next-env.d.ts**  
  File di tipo generato da Next.js per TypeScript. **Versionato** per garantire portabilità tra ambienti.
- **LOG_OPERATIVO.md**  
  Log operativo delle attività di sviluppo e manutenzione.
- **STANDARD_OPERATIVO.md**  
  Linee guida vincolanti per formato, struttura e workflow del progetto.

---

## Policy di versionamento

- **next-env.d.ts**: viene mantenuto sotto versionamento per assicurare l’avvio senza errori su ogni clone.
- **node_modules/**: non viene versionata, va sempre ricreata con `npm install`.
- Ogni modifica strutturale va riportata sia su questo file che su STANDARD_OPERATIVO.md.

---

## Avvio Rapido

1. Clonare il repository
2. Installare le dipendenze:
   ```
   npm install
   ```
3. Avviare il progetto:
   ```
   npm run dev
   ```
4. Accedere a [http://localhost:3000](http://localhost:3000)

---

## Policy di controllo avanzato (CI/CD e log operativo)

- Ogni modifica a README.md, STANDARD_OPERATIVO.md, ONBOARDING_SESSION.md, END_SESSION.md deve essere accompagnata da un aggiornamento contestuale di LOG_OPERATIVO.md nella stessa PR.
- L’ultima entry di LOG_OPERATIVO.md deve sempre contenere:
  - Timestamp con data e ora in formato `[YYYY-MM-DD HH:MM UTC+2]`
  - La versione di STANDARD_OPERATIVO.md applicata (o la data)
  - Una sezione “File coinvolti” che elenchi tutti i file chiave modificati nella PR
  - Una sezione “Scenario Test” che descriva come viene validata manualmente la modifica
- Se una PR modifica README.md o STANDARD_OPERATIVO.md, questi file devono essere presenti anche nella lista “File coinvolti” dell’ultima entry log.
- In assenza di uno qualsiasi di questi vincoli, il workflow CI/CD blocca la PR.

---

## Note

- Segui sempre le procedure dettagliate in STANDARD_OPERATIVO.md.
- Consulta LOG_OPERATIVO.md per la cronologia dettagliata delle operazioni.

# Gestionale Recuperiamo

## Struttura del repository

- Tutto il codice, la documentazione e i file di configurazione si trovano esclusivamente nella cartella `gestionale-recuperiamo`.
- Nessun file di progetto deve essere presente fuori da questa cartella nella root superiore.

## Modalità operativa

- Tutte le operazioni di sviluppo (git, npm, ecc.) vanno eseguite solo all’interno di `gestionale-recuperiamo`.
- Dopo ogni modifica strutturale, vanno aggiornati LOG_OPERATIVO.md, STANDARD_OPERATIVO.md e README.md.

## Test manuale consigliato

1. Da dentro la cartella `gestionale-recuperiamo` eseguire:
   - `npm install`
   - `npm run dev`
   - `git status`
2. Verificare che l’ambiente si avvii senza errori e che non siano presenti warning su lockfile multipli.

## Note

Per qualsiasi modifica alla struttura, seguire quanto definito in STANDARD_OPERATIVO.md.

# Gestionale Pacchetti Ore

## Overview

Repository per la gestione operativa del sistema "Pacchetti Ore" (Next.js, Node, TailwindCSS, ecc).

---

## Struttura della repository

- Tutto il codice e la documentazione si trovano nella cartella `gestionale-recuperiamo`
- Documentazione operativa principale:
  - `LOG_OPERATIVO.md` (cronologia attività, sempre aggiornata)
  - `STANDARD_OPERATIVO.md` (regole operative e di processo)
- File `.gitignore` in root gestisce l’esclusione di file temporanei e output di build

---

## Policy .gitignore

- Viene sempre utilizzato un file .gitignore aggiornato per stack Next.js/Node.
- Sono SEMPRE esclusi: node_modules, directory di build (.next, dist, out), file temporanei (*.log, *.tmp, temp/, tmp/), file di ambiente locali (.env, .env.*, tranne .env.example), output test/coverage, file sistema/OS, file temporanei custom (es: elenco_clonata.txt), scarti editor.
- NON sono mai esclusi: LOG_OPERATIVO.md, STANDARD_OPERATIVO.md, README.md, file di configurazione strategici o deliverable.
- Dopo ogni aggiornamento del .gitignore viene aggiornata anche questa sezione.

---

## Come contribuire

1. Seguire SEMPRE le regole in `STANDARD_OPERATIVO.md`
2. Aggiornare `LOG_OPERATIVO.md` dopo ogni modifica strutturale o operativa
3. Eseguire test manuali ogni volta che viene aggiunta una nuova feature o cambiata la configurazione

---

## Test manuale scenario .gitignore

1. Crea in root i file: test.log, temp.txt, node_modules/fake.js, elenco_clonata.txt.
2. Esegui `git status`: questi file NON devono apparire tra i non tracciati.
3. Modifica README.md: deve apparire tra i file modificati.
4. Elimina i file temporanei di test.
5. Assicurati che nessun file strategico sia escluso dal versionamento.


## Sviluppo locale

### Prerequisiti

- **Node.js** versione 20.x o superiore  
  Verifica la versione con:  
  ```
  node --version
  ```
- **npm** versione 9.x o superiore  
  Verifica la versione con:  
  ```
  npm --version
  ```
- Sistema operativo: Linux, macOS, Windows (testato su tutte le principali piattaforme)
- È consigliato usare un terminale moderno (es: VSCode Terminal, iTerm2, Windows Terminal)

---

### Setup e comandi chiave

1. **Clona il repository**
   ```
   git clone https://github.com/Recuperiamo/gestionale-recuperiamo.git
   cd gestionale-recuperiamo
   ```

2. **Installa le dipendenze**
   ```
   npm install
   ```

3. **Avvia l’ambiente di sviluppo**
   ```
   npm run dev
   ```
   L’applicazione sarà disponibile su [http://localhost:3000](http://localhost:3000)

4. **Build di produzione**
   ```
   npm run build
   ```

5. **Lint del codice**
   ```
   npm run lint
   ```

6. **Esegui i test**
   ```
   npm test
   ```

---

### Risoluzione problemi frequenti

- Se riscontri errori di permessi su Linux/macOS, prova:
  ```
  chmod +x ./node_modules/.bin/*
  ```
- Se `npm install` genera warning su versioni, assicurati che Node.js e npm siano aggiornati.
- Se ricevi errori su file `.env` mancanti, copia eventualmente il file `.env.example` come base:
  ```
  cp .env.example .env
  ```

---

### Scenario test manuale sviluppo locale

1. Clona la repository su una macchina/VM “vergine”.
2. Segui i passi sopra in ordine.
3. Verifica che ogni comando (`npm install`, `npm run dev`, `npm run build`, `npm run lint`, `npm test`) dia esito positivo senza errori bloccanti.
4. Accedi a http://localhost:3000 e verifica che l’app sia funzionante.
5. Se incontri problemi non documentati, aggiorna questa sezione e segnala l’errore nel LOG_OPERATIVO.md.

---
# gestionale-recuperiamo

...

## Testing automatico (Jest + React Testing Library)

Per eseguire i test automatici:

1. Assicurati che siano presenti i file:
    - `jest.config.js`
    - `babel.config.js`
    - cartella `/tests` con almeno un test di esempio (`sample.test.js`)

2. Installa le dipendenze dev richieste (se non già fatto):

   ```
   npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event babel-jest jest-environment-jsdom identity-obj-proxy
   ```

3. Esegui i test:

   ```
   npm test
   ```

### Scenario test manuale

- Modifica/aggiungi un test in `/tests`
- Lancia `npm test`
- Tutti i test devono passare senza errori
- Se modifichi la struttura di test o le dipendenze, aggiorna README.md, STANDARD_OPERATIVO.md e LOG_OPERATIVO.md

...

# Recuperiamo - Gestionale

...

## Stack tecnico autenticazione

Per la milestone 9 è stato adottato il seguente stack per autenticazione e gestione utenti/ruoli:
- **NextAuth.js**: provider autenticazione integrato in Next.js, gestisce sessioni e provider OAuth/credenziali.
- **Prisma ORM**: mapping e gestione schema utenti/ruoli su database.
- **PostgreSQL**: database relazionale per persistenza sicura degli utenti e ruoli.

### Policy autenticazione/ruoli

- Ogni utente ha un ruolo associato (admin, operatore, visualizzatore).
- Le route protette sono accessibili solo in base al ruolo.
- Lo schema utenti/ruoli è definito via Prisma e può essere esteso.
- Tutti i dettagli operativi sono documentati in STANDARD_OPERATIVO.md e LOG_OPERATIVO.md.

### Scenario test manuale milestone 9

1. Verificare la presenza delle dipendenze next-auth, @prisma/client, prisma in package.json.
2. Confermare la documentazione della scelta su README.md e LOG_OPERATIVO.md.
3. Eseguire la procedura di setup descritta in STANDARD_OPERATIVO.md.

...

# Recuperiamo - Gestionale

...

## Stack tecnico autenticazione

Per la milestone 9 è stato adottato il seguente stack per autenticazione e gestione utenti/ruoli:
- **NextAuth.js**: provider autenticazione integrato in Next.js, gestisce sessioni e provider OAuth/credenziali.
- **Prisma ORM**: mapping e gestione schema utenti/ruoli su database.
- **PostgreSQL**: database relazionale per persistenza sicura degli utenti e ruoli.

### Policy autenticazione/ruoli

- Ogni utente ha un ruolo associato (admin, operatore, visualizzatore).
- Le route protette sono accessibili solo in base al ruolo.
- Lo schema utenti/ruoli è definito via Prisma e può essere esteso.
- Tutti i dettagli operativi sono documentati in STANDARD_OPERATIVO.md e LOG_OPERATIVO.md.

### Dipendenze e installazione (milestone 9)

```bash
npm install next-auth @prisma/client prisma
npx prisma init
```

- Le dipendenze devono risultare in `package.json`.
- Dopo `prisma init` è presente la cartella `/prisma` e il file `schema.prisma`.

### Scenario test manuale milestone 9

1. Verificare la presenza delle dipendenze next-auth, @prisma/client, prisma in package.json.
2. Confermare la documentazione della scelta su README.md e LOG_OPERATIVO.md.
3. Eseguire la procedura di setup descritta in STANDARD_OPERATIVO.md.

...

# Recuperiamo - Gestionale

...

## Schema autenticazione e gestione ruoli (Prisma, milestone 9)

Lo schema Prisma include i seguenti modelli:
- **User**: utente applicativo, con relazione obbligatoria a Role, campi NextAuth.js, email unica.
- **Role**: ruoli custom (admin, operatore, visualizzatore), relazione 1:N verso User.
- **Account, Session, VerificationToken**: compatibili NextAuth.js adapter Prisma.

Esempio di relazione: ogni User è associato a un solo Role, ogni Role può avere più User.

### Scenario test/manuale schema utenti/ruoli

1. schema.prisma contiene i modelli User, Role, Account, Session, VerificationToken come sopra.
2. Migrazione completata senza errori con `npx prisma migrate dev --name init_auth`.
3. Tabella Role popolata manualmente o via seed con admin, operatore, visualizzatore.
4. Documentazione aggiornata.

...

# Recuperiamo - Gestionale

...

## Schema autenticazione e gestione ruoli (Prisma, milestone 9)

Lo schema Prisma include i seguenti modelli:
- **User**: utente applicativo, con relazione obbligatoria a Role, campi NextAuth.js, email unica.
- **Role**: ruoli custom (admin, operatore, visualizzatore), relazione 1:N verso User.
- **Account, Session, VerificationToken**: compatibili NextAuth.js adapter Prisma.

Esempio di relazione: ogni User è associato a un solo Role, ogni Role può avere più User.

### Migrazione e popolamento ruoli

#### Comandi (da root progetto):

```bash
npx prisma generate
npx prisma migrate dev --name init_auth
npx prisma studio
```

- Dopo la migrazione, inserire manualmente i ruoli in tabella Role tramite Prisma Studio: admin, operatore, visualizzatore.

### Scenario test/manuale schema utenti/ruoli

1. schema.prisma contiene i modelli User, Role, Account, Session, VerificationToken come sopra.
2. Migrazione completata senza errori con `npx prisma migrate dev --name init_auth`.
3. Tabella Role popolata manualmente o via seed con admin, operatore, visualizzatore.
4. Documentazione aggiornata.

...

## Gestione autenticazione e ruoli (NextAuth.js + Prisma – milestone 9)

- Endpoint NextAuth.js: `/app/api/auth/[...nextauth]/route.js` (conforme architettura Next.js 13+)
- Provider: Credentials (login email/password)
- Adapter: Prisma collegato a User/Role
- La sessione NextAuth include il ruolo (`session.user.role`)
- Policy: solo utenti con ruolo associato possono autenticarsi

### Scenario test/manuale

1. Crea utente nel DB con ruolo associato (admin, operatore, visualizzatore)
2. Login via `/api/auth/signin`
3. Verifica sessione NextAuth con campo ruolo
4. Login negato se manca ruolo o password errata

---
### Pagina di login personalizzata

- /app/auth/signin/page.js: form custom per login email/password, integrato con NextAuth.
- Gestione errori lato client e redirect post-login.
- Lo scenario test prevede login con credenziali valide e non, verifica errori e redirect.

## Login, redirect e gestione ruolo

- Il login via NextAuth ora forza sempre il redirect sulla home `/` dopo l’autenticazione, indipendentemente dal callbackUrl.
- Il ruolo utente (`admin`, `operatore`, ecc.) viene ora letto dalla relazione Prisma e propagato nella sessione JWT NextAuth.
- La dashboard legge `session.user.role` e mostra il ruolo corretto.
- Qualsiasi modifica ai ruoli deve essere fatta da Prisma Studio (tabella `Role` e relazione in `User`).

### Scenario test manuale

1. Avvia Next.js, accedi a `/api/auth/signin`.
2. Effettua login con utente avente ruolo valorizzato su Prisma Studio.
3. Dopo login, verifica che la dashboard mostri il ruolo esatto.
4. Prova login con utente senza ruolo: la dashboard mostra “N/D”.
5. Logout e ripeti con altro utente.

# Gestionale Recuperiamo – Architettura e Primi Passi

Questo progetto adotta una struttura modulare e scalabile.  
Ogni cartella principale (e ogni sottocartella di /src) contiene un file `context.md` che ne spiega scopo, regole operative e best practice.

## Struttura principale

- `/app` – Entry point applicazione, logiche di routing, layout generali.
- `/src` – Codice sorgente core, diviso in:
    - `/components` – Componenti UI riusabili.
    - `/fetcher` – Accesso dati/API.
    - `/utils` – Helper e funzioni condivise.
    - `/models` – Schemi entità e validatori.
- `/public` – Asset statici e documenti pubblici.
- `/docs` – Documentazione tecnica e guide.
- `/tests` – Test automatici/unitari.
- `/scripts` – Script di supporto e automazioni.
- `/.github` – Workflow, template, check operativi.

Consulta ogni `context.md` per dettagli di utilizzo delle singole aree.

## Regole operative

- Aggiorna sempre il `LOG_OPERATIVO.md` e il presente file dopo ogni cambio strutturale.
- Non lasciare codice core al di fuori di `/src`.
- Ogni cartella nuova deve includere un proprio `context.md`.

# Gestionale Recuperiamo – Architettura e Primi Passi

Questo progetto adotta una struttura modulare e scalabile.  
Ogni cartella principale (e ogni sottocartella di /src) contiene un file `context.md` che ne spiega scopo, regole operative e best practice.

Sono presenti anche alcuni `context.md` extra (ad esempio in root o in cartelle non standard come `_app`): sono ammessi finché non interferiscono con la logica del progetto e possono servire come documentazione supplementare.

## Struttura principale

- `/app` – Entry point applicazione, logiche di routing, layout generali.
- `/src` – Codice sorgente core, diviso in:
    - `/components` – Componenti UI riusabili.
    - `/fetcher` – Accesso dati/API.
    - `/utils` – Helper e funzioni condivise.
    - `/models` – Schemi entità e validatori.
- `/public` – Asset statici e documenti pubblici.
- `/docs` – Documentazione tecnica e guide.
- `/tests` – Test automatici/unitari.
- `/scripts` – Script di supporto e automazioni.
- `/.github` – Workflow, template, check operativi.

Consulta ogni `context.md` per dettagli di utilizzo delle singole aree.

## Regole operative

- Aggiorna sempre il `LOG_OPERATIVO.md` e il presente file dopo ogni cambio strutturale.
- Non lasciare codice core al di fuori di `/src`.
- Ogni cartella nuova deve includere un proprio `context.md`.
- I file `context.md` extra sono ammessi se non creano conflitti e vengono documentati in README.md e STANDARD_OPERATIVO.md.


### Note operative

- Aggiorna LOG_OPERATIVO.md ogni volta che questa sezione viene modificata.
- Se aggiungi nuovi comandi/script, documentali qui e aggiorna STANDARD_OPERATIVO.md.
---

# Dummy commit per test workflow CI/CD - 2025-08-16

# gestionale-recuperiamo

## Struttura progetto (2025-08-16)

- Il progetto utilizza Next.js con architettura “app router”.
- **Tutte le pagine** si trovano ora nella cartella `app/` direttamente in root.
- Non esiste più alcuna cartella `src/app`: tutte le route devono essere create come sottocartelle di `app/`.
- Esempio struttura aggiornata:
  ```
  app/
    page.js
    signin/
      page.js
    dashboard/
      page.js
    profile/
      page.js
    settings/
      page.js
    not-found/
      page.js
  src/
    components/
    utils/
    ... (altri moduli non di routing)
  ```
- Ogni sottocartella di `app/` con un file `page.js` corrisponde ad una route.

## Policy operative

- Ogni modifica strutturale va tracciata in LOG_OPERATIVO.md (con UTC+2).
- STANDARD_OPERATIVO.md indica le regole vincolanti di contributo e gestione.
- Per ogni nuovo gruppo di pagine, creare prima la struttura e solo poi inserire i contenuti.

## Avvio sviluppo

```bash
npm install
npm run dev
```

## Debug e manutenzione

- In caso di problemi di routing, verificare sempre che tutte le pagine siano in `app/` root.
- Non creare mai una nuova `src/app`.

---

# gestionale-recuperiamo

## Struttura progetto (2025-08-16)

- Il progetto utilizza Next.js con architettura “app router”.
- **Tutte le pagine** si trovano nella cartella `app/` direttamente in root.
- Non esiste più alcuna cartella `src/app`: tutte le route devono essere create come sottocartelle di `app/`.
- Esempio struttura aggiornata:
  ```
  app/
    page.js              // Dashboard/Home
    signin/
      page.js
    dashboard/           // (alias: home)
    profile/
      page.js
    settings/
      page.js
    not-found/
      page.js
    components/
      Navbar.js
  src/
    components/
    utils/
    ... (altri moduli non di routing)
  ```
- Ogni sottocartella di `app/` con un file `page.js` corrisponde ad una route.
- Navbar comune su tutte le pagine principali (tranne 404), colori coerenti con brand.

## Policy operative

- Ogni modifica strutturale va tracciata in LOG_OPERATIVO.md (con UTC+2).
- STANDARD_OPERATIVO.md indica le regole vincolanti di contributo e gestione.
- Per ogni nuovo gruppo di pagine, creare prima la struttura e solo poi inserire i contenuti.

## Avvio sviluppo

```bash
npm install
npm run dev
```

## Debug e manutenzione

- In caso di problemi di routing, verificare sempre che tutte le pagine siano in `app/` root.
- Non creare mai una nuova `src/app`.

---# gestionale-recuperiamo

## Struttura progetto (2025-08-16)

- Il progetto utilizza Next.js con architettura “app router” e autenticazione via NextAuth.js (provider credenziali).
- Tutte le pagine si trovano nella cartella `app/` direttamente in root.
- **API route** per autenticazione: `/app/api/auth/[...nextauth]/route.js`
- Pagine principali:
  - `/` (Dashboard/Home) → protetta, visibile solo se autenticati
  - `/signin` → login NextAuth.js (mock utente: mario.rossi@email.it / test1234)
  - `/profile` → visibile solo se autenticati, mostra dati utente dalla sessione
  - `/settings` → visibile solo se autenticati
  - `/not-found` → pagina 404 custom (accesso libero)
- Navbar comune su tutte le pagine principali (tranne 404), con login/logout dinamico.
- Sessione persistente e callback JWT/session attive.

## Policy operative

- Ogni modifica strutturale o di autenticazione va tracciata in LOG_OPERATIVO.md (con UTC+2).
- STANDARD_OPERATIVO.md indica le regole vincolanti di contribuzione.
- Per ogni nuova feature, vanno aggiornati i test manuali in README e log.

## Avvio sviluppo

```bash
npm install
npm run dev
```

## Debug e manutenzione

- Verifica sempre che API route NextAuth (`app/api/auth/[...nextauth]/route.js`) sia correttamente configurata.
- In caso di problemi di routing/autenticazione, controlla che tutte le pagine siano in `app/` root e la sessione NextAuth sia attiva.
- Non creare mai una nuova `src/app`.

## Scenario test manuale (autenticazione)

1. Avvia il server Next.js (`npm run dev`).
2. Accedi a `/signin`, esegui login con:
   - Email: mario.rossi@email.it
   - Password: test1234
3. Verifica che la sessione sia stabile e le pagine protette siano accessibili.
4. Esegui logout dalla navbar, verifica che torni a `/signin` e la sessione sia terminata.
5. Consulta LOG_OPERATIVO.md per data e orario degli step.
# Gestionale Pacchetti Ore – Recuperiamo

...

## Sviluppo e gestione database (Prisma)

1. Modifica lo schema in `prisma/schema.prisma`
2. Ogni volta che modifichi lo schema, esegui:

    ```
    npx prisma generate
    ```

    **Nota:**  
    Questo comando va eseguito ogni volta che cambi lo schema Prisma, o se sposti/ricrei la cartella `node_modules`.

3. Poi crea/aggiorna il DB con:

    ```
    npx prisma migrate dev
    ```

...
# Funzionalità Ruoli e Protezione Accessi (2025-08-17)

## Protezione dashboard
- Solo utenti con ruolo `admin` possono accedere a `/` (dashboard).
- Utenti autenticati ma non admin vengono reindirizzati su `/profilo` sia lato server (middleware.js) che lato client (React).

## Pagina profilo
- Pagina `/profilo` accessibile a tutti gli utenti autenticati.
- Serve come landing page post-login per operatori/visualizzatori.

## Navbar
- Link “Dashboard” visibile solo ad admin.
- Link “Profilo” visibile a tutti gli utenti autenticati.

## Redirect post-login
- Admin → `/`
- Altri ruoli → `/profilo`

## Scenario test manuale
1. Login admin: atterra su `/`, vede link “Dashboard” e “Profilo”.
2. Login operatore/visualizzatore: atterra su `/profilo`, NON vede “Dashboard”, vede solo “Profilo”.
3. Forzare `/` con ruolo non admin: redirect su `/profilo`.
4. Logout/login con ruolo diverso: comportamento coerente.
---
# Gestionale Recuperiamo

## Modello dati Clienti

| Campo           | Tipo     | Obbligatorio | Validazione                | Note                                    |
|-----------------|----------|--------------|----------------------------|-----------------------------------------|
| id              | int/uuid | Sì (auto)    | Unico, autoincrement/uuid  | Gestito dal sistema                     |
| nome_referente  | string   | Sì           | Non vuoto                  |                                         |
| email           | string   | Sì           | Formato email, non vuoto   |                                         |
| telefono        | string   | No           | Formato base               |                                         |
| codice_fiscale  | string   | No           | Formato CF IT se presente  | Unicità se presente                     |
| partita_iva     | string   | No           | Formato PIVA IT se presente| Unicità se presente                     |
| indirizzo       | string   | No           |                            |                                         |
| note            | string   | No           |                            | Campo libero, opzionale                 |

### Validazioni e regole
- `nome_referente` e `email` sono SEMPRE obbligatori e non possono essere vuoti.
- Se forniti, `codice_fiscale` e/o `partita_iva` devono essere unici e validi nel formato.
- Email: formato valido (es. regex).
- Telefono: controllo base se fornito (es. solo cifre, lunghezza minima).

---

## Scenario test manuale CRUD clienti

1. Inserire cliente con nome ed email validi: successo e presenza in lista.
2. Inserire cliente senza nome o senza email: errore obbligatorietà.
3. Inserire cliente con CF o PIVA già esistenti (se presenti): errore di duplicato.
4. Inserire cliente con CF e/o PIVA non validi: errore di validazione formato.
5. Aggiornare cliente modificando nome/email: successo.
6. Eliminare cliente: non più presente in lista.
7. Richiedere lista/dettaglio: dati sempre coerenti.
8. Inserire cliente con tutti i campi opzionali riempiti: successo.