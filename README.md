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

### Note operative

- Aggiorna LOG_OPERATIVO.md ogni volta che questa sezione viene modificata.
- Se aggiungi nuovi comandi/script, documentali qui e aggiorna STANDARD_OPERATIVO.md.
---