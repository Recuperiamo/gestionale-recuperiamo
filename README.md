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