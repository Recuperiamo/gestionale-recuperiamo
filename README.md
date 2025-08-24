# Gestionale Pacchetti Ore

## Descrizione
Applicazione web per la gestione dei pacchetti ore, sviluppata in Next.js 15, TypeScript e Tailwind CSS.

---
## Regole operative fondamentali

- La mappa della struttura del progetto (MAPPA_STRUTTURA_PROGETTO.md) va SEMPRE aggiornata e fornita come file completo, mai come patch o estratto, dopo ogni modifica strutturale.
- Dopo ogni modifica strutturale aggiorna anche STANDARD_OPERATIVO.md e README.md.
- Tutti gli orari nel LOG_OPERATIVO.md devono essere in formato UTC+2, progressivi e coerenti.
- Prima di creare nuovi file o componenti, controllare attentamente che non ne esistano già con nome simile.

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

# Gestionale Recuperiamo – Backend API

## Endpoints attivi (Next.js App Router + Prisma)

- `POST   /api/clienti` – Crea cliente
- `GET    /api/clienti` – Lista clienti
- `PUT    /api/clienti` – Modifica cliente
- `DELETE /api/clienti` – Elimina cliente
- `GET    /api/clienti/:id` – **Dettaglio singolo cliente** (NEW, vedi `/app/api/clienti/[id]/route.js`)

## Note strutturali
- Tutti gli endpoint sono in `app/api/clienti/` (e sottocartelle).
- L’endpoint di dettaglio è implementato in `/app/api/clienti/[id]/route.js` e utilizza Prisma per il recupero puntuale tramite chiave primaria numerica.
- Vedere `STANDARD_OPERATIVO.md` per policy di log, timestamp e milestone.

## Scenario test manuale consigliato
1. Crea cliente (POST).
2. Ottieni lista (GET).
3. Recupera dettaglio (GET /:id).
4. Modifica cliente (PUT) e verifica dettaglio.
5. Elimina cliente (DELETE) e verifica dettaglio (404).

## Policy confronto struttura reale vs. architettura ideale

**IMPORTANTE – Ogni volta che si creano/modificano cartelle e componenti:**

- Confronta SEMPRE la struttura reale della repository con il file `ARCHITETTURA_CARTELLE_BOZZA.md` (che rappresenta la visione architetturale ideale del progetto).
- Ogni differenza, miglioramento, refactor o scostamento rispetto al modello ideale deve essere documentato in `LOG_OPERATIVO.md`, spiegando motivazione e impatto.
- Se la modifica è strutturale, aggiorna anche `README.md` e `STANDARD_OPERATIVO.md`.
- In caso di dubbio, fornisci a Copilot il file architetturale, oppure Copilot confronterà autonomamente la repo con la bozza.
- **Non aggiornare la bozza architetturale per micro-evoluzioni:** aggiornarla solo in caso di revisione strategica o cambi di roadmap.
- Questo confronto facilita la coerenza di lungo periodo e l’onboarding di nuovi sviluppatori.

...

## Policy verifica file esistenti prima di nuove creazioni

**OBBLIGATORIO – Evitare duplicati e conflitti:**
- Prima di proporre o creare un nuovo file (soprattutto componenti, pagine, utility):
  - Verifica sempre se esiste già un file con lo stesso nome (anche con estensione diversa come .js/.jsx/.ts/.tsx) nella stessa directory o in directory affini.
  - In caso di dubbio, chiedi sempre conferma all’autore o esegui una ricerca nell’intera repository.
  - Segnala e documenta nel LOG_OPERATIVO.md qualsiasi anomalia, rischio di duplicazione o necessità di refactor.
  - Integra sempre la verifica di eventuali file duplicati negli scenari di test manuale.

  # gestionale-recuperiamo

Gestionale per la gestione pacchetti ore clienti.

## Regole operative fondamentali

