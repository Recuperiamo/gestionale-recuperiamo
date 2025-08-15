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

---