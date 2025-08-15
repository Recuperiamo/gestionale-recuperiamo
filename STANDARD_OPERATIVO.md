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