- Segui SEMPRE le regole vincolanti e gli scenari test manuali definiti in `STANDARD_OPERATIVO.md`.
- Prima di proporre o aggiungere nuovi file/componenti, esegui SEMPRE una ricerca di possibili file già esistenti con nome simile (anche con estensione diversa) su tutta la repo.
- **Prima di ogni chiusura milestone è OBBLIGATORIO eseguire il controllo file duplicati via PowerShell:**

  ```powershell
  Get-ChildItem -Recurse -File | Group-Object Name | Where-Object { $_.Count -gt 1 } | Select-Object -ExpandProperty Name
  ```
  Se vengono rilevati file doppi, segnalarlo subito nel LOG_OPERATIVO.md e risolvere prima della chiusura milestone.

- Annotare ogni controllo nel LOG_OPERATIVO.md con data, ora (UTC+2), comando usato ed esito.

---

Per dettagli e scenari di test manuale vedi `STANDARD_OPERATIVO.md`.

# Gestionale Recuperiamo

## Funzionalità principali

- Gestione anagrafica clienti: creazione, modifica, eliminazione, dettagli.
- Gestione pacchetti ore, attività, fatturazione.
- **Tabella clienti ora ordinabile per “Nome referente”** (clic sull’intestazione: A→Z, Z→A, reset).
- Ruoli utenti e permessi.
- Dashboard e reportistica.

...
### Dashboard Admin

- Dopo il login come admin, si accede alla Dashboard Admin (`/` - file: `app/page.js`).
- In alto a destra compaiono i bottoni “Profilo” e “Gestione clienti” (quest’ultimo solo per admin).
- “Gestione clienti” porta a `/clienti`.
# README

## Note importanti (ultimo aggiornamento: 2025-08-17 16:44 UTC+2)

- In tutte le componenti React/JSX (in particolare nelle directory app/, app/components/ e simili) è necessario aggiungere sempre `import React from "react";` in testa ai file `.js` e `.jsx` per evitare errori "React is not defined", anche se usi Next.js 13+.
- Nelle API route Next.js (cartella app/api/...), evitare tipizzazione TypeScript inline nei parametri delle funzioni callback. Se necessario, usare `// @ts-nocheck` in testa al file per evitare warning/errori TS non risolvibili.
- Consultare LOG_OPERATIVO.md per la cronologia dettagliata delle modifiche strutturali.
...
# ... [contenuto precedente] ...

## Struttura milestone “Collegamento clienti-pacchetti ore” (2025-08-17)

- Nuovi modelli:
  - `PacchettoOre` (relazione 1:N verso `Client`, onDelete: Cascade)
- Nuove API:
  - CRUD Pacchetti Ore: `app/api/pacchetti/route.js`, `app/api/pacchetti/[id]/route.js`
  - Dettaglio cliente (inclusione pacchetti): `app/api/clienti/[id]/route.js`
- Nuovi componenti React:
  - `src/components/pacchetti/PacchettiList.jsx`
  - `src/components/pacchetti/PacchettoForm.jsx`
- Scenario test manuale:
  1. Creazione cliente
  2. Creazione pacchetto ore associato (API)
  3. Recupero pacchetti per cliente
  4. Visualizzazione in UI
  5. Eliminazione cliente e verifica cascade delete pacchetti
  6. Casi limite (cliente senza pacchetti, dati non validi, update)

  # Gestionale Pacchetti Ore

## Struttura attuale

- API: `/app/api/pacchetti/route.js` — CRUD pacchetti ore (JS puro, compatibile Next.js+Babel)
- Prisma singleton: `/src/lib/prisma.js` — gestione client Prisma senza typecast TS
- Log operativo e standard: `LOG_OPERATIVO.md`, `STANDARD_OPERATIVO.md`

## Endpoints API pacchetti

Tutti i metodi restituiscono oggetti JSON.

- **GET `/api/pacchetti`**  
  Restituisce lista di tutti i pacchetti ore.
- **POST `/api/pacchetti`**  
  Crea un nuovo pacchetto.  
  Richiede payload:
  ```json
  {
    "clienteId": 1,
    "descrizione": "Pacchetto di esempio",
    "oreAcquistate": 10,
    "oreResidue": 10,
    "dataAttivazione": "2025-08-17T21:00:00.000Z",
    "stato": "attivo"
  }
  ```
  Campi opzionali: `note` (String), `dataScadenza` (DateTime ISO).

- **PATCH `/api/pacchetti`**  
  Modifica un pacchetto esistente.  
  Richiede payload:
  ```json
  {
    "id": 1,
    "descrizione": "Nuova descrizione"
  }
  ```
  Puoi aggiornare uno o più campi tra quelli previsti dal modello.

- **DELETE `/api/pacchetti`**  
  Elimina un pacchetto.  
  Richiede payload:
  ```json
  {
    "id": 1
  }
  ```

## Scenario test manuale CRUD

1. **GET**
    ```sh
    curl http://localhost:3000/api/pacchetti
    ```
2. **POST**
    ```sh
    curl -X POST http://localhost:3000/api/pacchetti -H "Content-Type: application/json" -d "{\"clienteId\":35,\"descrizione\":\"Pacchetto prova\",\"oreAcquistate\":10,\"oreResidue\":10,\"dataAttivazione\":\"2025-08-17T21:00:00.000Z\",\"stato\":\"attivo\"}"
    ```
3. **PATCH**
    ```sh
    curl -X PATCH http://localhost:3000/api/pacchetti -H "Content-Type: application/json" -d "{\"id\":1,\"descrizione\":\"Pacchetto modificato\",\"oreResidue\":5}"
    ```
4. **DELETE**
    ```sh
    curl -X DELETE http://localhost:3000/api/pacchetti -H "Content-Type: application/json" -d "{\"id\":1}"
    ```

## Note tecniche

- Solo JS puro per massima compatibilità con Next.js/Babel (SWC disabilitato).
- Tutti i path API devono essere `.js`.
- Il singleton Prisma in `/src/lib/prisma.js` non usa typecast TS.

## Aggiornamento scenario test/manuale/log

Vedi anche `LOG_OPERATIVO.md` per storico operazioni, timestamp UTC+2 e dettagli evolutivi.

## Gestione Pacchetti associati al Cliente

- La vista dettaglio cliente (`ClienteDettaglioModal.jsx`) ora integra la sezione "Pacchetti associati" tramite il componente `PacchettiClienteList.jsx`.
- La componente consente la visualizzazione, aggiunta, modifica e rimozione dei pacchetti collegati al cliente selezionato, interfacciandosi con le API già presenti.
- Per modifiche future, estendere solo il nuovo componente o passare props aggiuntive tramite la modale.

# Gestionale Pacchetti Ore

...

## Funzionalità principali

- Gestione anagrafica clienti (crea, modifica, elimina)
- Visualizzazione dettagli cliente in modale:
  - La modale si apre solo quando un cliente è selezionato.
  - La modale non mostra più schermate di caricamento inattese quando nessun cliente è selezionato.
  - Chiusura modale tramite bottone o click sull’overlay.

...

# Gestionale Recuperiamo

...

## Stato milestone

### Milestone 3 (chiusa il 2025-08-18 02:12 UTC+2)

- Funzionalità: CRUD clienti, validazione form, palette Alert UI conforme a brand.
- Bugfix principali: palette colori Alert (issue #25)
- Scenario test superato (CRUD alert, validazione email/telefono, nessun duplicato file, coerenza struttura).
- Tutti i dettagli e timestamp in LOG_OPERATIVO.md

...

## UI Components

### Alert

- Gli alert rispettano ora la palette brand: verde per successo, rosso per errore (come da design system).
- Testati su tutte le pagine clienti e form.
- Scenario test milestone 3: vedere LOG_OPERATIVO.md.

...

# Gestionale Pacchetti Ore - Standard e Regole Provider Dati

## Regole vincolanti
- Tutte le API route in `app/api/pacchetti/*` DEVONO usare Prisma come unico provider dati.
- È VIETATO importare o usare moduli mock (es. `src/lib/pacchetti.mock.js`) nelle route API reali.
- Il file mock è mantenuto solo come esempio o per test manuali, ma va marcato come deprecato e protetto da uso accidentale.

## Check obbligatori prima di ogni commit/push
1. Lancia i seguenti comandi di ricerca per assicurarti che nessuna route API usi il mock:
    - CMD:
        ```
        findstr /s /n /i "from \"@/lib/pacchetti" app\api\pacchetti\*.js
        findstr /s /n /i "mock" app\api\pacchetti\*.js
        ```
    - PowerShell:
        ```
        Select-String -Path app/api/pacchetti/*.js -Pattern "from \"@/lib/pacchetti"
        Select-String -Path app/api/pacchetti/*.js -Pattern "mock"
        ```
2. Ogni importazione dal mock va rimossa o bloccata.
3. Tutte le operazioni CRUD vanno testate da UI e API per garantirne la coerenza.

## Standard Operativo
- Vedi anche `STANDARD_OPERATIVO.md` per dettagli su milestone, log operativo, policy di merge e naming file deprecati/mock.

## Standard operativo

Vedi file `STANDARD_OPERATIVO.md` per le regole vincolanti di sviluppo, debug e log.

# Gestionale Pacchetti Ore - Standard e Regole Provider Dati

## Regole vincolanti
- Tutte le API route in `app/api/pacchetti/*` DEVONO usare Prisma come unico provider dati.
- È VIETATO importare o usare moduli mock (`src/lib/pacchetti.mock.js` o simili) nelle route API reali.
- I file mock vanno eliminati o spostati in `__deprecated__` appena terminata la fase di test/migrazione.
- La presenza di file mock nel path attivo è consentita solo per la durata della milestone di test/migrazione.

## Check obbligatori prima di ogni commit/push
1. Lancia i seguenti comandi di ricerca per assicurarti che nessuna route API usi il mock:
    - CMD:
        ```
        findstr /s /n /i "from \"@/lib/pacchetti" app\api\pacchetti\*.js
        findstr /s /n /i "mock" app\api\pacchetti\*.js
        ```
    - PowerShell:
        ```
        Select-String -Path app/api/pacchetti/*.js -Pattern "from \"@/lib/pacchetti"
        Select-String -Path app/api/pacchetti/*.js -Pattern "mock"
        ```
2. Ogni importazione dal mock va rimossa o bloccata.
3. Tutti i file mock vanno rimossi o archiviati in `__deprecated__` dopo la fase di test.
4. Tutte le operazioni CRUD vanno testate da UI e API per garantirne la coerenza.

## Standard Operativo
- Vedi anche `STANDARD_OPERATIVO.md` per dettagli su milestone, log operativo, policy di merge, naming file deprecati/mock.

### Alert soglia/esaurimento pacchetti ore

- Alert UI automatico in alto quando le ore residue di un pacchetto scendono sotto la soglia configurata (per-pacchetto).
- La soglia può essere impostata o lasciata vuota/nulla (nessun alert).
- L’alert è chiudibile per pacchetto e si applica solo se la condizione persiste.
- Non è presente alert email né soglia globale (opzionali).
- Scenario test manuale e dettagli nel LOG_OPERATIVO.md.

# gestionale-recuperiamo

## Funzionalità principali

- CRUD pacchetti ore tramite API RESTful.
- Gestione clienti e pacchetti associati.
- Alert automatico per soglia ore residue.
- **Nuovo:** nella tabella pacchetti sono presenti i bottoni “Modifica” ed “Elimina” che permettono azioni dirette sulla riga selezionata.

## Avvio progetto e test

1. Avviare backend e frontend come da istruzioni precedenti.
2. Accedere alla sezione “Pacchetti”.
3. Per ogni riga della tabella sono disponibili:
   - **Modifica:** apre una modale precompilata, consente di aggiornare descrizione, ore residue, soglia.
   - **Elimina:** chiede conferma, elimina il pacchetto e aggiorna la lista.
4. Scenario test/manuale aggiornato:
   - Modificare un pacchetto, salvare, verificare aggiornamento in tabella e via GET.
   - Eliminare un pacchetto, confermare, verificare rimozione in tabella e via GET.
   - Verificare la gestione degli annullamenti e degli errori di rete/API.

## Documentazione tecnica

- Vedi STANDARD_OPERATIVO.md per dettagli su workflow, formato log e regole commit/push.


- **Autenticazione:** NextAuth, credenziali custom e ruoli (admin/user), propagazione user.id e user.role nella sessione.
- **API protette:** Accesso condizionato su base ruolo.
- **Gestione alert pacchetti:** marcatura “letto”, visibilità per utente.
- **Standard operativo:** vedi [STANDARD_OPERATIVO.md](STANDARD_OPERATIVO.md)

## File e cartelle strutturali

- `app/api/auth/[...nextauth]/authOptions.ts` – Configurazione NextAuth centralizzata.
- `app/api/auth/[...nextauth]/route.js` – Handler NextAuth App Router.
- `app/api/pacchetti/alert-letto/route.js` – API gestione alert pacchetti.

```diff
## 2025-08-22 21:50 UTC+2 — Aggiornamento struttura protezione accessi

- Le pagine admin protette ora usano il componente centralizzato `AuthGuard` (`app/components/AuthGuard.js`).
- Navbar presente solo sulle pagine admin.
- Per aggiungere una nuova pagina protetta: wrappare il contenuto in `<AuthGuard>` e inserire `<Navbar />` come primo componente figlio.
- Vedi STANDARD_OPERATIVO.md per scenario test e struttura aggiornata.
```

# Gestionale Pacchetti Ore – README

## Migrazione componenti (update 2025-08-22)

**ATTENZIONE:**  
Dal 22-08-2025 tutti i componenti e moduli relativi a "clienti" e "pacchetti" (ed eventuali utils connessi) sono stati migrati definitivamente in `app/components/` e `app/utils/`.  
Non utilizzare più le cartelle `src/components/clienti`, `src/components/pacchetti`, `src/utils/clienti` per sviluppo o fix: tali path sono ora dismessi e mantenuti solo per storico.

Tutte le nuove feature, fix, refactor su questi componenti dovranno avvenire su `app/`.

## Struttura cartelle aggiornata

- `app/components/clienti/`  
- `app/components/pacchetti/`  
- `app/utils/clienti/`  
- etc.

## Build/test
Procedere sempre con:
```
npm install
npm run build
npm run dev
```
e test manuale delle funzioni migrate.

## Scenario test dopo refactor
- Build e avvio senza errori
- Navigazione completa clienti/pacchetti/dashboard
- Funzionamento alert, modali, interazioni principali

---

# Gestionale Recuperiamo

Gestionale per la gestione dei pacchetti ore e attività per didattica.

---

## Struttura e architettura del progetto

**Riferimento unico e sempre aggiornato:**  
Consulta il file  
**MAPPA_STRUTTURA_PROGETTO.md**  
per conoscere la struttura reale e aggiornata della repository, con legenda e descrizione di tutte le directory e dei file chiave.

- **Root logica e tecnica:**  
  Tutto il codice applicativo (UI, API, layout, shared code) è nella cartella **/app/**, secondo la convenzione Next.js 13+.  
  Non esiste e non deve esistere alcuna cartella `/src/` o strutture “miste”.
- **Database e Prisma:**  
  Tutto il codice e le migrazioni relative a Prisma sono in `/prisma/`.
- **Non usare documenti di “vision” disallineati**:  
  Non sono più presenti file di architettura teorica o bozza; ogni modifica strutturale va riportata nella mappa reale e nel log operativo.

---

## Documentazione e file di processo

- **MAPPA_STRUTTURA_PROGETTO.md**  
  — Unica fonte per la struttura aggiornata del progetto. Da aggiornare dopo ogni modifica architetturale.
- **LOG_OPERATIVO.md**  
  — Log operativo di tutte le modifiche rilevanti, in reverse order, con orario UTC+2.
- **STANDARD_OPERATIVO.md**  
  — Regole vincolanti di formato, processo, aggiornamento documentazione, gestione debug e push.

---

## Regole di aggiornamento

- Dopo ogni modifica strutturale, aggiorna **MAPPA_STRUTTURA_PROGETTO.md**, **README.md**, **STANDARD_OPERATIVO.md** e **LOG_OPERATIVO.md**.
- Ogni file eliminato/aggiunto/trasformato deve essere riflesso nella mappa e nel log.
- Non introdurre nuove directory “core” senza aggiornarle nella mappa e senza consultare il responsabile del progetto.

---

## Scenario test manuale (integrità struttura)

1. Clona la repo, installa le dipendenze (`npm install`).
2. Esegui:
    - `npx prisma generate`
    - `npm run build`
    - `npm run dev`
3. Naviga tra tutte le route.  
4. Verifica che la struttura reale corrisponda a quanto riportato in **MAPPA_STRUTTURA_PROGETTO.md**.
5. Accertati che non esistano riferimenti o directory `/src/` o simili.

---

Ultimo aggiornamento: 2025-08-22 22:35 (UTC+2)

## Struttura delle cartelle

- `app/`: pagine dell’applicazione, API localizzate e layout principali (Next.js "app router").
- `components/`: componenti React riusabili (UI, CRUD, ecc.).
- `fetcher/`: funzioni per la gestione delle chiamate API lato frontend.
- `lib/`: librerie, helpers e codice condiviso.
- `models/`: modelli dati e logica di dominio.
- `utils/`: utilities generiche e helpers.
- `public/`: risorse statiche (immagini, icone, ecc.).

Consulta il file `context.md` in ogni cartella per una descrizione dettagliata del suo scopo.

# Gestionale Pacchetti Ore – Recuperiamo

## Descrizione
Applicazione Next.js 15, TypeScript, Tailwind CSS per la gestione dei pacchetti ore, clienti e attività.

---

## Struttura attuale della repository (2025-08-23)

- **/app/**  
  Unico entrypoint applicativo (route, API, layout, componenti, shared code).
- **/tests/**  
  Test automatici (es: `/tests/components/clienti/`).
- **/public/**  
  Asset statici.
- **/prisma/**  
  Schema e migrazioni Prisma.
- **/node_modules/**  
  Dipendenze (NON versionate).
- **File root:**  
  - `README.md`, `STANDARD_OPERATIVO.md`, `LOG_OPERATIVO.md`, `MAPPA_STRUTTURA_PROGETTO.md`
  - Configurazione Next.js, Tailwind, Prisma, ESLint, ecc.

---

## Policy fondamentali (post-migrazione 2025-08-23)

- Tutto il codice, componenti e moduli sono in `/app` (NON usare più `/src`).
- I test sono in `/tests` (NON più in `src/components/__tests__` o simili).
- Aggiorna SEMPRE README.md, STANDARD_OPERATIVO.md, LOG_OPERATIVO.md, MAPPA_STRUTTURA_PROGETTO.md dopo ogni modifica strutturale.
- Prima di proporre file/componenti, esegui il controllo file duplicati:
  ```powershell
  Get-ChildItem -Recurse -File | Group-Object Name | Where-Object { $_.Count -gt 1 } | Select-Object -ExpandProperty Name
  ```
  Se la lista è vuota, annota nel log che la repo è pulita. Se ci sono doppioni, risolvi PRIMA di proseguire.

---

## Avvio rapido

```bash
npm install
npm run dev
```
Applicazione su [http://localhost:3000](http://localhost:3000)

---

## Test automatici

1. I test sono in `/tests` (es: `/tests/components/clienti/ClientiForm.integration.test.jsx`)
2. Per eseguire:
   ```bash
   npm test
   ```
3. Tutti i test devono passare senza errori.
4. Dopo ogni modifica a test, aggiorna README.md, STANDARD_OPERATIVO.md, LOG_OPERATIVO.md.

---

## Scenario test/manuale struttura

1. Clona la repo, esegui `npm install`, `npx prisma generate`, `npm run build`, `npm run dev`
2. Naviga tra tutte le route e verifica funzionamento app
3. Esegui controllo duplicati (vedi comando sopra)
4. Verifica che la struttura reale coincida con MAPPA_STRUTTURA_PROGETTO.md
5. Accertati che non esistano directory o riferimenti a `/src/`

---

## Note operative

- Segui sempre STANDARD_OPERATIVO.md per policy, format, commit, log, milestones.
- Ogni modifica strutturale va riflessa in README, STANDARD_OPERATIVO, LOG_OPERATIVO, MAPPA_STRUTTURA_PROGETTO.
- Consulta MAPPA_STRUTTURA_PROGETTO.md per la mappa aggiornata.

---

Ultimo aggiornamento: 2025-08-23 01:41 UTC+2

## API Gestione Attività (milestone 5)

- **POST   /api/attivita**  
  Crea una nuova attività, aggiorna ore residue sul pacchetto associato.
- **GET    /api/attivita**  
  Restituisce la lista di tutte le attività (filtri opzionali: pacchettoId, clienteId).
- **GET    /api/attivita?id=XX**  
  Restituisce il dettaglio di una singola attività.
- **PATCH  /api/attivita**  
  Modifica una attività esistente, aggiorna ore residue se cambiano le ore consumate.
- **DELETE /api/attivita**  
  Elimina una attività, ripristina le ore residue del pacchetto.

  ## UI Gestione Attività (milestone 5, issue #34)

- **Percorso:** `/attivita`
- **Componenti principali:**  
  - `AttivitaList.jsx` (elenco, filtri, azioni)
  - `AttivitaForm.jsx` (creazione/modifica, selettori pacchetto/cliente)
  - `AttivitaDettaglioModal.jsx` (modale opzionale dettaglio/azioni)
- **Scenario test/manuale milestone 5 UI attività:**
    1. Creare/modificare/eliminare attività da UI
    2. Selezionare correttamente pacchetto e cliente (form con select)
    3. Filtrare attività per cliente/pacchetto/data nella lista
    4. Edge-case: attività senza pacchetto, errori validazione UI (form/feedback)
    5. Navigazione dettagliata, azioni da tabella (modifica/elimina)
- **Note:** tutti i componenti sono da implementare, nessun duplicato rilevato in repo.

---

## Funzionalità
- Gestione attività: creazione, modifica, eliminazione
- Selezione pacchetto e cliente in fase di creazione attività
- Filtri operativi su elenco attività: per cliente, pacchetto, intervallo temporale (dal-al)
- Modale dettaglio attività e modale modifica
- Validazione campi obbligatori e input step 0.5 per ore

## Scenario test manuale
- Creare, modificare, eliminare attività da UI
- Selezionare correttamente pacchetto e cliente in creazione
- Filtrare le attività per cliente, pacchetto, intervallo temporale (dal-al, anche in combinazione)
- Gestione tabella vuota e reset filtri
- Validazione campi obbligatori

...

## Nuove funzionalità

- Endpoint `/api/clienti/[clienteId]/attivita`: restituisce tutte le attività riferite a un cliente, anche se collegate solo tramite pacchetti.
- Componente React `AttivitaClienteList.jsx` per visualizzare tutte le attività di un cliente.
- Flusso: dal dettaglio cliente (`ClienteDettaglioModal.jsx`) è possibile vedere tutte le attività collegate al cliente.

...

## Funzionalità principali

- Gestione CRUD pacchetti ore e attività collegate
- Calcolo automatico ore residue su inserimento, modifica, eliminazione attività
- Gestione clienti e pacchetti per cliente
- Filtri avanzati su attività per cliente, pacchetto, data, intervallo
- Protezione overbooking (nessuna attività può superare le ore residue)
- [NEW] Endpoint aggregato attività per cliente
- [NEW] Componente AttivitaClienteList.jsx per visualizzazione attività aggregate per cliente
- [NEW] Storico attività: componente StoricoAttivitaTable.jsx, pagina /storico, export dummy

- Storico attività filtrabile/esportabile (PDF/XLS, placeholder)
- Scenario test manuale storico attività: punti 1-9 confermati, punti 10-11 non ancora integrati (vedi MAPPA_STRUTTURA_PROGETTO.md).

---

**Ultimo aggiornamento**: 2025-08-24 00:44 (UTC+2)

## Funzionalità principali

- Storico attività filtrabile/esportabile (PDF/XLS completato, export reale lato client)
- Navigazione completa: la pagina storico (/storico) ora include la navbar, la navigazione tra tutte le pagine principali è sempre possibile.
- Scenario test manuale storico attività: tutte le funzionalità export e navigazione confermate, milestone “storico attività: esportazione e navigazione completata”.

---
- Storico attività filtrabile/esportabile (PDF/XLS completato, export reale lato client)
- Navigazione completa: la pagina storico (/storico) ora include la navbar, la navigazione tra tutte le pagine principali è sempre possibile.
- Deep link storico: dal dettaglio cliente puoi cliccare “Vedi storico attività” e arrivare su /storico col filtro già impostato (query string).
- La funzione di deep link da pacchetto a storico NON è più prevista: il filtro per cliente mostra già tutte le attività dei suoi pacchetti; la UI è coerente e semplificata.
- Scenario test manuale storico attività: tutte le funzionalità export, filtri e navigazione confermate; milestone “storico attività: export, navigazione e deep link” CHIUSA.

---

**Ultimo aggiornamento**: 2025-08-24 02:00 (UTC+2)
## [NEW] Storico variazioni ore residue pacchetto (Pacchetto_ChangeLog)

- È attiva una tabella di audit trail che registra ogni modifica alle ore residue dei pacchetti (creazione/modifica/eliminazione attività, rettifiche manuali, errori).
- Ogni evento salva: pacchetto, ore prima/dopo, tipo operazione, attività collegata (se presente), utente, timestamp, motivazione.
- Lo storico è consultabile (API/UI in sviluppo).

## Funzionalità principali

- Gestione pacchetti ore (creazione, modifica, cancellazione)
- CRUD attività con aggiornamento ore residue e pacchetti collegati
- Alert automatici per soglie ore residue
- **Storico modifiche attività (changelog):** ogni modifica alle ore delle attività viene tracciata per ogni pacchetto (in arrivo interfaccia di visualizzazione)
- Autenticazione e protezione pagine (AuthGuard)

## Struttura e funzionalità correlate: attività e modifiche pacchetto

Per un riepilogo dettagliato delle pagine/funzioni “Attività”, “Storico attività” e “Storico modifiche” e delle possibili opzioni di consolidamento futuro, consulta la sezione dedicata in MAPPA_STRUTTURA_PROGETTO.md.

## Struttura principale

- Frontend Next.js, API REST collegate via prisma
- Componenti modulari: PacchettiList, PacchettoForm, Alert, ecc.
- In arrivo: componente `ChangelogTable.jsx` e route `/pacchetti/[id]/changelog` per visualizzare le modifiche storiche dei pacchetti

## Scenario test manuale (changelog)

1. PATCH attività con sola descrizione → nessuna nuova entry changelog
2. PATCH attività con incremento ore superiore alle residue → errore, nessuna entry changelog
3. PATCH attività con modifica ore valida → entry changelog corretta

## Funzionalità principali

- Gestione Attività collegate a clienti e (opzionalmente) a pacchetti ore prepagati.
- Vincoli:
  - Ogni attività deve avere un cliente obbligatorio.
  - Il pacchetto, se indicato, deve necessariamente essere di quel cliente (vincolo garantito da trigger SQL, issue #41).
- Gestione CRUD per clienti, pacchetti ore, attività.
- Ruoli, permessi, storico modifiche pacchetti.

## Struttura

- **sql/attivita_pacchetto_cliente_trigger.sql**: Funzione e trigger per vincolo pacchetto/cliente su Attivita.
- **prisma/**: schema Prisma e migrazioni.
- **app/**: codice Next.js (frontend, API, components).
- **LOG_OPERATIVO.md**: storico operativo e traccia delle modifiche.

## Scenario test manuale vincolo attività/pacchetto

1. Inserimento Attivita solo con clienteId valido → OK
2. Inserimento Attivita con clienteId e pacchettoId corretto (cioè pacchetto del cliente) → OK
3. Inserimento Attivita con clienteId e pacchettoId di altro cliente → **ERRORE trigger**
4. Inserimento Attivita senza clienteId → **ERRORE NOT NULL**
5. Inserimento Attivita con clienteId non esistente → **ERRORE FK**
6. Inserimento Attivita con pacchettoId non esistente → **ERRORE FK**

---

## Milestone/Issue correlate

- [#40] Analisi, scenario test e bug vincolo pacchetto/cliente.
- [#41] Implementazione trigger SQL attività-pacchetto-cliente.

