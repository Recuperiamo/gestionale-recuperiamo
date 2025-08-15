# LOG OPERATIVO – GESTIONALE PACCHETTI ORE

2025-08-16 01:49:00 (UTC+2)
- [CHIUSURA ISSUE #8] README.md aggiornato e allineato con le istruzioni richieste. LOG_OPERATIVO.md aggiornato con tutti gli step della milestone e timestamp conforme. Scenario test manuale superato. Milestone pronta per chiusura.

2025-08-16 01:48:00 (UTC+2)
- Aggiornata configurazione testing automatico: risolti conflitti Jest tra package.json e jest.config.js, aggiunto babel.config.js per supporto JSX in Jest, installato jest-environment-jsdom come devDependency, corretto setupFilesAfterEnv in jest.config.js.
- Verificato funzionamento test automatici con test di esempio basato su React Testing Library: test superato con successo via `npm test`.
- Aggiornato anche STANDARD_OPERATIVO.md e README.md secondo le nuove procedure di testing automatico.
- [CHIUSURA ISSUE #7] Tutti i requisiti di setup ambiente di testing locale sono stati implementati, testati e documentati. Scenario test manuale superato. Issue pronta per chiusura.

2025-08-16 01:48:00 (UTC+2)
- Aggiornata configurazione testing automatico: risolti conflitti Jest tra package.json e jest.config.js, aggiunto babel.config.js per supporto JSX in Jest, installato jest-environment-jsdom come devDependency, corretto setupFilesAfterEnv in jest.config.js.
- Verificato funzionamento test automatici con test di esempio basato su React Testing Library: test superato con successo via `npm test`.
- Aggiornato anche STANDARD_OPERATIVO.md e README.md secondo le nuove procedure di testing automatico.
## [2025-08-16 01:38 UTC+2] Issue #7: aggiunta testing base (Jest + Testing Library), script test, config, primo test di esempio

Versione STANDARD_OPERATIVO.md: 2025-08-15

File coinvolti:
- package.json
- jest.config.js
- __tests__/sample.test.js
- LOG_OPERATIVO.md

Scenario Test:
- Clonare la repo su ambiente pulito.
- Installare le dipendenze (`npm install`).
- Eseguire `npm test` ed accertarsi che il test di esempio passi senza errori.
- Aggiungere eventualmente altri test in __tests__/ e verificare il corretto funzionamento.
## [2025-08-16 01:28 UTC+2] Issue #7: aggiunta sezione "Sviluppo locale" a README.md

Versione STANDARD_OPERATIVO.md: 2025-08-15

File coinvolti:
- README.md
- LOG_OPERATIVO.md

Scenario Test:
- Clonare la repository su un ambiente pulito.
- Seguire i passi della sezione “Sviluppo locale” in README.md: `npm install`, `npm run dev`, `npm run build`, `npm run lint`, `npm test`.
- Tutti i comandi devono completarsi senza errori o warning bloccanti.
- L’applicazione parte su http://localhost:3000 e risponde correttamente.
- I comandi di lint e test restituiscono feedback chiaro.
## [2025-08-16 01:25 UTC+2] Avvio lavoro Issue #7: setup ambiente di testing locale

Versione STANDARD_OPERATIVO.md: 2025-08-15

File coinvolti:
- README.md
- LOG_OPERATIVO.md
- STANDARD_OPERATIVO.md
- (eventuali nuovi script di test/lint/build)

Scenario Test:
- Un nuovo dev può leggere README.md e, seguendo le istruzioni, avviare ambiente locale senza errori.
- I comandi di test (`npm test`) e lint (`npm run lint`) funzionano e danno feedback chiaro.
- Dopo ogni modifica a README.md, STANDARD_OPERATIVO.md o agli script di test/build/lint, LOG_OPERATIVO.md viene aggiornato.
---
## [2025-08-16 01:22 UTC+2] Chiusura Issue #6: governance workflow, validazione log operativo/file chiave, doc aggiornata

Versione STANDARD_OPERATIVO.md: 2025-08-15

File coinvolti:
- .github/scripts/check-operativo.js
- README.md
- STANDARD_OPERATIVO.md
- LOG_OPERATIVO.md

Scenario Test:
- Modifica uno tra README.md, STANDARD_OPERATIVO.md, ONBOARDING_SESSION.md o END_SESSION.md senza aggiornare LOG_OPERATIVO.md → la PR viene bloccata.
- Aggiorna LOG_OPERATIVO.md senza una delle sezioni richieste (timestamp, versione standard, file coinvolti, scenario test) → la PR viene bloccata.
- Aggiorna LOG_OPERATIVO.md ma ometti nella lista “File coinvolti” uno dei file effettivamente modificati → la PR viene bloccata.
- Tutte le sezioni sono presenti e corrette → la PR passa.
## [2025-08-16 01:18 UTC+2] Aggiornamento check-operativo.js: validazione avanzata file chiave, log operativo, timestamp, scenario test

Versione STANDARD_OPERATIVO.md: 2025-08-15

File coinvolti:
- .github/scripts/check-operativo.js

Scenario Test:
- Modifica uno tra README.md, STANDARD_OPERATIVO.md, ONBOARDING_SESSION.md o END_SESSION.md senza aggiornare LOG_OPERATIVO.md → la PR viene bloccata.
- Aggiorna LOG_OPERATIVO.md senza “Scenario Test”, senza “File coinvolti”, senza versione standard o senza timestamp → la PR viene bloccata.
- Aggiorna LOG_OPERATIVO.md ma ometti nella lista “File coinvolti” uno dei file effettivamente modificati → la PR viene bloccata.
- Correggi tutto e ripeti: la PR passa.
## [2025-08-16 01:15 UTC+2] Push completato: workflow CI/CD deduplicati e attivi, repo allineata con remoto

**File coinvolti**:
- .github/workflows/check-operativo.yml
- .github/workflows/check-log-operativo.yml
- LOG_OPERATIVO.md (questa entry)

**Scenario Test**:
- PR e push su qualsiasi branch attivano i workflow
- PR senza LOG_OPERATIVO.md aggiornato viene bloccata
- Test manuale in corso di validazione

**Note**:
- Merge effettuato senza conflitti, repo ora aggiornata sia locale che remoto.
---

## [2025-08-16 01:04 UTC+2] Aggiornamento e deduplicazione workflow CI/CD: check-operativo.yml e check-log-operativo.yml

**File coinvolti**:
- .github/workflows/check-operativo.yml (definitivo, deduplicato e attivo su push+PR)
- .github/workflows/check-log-operativo.yml (definitivo, deduplicato e attivo su push+PR)
- LOG_OPERATIVO.md (questa entry, aggiornata)

**Scenario Test**:
- Push e PR su qualsiasi branch attivano entrambi i workflow
- PR senza LOG_OPERATIVO.md aggiornato viene bloccata da check-log-operativo.yml
- Modifica file chiave (README, STANDARD_OPERATIVO.md, ecc.): check-operativo obbliga update log e coerenza file

**Note**:
- Eliminati i doppioni, mantenute solo le versioni funzionanti e complete dei workflow.
- Se introduci nuovi workflow, aggiorna sempre questa sezione e la documentazione.
## 2025-08-16 00:32 UTC+2 – Issue #5: Aggiornamento .gitignore, standard operativo e README

- Aggiornato file .gitignore per Next.js/Node: aggiunte regole per esclusione node_modules, output temporanei, dist, .next, .env*, *.log, output.md, elenco_clonata.txt e file di sistema.
- Aggiornata sezione dedicata in STANDARD_OPERATIVO.md sulle regole di .gitignore (pattern obbligatori, cosa mai escludere).
- Aggiornata sezione policy .gitignore anche in README.md.
- Validato che nessun file strategico venga escluso erroneamente.
- Eseguito scenario test manuale: creati file temporanei e verificato che git status non li mostri tra i file tracciati; modificato file README.md e verificato che venga tracciato.
- Pronti al push di .gitignore, STANDARD_OPERATIVO.md, README.md, LOG_OPERATIVO.md.

---

## Scenario test manuale

1. Dalla root della repo, crea i file: test.log, temp.txt, node_modules/fake.js, elenco_clonata.txt.
2. Esegui git status: questi file NON devono apparire tra i non tracciati.
3. Modifica README.md: deve apparire tra i file modificati.
4. Elimina i file temporanei di test.
5. Conferma che nessun file strategico (README.md, LOG_OPERATIVO.md, STANDARD_OPERATIVO.md, ecc.) sia escluso dal versionamento.
## 2025-08-16 00:28 UTC+2 – Issue #5: Aggiornamento .gitignore e standard operativo

- Aggiornato file .gitignore per Next.js/Node: aggiunte regole per esclusione node_modules, output temporanei, dist, .next, .env*, *.log, output.md, elenco_clonata.txt e file di sistema.
- Aggiornata sezione dedicata in STANDARD_OPERATIVO.md sulle regole di .gitignore (pattern obbligatori, cosa mai escludere).
- Validato che nessun file strategico venga escluso erroneamente.
- Eseguito scenario test manuale: creati file temporanei e verificato che git status non li mostri tra i file tracciati; modificato file README.md e verificato che venga tracciato.
- Pronti al push di .gitignore, STANDARD_OPERATIVO.md e LOG_OPERATIVO.md.

---

### Scenario test manuale

1. Dalla root della repo, crea i file: test.log, temp.txt, node_modules/fake.js, elenco_clonata.txt.
2. Esegui git status: questi file NON devono apparire tra i non tracciati.
3. Modifica README.md: deve apparire tra i file modificati.
4. Elimina i file temporanei di test.
5. Conferma che nessun file strategico (README.md, LOG_OPERATIVO.md, STANDARD_OPERATIVO.md, ecc.) sia escluso dal versionamento.

## 2025-08-16 00:24 UTC+2 – Riepilogo stato sessione

**DONE:**
- Bonifica struttura e pulizia root superiore completata.
- Test manuale eseguito con successo (npm install, npm run dev, git status).
- Aggiornamento file di processo (STANDARD_OPERATIVO.md, README.md).
- Entry log aggiornata con orari reali.

**TO DO:**
- Confermare la gestione di elenco_clonata.txt (da ignorare/eliminare o aggiungere a .gitignore).
- Confermare se AI_PERSONALIZZAZIO.md va committato così com’è.
- Eseguire push del LOG_OPERATIVO.md e di tutti i file modificati.
- Validare che la struttura rimanga conforme allo standard operativo dopo il push.

---

## 2025-08-16 00:16 UTC+2 – Aggiornamento file operativi e processuali
- Aggiornati STANDARD_OPERATIVO.md e README.md con nota sulla struttura e operatività aggiornata.
- Preparate entry per LOG_OPERATIVO.md e pronte istruzioni push.
- Da verificare gestione file non tracciati/residui (elenco_clonata.txt da ignorare o eliminare; AI_PERSONALIZZAZIO.md da committare se ok).

---

## 2025-08-16 00:08 UTC+2 – Test manuale funzionamento repo dopo pulizia
- Da dentro gestionale-recuperiamo:
  - Eseguito `npm install`: esito OK, nessun errore o vulnerabilità.
  - Eseguito `npm run dev`: esito OK, Next.js si avvia regolarmente (Localhost:3000 pronto).
  - Eseguito `git status`: situazione pulita, a parte file AI_PERSONALIZZAZIO.md modificato e elenco_clonata.txt non tracciato.
- Nessun warning su lockfile multipli, ambiente in stato pulito.
- Tutte le operazioni eseguite **esclusivamente dentro la repo**, come da standard.

---

## 2025-08-16 00:01 UTC+2 – Bonifica struttura e pulizia root superiore
- Analisi e confronto struttura tra root e cartella gestionale-recuperiamo.
- Verificata presenza di file e cartelle di progetto nella root superiore, non appartenenti alla repo.
- Avviata procedura di spostamento e cancellazione: ora **tutto il progetto** risiede solo in gestionale-recuperiamo.
- Eliminati file e cartelle di progetto residui dalla root superiore.
- La root superiore contiene ora esclusivamente la cartella gestionale-recuperiamo.

---


## 2025-08-15 [UTC+2: 23:59]
- Aggiornamento e push di package.json e package-lock.json.
- Motivazione: allineamento repository remoto con ambiente locale dopo inizializzazione, installazione framework e dipendenze base (Next.js, TailwindCSS, ecc).
- Nessuna modifica strutturale ai sorgenti, solo lockfile e manifest.
- La build e il comando di avvio (`npm run dev`) continuano a funzionare senza errori.
- Resta sospeso il test UI base framework in attesa di pagine/app.
- Repository ora coerente per cloni e installazioni future.
## 2025-08-15 [UTC+2: 23:48]
- Ripristino file `tailwind.config.ts` in root (`C:\Users\mauzr\Desktop\Sito\gestionale-pacchetti-ore\tailwind.config.ts`).
- Contenuto configurazione base TypeScript conforme a standard Next.js/Tailwind e STANDARD_OPERATIVO.md.
- Percorso verificato: file presente in root insieme a package.json, tsconfig.json, ecc.
- Verifica sintattica file: OK.
- Build (`npm run dev`/`npm run build`) eseguita senza errori di parsing/configurazione.
- Test diretto sospeso: nessuna pagina/app esistente su cui verificare l'applicazione di classi Tailwind.
- Scenario test manuale documentato e aggiornato.
- Aggiornati anche README.md e STANDARD_OPERATIVO.md con nota sul ripristino e percorso corretto.

## 2025-08-15 23:36:20 UTC+2  
- Eseguito scenario test manuale bootstrap Next.js:  
  - `npm install` dalla root (esito: nessun errore, 0 vulnerabilità)
  - `npm run dev` dalla root (esito: Next.js 15.4.6 avviato regolarmente, "Ready" in 2.1s, ascolto su http://localhost:3000)
  - Accesso a http://localhost:3000: server attivo, pagina Next.js standard o 404 previsto
- Nessun errore/warning bloccante riscontrato.
- Conformità checklist issue #4, punto 4, verificata.
- Scenario test manuale aggiunto a log.

---

## 2025-08-15 23:29:14 UTC+2  
- Integrazione log per inizializzazione progetto e installazione dipendenze chiave (Next.js, React, TypeScript, Tailwind, ESLint) secondo STANDARD_OPERATIVO.md v. aggiornata [2025-08-15 20:08].
- Comandi eseguiti per setup (CMD e PowerShell):

CMD:
npx create-next-app@latest temp-nextjs --typescript --eslint --tailwind --app
cd temp-nextjs
npm install
cd ..
move temp-nextjs\* .
rmdir /s /q temp-nextjs

PowerShell:
npx create-next-app@latest temp-nextjs --typescript --eslint --tailwind --app
cd temp-nextjs
npm install
cd ..
Move-Item temp-nextjs\* .
Remove-Item temp-nextjs -Recurse -Force

- Scenario test manuale:
  1. Da un clone pulito, eseguire:
     - `npm install` (nessun errore atteso)
     - `npm run dev` (avvio shell Next.js, 404 previsto se nessuna pagina custom presente)
  2. Verificare presenza di:
     - package.json, package-lock.json, tsconfig.json, next.config.ts, postcss.config.mjs, tailwind.config.ts, eslint.config.mjs, next-env.d.ts, README.md, /src, /public
  3. Tutte le dipendenze minime Next.js, React, TS, Tailwind, ESLint devono risultare in package.json
  4. Struttura root conforme a STANDARD_OPERATIVO.md

- Conformità verificata con STANDARD_OPERATIVO.md, nessuna anomalia rilevata in questa fase.

## 2025-08-15 20:22:16 UTC  
- Pronto per aggiornamento log e push.  
- Nessuna omissione rilevata nel log.  
- Prossimo step: push del log operativo e di tutti i file modificati/creati in questa sessione.

## 2025-08-15 20:32:00 UTC  
- Aggiornato README.md a seguito della migrazione strutturale Next.js: nuova struttura root, policy versionamento file chiave (incluso next-env.d.ts), istruzioni avvio rapido e note di conformità a STANDARD_OPERATIVO.md.
---

## 2025-08-15 19:55:00 UTC  
- Identificazione dei file e delle cartelle utili generati dal wizard Next.js in temp-nextjs.  
- Definizione lista file/cartelle standard Next.js+Tailwind+TS+App Router da spostare in root.  
- Scenario test manuale descritto per verifica struttura e funzionamento.

## 2025-08-15 20:01:00 UTC  
- Spostamento in root di:  
  - src/  
  - public/  
  - package.json  
  - package-lock.json  
  - next.config.ts  
  - eslint.config.mjs  
  - tsconfig.json  
  - postcss.config.mjs  
  - .gitignore (overwrite)  
  - README.md  
  - next-env.d.ts  
- Comandi forniti sia per CMD sia per PowerShell.

## 2025-08-15 20:06:00 UTC  
- Eseguito `npm install` dalla root.  
- Eseguito `npm run dev` dalla root, confermata partenza corretta applicazione Next.js (404 previsto se manca pagina home).  
- Comandi forniti per verifica post-spostamento.

## 2025-08-15 20:10:00 UTC  
- Verifica presenza file/cartelle in root, src, public e residui in temp-nextjs.  
- Identificate sottocartelle ricorsive superflue (src\src, public\public) e avviata procedura di eliminazione.  
- Residui in temp-nextjs: next-env.d.ts (già migrato), node_modules (da ignorare).

## 2025-08-15 20:13:00 UTC  
- Eliminazione sottocartelle ricorsive:  
  - src\src  
  - public\public  
- Eliminazione definitiva temp-nextjs (confermata assenza file residui utili).  
- Verifica finale struttura: root conforme allo standard operativo; nessuna cartella/tempfile superfluo.  
- Scenario test manuale eseguito: avvio progetto, controllo struttura, nessun errore bloccante.

## 2025-08-15 20:22:16 UTC  
- Pronto per aggiornamento log e push.  
- Nessuna omissione rilevata nel log.  
- Prossimo step: push del log operativo e di tutti i file modificati/creati in questa sessione.

---
## [2025-08-15 20:08] Aggiornamento STANDARD_OPERATIVO.md per scelte stack Next.js

- Aggiornata la sezione 11 di STANDARD_OPERATIVO.md per rendere vincolanti:
  - Next.js (ultima LTS) con TypeScript
  - Tailwind CSS obbligatorio
  - App Router (`/src/app`), struttura sotto `/src`
  - Alias import solo `@/*`
  - ESLint e Prettier come devDependencies obbligatorie
  - File di configurazione in root, asset pubblici in `public/`
- Rimossa la parte descrittiva sulle domande interattive del wizard Next.js.
- Confermata la coerenza con struttura collaborativa e regole di governance preesistenti.
- Versione STANDARD_OPERATIVO.md applicata: **2025-08-15 20:08**

# LOG OPERATIVO – Gestionale Didattica Recuperiamo
_Aggiornato al 2025-08-15 19:47:40 UTC_

---

## [2025-08-15 19:47:40 UTC] – Creazione struttura cartelle e context.md (issue #3)

**Autore:** Recuperiamo  
**Task:**  
- Creazione/validazione di tutte le cartelle principali secondo ARCHITETTURA_CARTELLE_BOZZA.md:
    - /app/
    - /src/components/
    - /src/fetcher/
    - /src/utils/
    - /src/models/
    - /public/
    - /docs/
    - /tests/
    - /scripts/
    - /.github/
    - /context.md (root)
- Creazione e popolamento file context.md in ciascuna cartella, inclusa la root.
- Verifica automatica della presenza di tutti i context.md richiesti tramite comando `dir /s /b context.md`.
- Scenario test manuale eseguito: confermata la presenza di tutti i file context.md nelle cartelle previste dalla bozza architetturale.

**File coinvolti:**  
- Tutte le cartelle sopra elencate  
- app/context.md  
- src/components/context.md  
- src/fetcher/context.md  
- src/utils/context.md  
- src/models/context.md  
- public/context.md  
- docs/context.md  
- tests/context.md  
- scripts/context.md  
- .github/context.md  
- context.md (root)  
- LOG_OPERATIVO.md

**Scenario test manuale:**  
- Eseguito comando `dir /s /b context.md` in root del progetto.
- L’output corrisponde esattamente alla lista di file context.md richiesta dalla struttura di ARCHITETTURA_CARTELLE_BOZZA.md.
- Confermato che nessuna cartella prevista è priva del proprio context.md.

**Riferimento issue:**  
- Issue #3 [Creazione repository e struttura cartelle base](https://github.com/Recuperiamo/gestionale-recuperiamo/issues/3)

## [2025-08-15 20:15] - Validazione finale progettazione: GO ufficiale alla fase di codifica

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Conferma formale dal responsabile progetto/PO (GO) per la chiusura della fase di progettazione. Tutte le checklist scenario test sono spuntate, tutti i deliverable versionati, tracciati e accessibili sia come file singoli che in README.md e LOG_OPERATIVO.md. La repository è pronta per la codifica tecnica secondo milestone e standard operativo.  
**File coinvolti**:
- LOG_OPERATIVO.md (aggiornato)
- README.md (aggiornato)
- Tutti i file deliverable progettuali fase 2 già elencati

**Scenario Test**:
- Entry di GO presente in LOG_OPERATIVO.md, scenario test manuale finale spuntato e tracciato.
- README.md contiene ora backup integrale di tutti i deliverable (testo completo).
- Tutte le milestone e i file strategici sono presenti, nessuna omissione.
- Pronto per l’apertura task/issue, sviluppo e push delle prime feature.

**Esito atteso**:
- Progettazione formalmente chiusa e validata.
- Transizione ufficiale a fase di sviluppo/codifica.
- Tutto tracciato, versionato e referenziato secondo standard.

---

## [2025-08-15 20:10] - Correzione README.md: inserito backup integrale di tutti i deliverable progettuali come da standard

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Correzione formale: README.md ora contiene il testo completo e integrale di tutti i deliverable progettuali fase 2 (nessun rimando/segnaposto). Backup conforme secondo scenario test, log operativo aggiornato e tracciato.  
**File coinvolti**:
- README.md (aggiornato)
- LOG_OPERATIVO.md (aggiornato)

**Scenario Test**:
- README.md contiene backup integrale di: mappa funzionale, checklist progettazione, scenario test progettazione, struttura dati, architettura cartelle, milestone/fasi di sviluppo, scenario test manuale finale.
- Nessun segnaposto o rimando, solo testo completo.
- Entry di correzione presente in LOG_OPERATIVO.md.
- Pronto per scenario test finale e validazione “GO”.

**Esito atteso**:
- Conformità piena allo standard operativo e scenario test.
- Tutti i file strategici sono tracciati, reperibili e versionati.

---

## [2025-08-15 20:10] - Correzione README.md: inserito backup integrale di tutti i deliverable progettuali come da standard

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Correzione formale: README.md ora contiene il testo completo e integrale di tutti i deliverable progettuali fase 2 (nessun rimando/segnaposto). Backup conforme secondo scenario test, log operativo aggiornato e tracciato.  
**File coinvolti**:
- README.md (aggiornato)
- LOG_OPERATIVO.md (aggiornato)

**Scenario Test**:
- README.md contiene backup integrale di: mappa funzionale, checklist progettazione, scenario test progettazione, struttura dati, architettura cartelle, milestone/fasi di sviluppo, scenario test manuale finale.
- Nessun segnaposto o rimando, solo testo completo.
- Entry di correzione presente in LOG_OPERATIVO.md.
- Pronto per scenario test finale e validazione “GO”.

**Esito atteso**:
- Conformità piena allo standard operativo e scenario test.
- Tutti i file strategici sono tracciati, reperibili e versionati.

---
## [2025-08-15 19:55] - Scenario test manuale finale progettazione: creato SCENARIO_TEST_MANUALE_PROGETTAZIONE.md, aggiornato log e README

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Redatto e versionato lo scenario test manuale finale per la progettazione gestionale didattica. Creato file SCENARIO_TEST_MANUALE_PROGETTAZIONE.md, incollato integralmente in coda a LOG_OPERATIVO.md e aggiornata la sezione documentazione di README.md.  
**File coinvolti**:
- SCENARIO_TEST_MANUALE_PROGETTAZIONE.md (nuovo)
- LOG_OPERATIVO.md (aggiornato)
- README.md (aggiornato)

**Scenario Test**:
- SCENARIO_TEST_MANUALE_PROGETTAZIONE.md presente in root e completo.
- Sezione documentazione progettuale di README.md aggiornata.
- LOG_OPERATIVO.md contiene nuova entry dettagliata e backup integrale dello scenario in fondo al file.
- Tutte le checklist sono spuntate: la struttura progettuale rispetta lo standard ed è pronta per validazione PO e GO codifica.

**Esito atteso**:
- Superato lo scenario test, la fase di progettazione è chiusa e la repo pronta a ricevere codice.
- Backup garantito anche in caso di future revisioni.

---

(resto del file invariato, inclusi tutte le entry e backup integrali già presenti)

---

# === BACKUP SCENARIO_TEST_MANUALE_PROGETTAZIONE.md ===

# Scenario test manuale finale – Fase progettazione gestionale didattica

## Obiettivo
Verificare che tutti i deliverable progettuali richiesti siano stati prodotti, versionati, validati e siano accessibili secondo lo standard operativo, prima di autorizzare il passaggio alla codifica.

---

## Checklist scenario test

- [x] Mappa funzionale presente e coerente con i requisiti raccolti
- [x] Bozza struttura dati presente, completa e coerente con la mappa funzionale
- [x] Bozza architettura cartelle/componenti presente, chiara, scalabile
- [x] Lista milestone/fasi di sviluppo prodotta, prioritaria e tracciabile
- [x] Tutti i file deliverable sono presenti come file singoli, incollati integralmente in coda a LOG_OPERATIVO.md, e referenziati in README.md
- [x] LOG_OPERATIVO.md aggiornato dopo ogni step significativo, senza omissioni, nessuna entry troncata
- [x] README.md aggiornato e completo di backup documentazione progettuale
- [x] STANDARD_OPERATIVO.md aggiornato se necessario
- [x] Nessun file strategico risulta troncato o mancante sulla repo GitHub
- [x] Validazione esplicita: il responsabile progetto/PO conferma in chat e con apposita entry in LOG_OPERATIVO.md che la fase di progettazione è “GO”

---

## Note operative e di validazione

- Nessuna codifica o creazione di file tecnici è consentita fino a superamento di questo scenario test.
- In caso di revisione/modifica di un deliverable, aggiornare contestualmente file singolo, LOG_OPERATIVO.md e README.md.
- Conservare sempre lo storico dei backup in coda a LOG_OPERATIVO.md.
- Riepilogo stato e to-do devono essere chiaramente visibili nella parte alta del log.

---

## Scenario di superamento

- Il PO/Responsabile progetto prende visione della checklist e conferma “GO” alla codifica sia in chat, sia con entry dedicata in LOG_OPERATIVO.md.
- La repository risulta pronta, tracciata e validabile per passaggio a fase di sviluppo.

---
## [2025-08-15 19:45] - Lista milestone/fasi di sviluppo: creato MILESTONE_FASI_DI_SVILUPPO.md, aggiornato log e README

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Redatta e versionata la lista milestone/fasi di sviluppo per il gestionale didattica (MVP). Creato file MILESTONE_FASI_DI_SVILUPPO.md, incollato integralmente in coda a LOG_OPERATIVO.md e aggiornata la sezione documentazione di README.md.  
**File coinvolti**:
- MILESTONE_FASI_DI_SVILUPPO.md (nuovo)
- LOG_OPERATIVO.md (aggiornato)
- README.md (aggiornato)

**Scenario Test**:
- MILESTONE_FASI_DI_SVILUPPO.md presente in root e completo.
- Sezione documentazione progettuale di README.md aggiornata con la lista milestone.
- LOG_OPERATIVO.md contiene nuova entry dettagliata e backup integrale della milestone in fondo al file.
- Ogni milestone/fase chiara, atomica e validabile.
- Pronto per raffinamento e scomposizione operativa.

**Esito atteso**:
- Sequenza di sviluppo chiara, prioritaria e tracciabile.
- Backup garantito anche in caso di perdita file singolo o refactor.

---

(resto del file invariato, inclusi tutte le entry e backup INTEGRALI già presenti)

---

# === BACKUP MILESTONE_FASI_DI_SVILUPPO.md ===

# Lista milestone/fasi di sviluppo – Gestionale Didattica (MVP)

## Obiettivo
Definire la sequenza di macro-fasi operative per lo sviluppo, con priorità e dipendenze.

---

## Milestone principali

1. **Setup ambiente e infrastruttura**
   - Inizializzazione progetto (repo, dipendenze base, struttura cartelle)
   - Configurazione workflow GitHub Actions e check automatici
   - Setup ambienti locali e test

2. **Implementazione autenticazione e gestione utenti**
   - Gestione ruoli: amministratore, operatore, visualizzatore
   - Login/logout, gestione stato utente

3. **Gestione anagrafica clienti**
   - CRUD clienti con validazioni
   - Collegamento ai pacchetti ore

4. **Gestione pacchetti ore**
   - Creazione/assegnazione pacchetti a clienti
   - Monitoraggio ore residue e segnalazioni

5. **Gestione attività/rendicontazione**
   - Registrazione attività collegate a pacchetti
   - Calcolo automatico ore residue

6. **Fatturazione e amministrazione**
   - Generazione e gestione documenti (proforma, fattura, ricevuta)
   - Stato pagamenti

7. **Dashboard e reportistica**
   - Cruscotto riepiloghi clienti, pacchetti, attività, fatturato
   - Esportazione dati/report

8. **Notifiche, alert e log modifiche**
   - Alert automatici (scadenze, esaurimento ore…)
   - Storico modifiche (audit)

9. **Documentazione tecnica e di processo**
   - Aggiornamento continuo dei deliverable progettuali
   - Scenario test manuale finale e validazione

---

## Note operative
- Ogni milestone è suddivisibile in task più piccoli per la gestione day-by-day.
- Non procedere allo sviluppo di milestone successive senza check/test/validazione della precedente.
- Aggiornare LOG_OPERATIVO.md e README.md dopo ogni avanzamento significativo.
- In caso di variazioni o revisioni, tracciare sempre la motivazione e la nuova sequenza.

---

## Scenario test manuale
- Ogni milestone è chiara, atomica, tracciabile e validabile.
- Le dipendenze sono esplicite.
- Il file MILESTONE_FASI_DI_SVILUPPO.md è presente, accessibile e integralmente riportato nella coda di LOG_OPERATIVO.md.
- Pronto per revisione, raffinamento o scomposizione in task operativi.

---
## [2025-08-15 19:35] - Bozza architettura cartelle e componenti: creato ARCHITETTURA_CARTELLE_BOZZA.md, aggiornato log e README

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Prodotta e versionata la bozza di architettura cartelle/componenti per MVP gestionale didattica, come da checklist progettazione. Creato ARCHITETTURA_CARTELLE_BOZZA.md, incollato integralmente in coda a LOG_OPERATIVO.md e aggiornata la sezione documentazione di README.md.  
**File coinvolti**:
- ARCHITETTURA_CARTELLE_BOZZA.md (nuovo)
- LOG_OPERATIVO.md (aggiornato)
- README.md (aggiornato)

**Scenario Test**:
- ARCHITETTURA_CARTELLE_BOZZA.md presente in root e completo.
- Sezione documentazione progettuale di README.md aggiornata con la nuova bozza architettura.
- LOG_OPERATIVO.md contiene nuova entry dettagliata e backup integrale della bozza architettura in fondo al file.
- Tutte le cartelle e i documenti chiave sono tracciati e spiegati.
- Pronto per revisione e step successivi (milestone/fasi sviluppo).

**Esito atteso**:
- Struttura di progetto chiara, scalabile e conforme agli standard.
- Backup garantito anche in caso di perdita file singolo o refactor.

---

(resto del file invariato, inclusi tutte le entry precedenti e i backup INTEGRALI già presenti)

---

# === BACKUP ARCHITETTURA_CARTELLE_BOZZA.md ===

# Bozza architettura cartelle e componenti – Gestionale Didattica (MVP)

## Obiettivi di architettura
- Separazione chiara tra front-end, back-end e documentazione
- Facilità di estensione futura e mantenimento
- Rintracciabilità dei deliverable progettuali e degli standard

---

## Struttura principale (root)

- /app/             → Entry point applicazione, logiche di routing, layout generali
- /src/             → Tutto il codice sorgente “core” (componenti, logica, fetcher)
  - /components/    → Componenti UI riusabili (tabelle, form, card, dialog, ecc.)
  - /fetcher/       → Funzioni di accesso dati/API (client/server)
  - /utils/         → Funzioni di utilità e helper condivisi
  - /models/        → Schemi entità dati (tipi, interfacce, validatori)
- /public/          → Asset statici (immagini, logo, favicon, documenti pubblici)
- /docs/            → Documentazione tecnica, guide, standard, mappa funzionale, schemi ER
- /tests/           → Test automatici/unitari (quando previsti)
- /scripts/         → Script di supporto (migrazioni, seed, automazioni)
- /.github/         → Workflow, template issue/PR, check-operativo
- /output.md        → Output generati temporanei/manuali
- /context.md       → File di contesto per onboarding/recupero stato

---

## Deliverable/documentazione in root
- LOG_OPERATIVO.md
- README.md
- STANDARD_OPERATIVO.md
- Tutte le mappe/checklist/scenari/strutture dati di fase (versionate)

---

## Note operative
- Ogni cartella avrà un context.md (o README.md) che ne spiega lo scopo.
- La struttura è pensata per MVP ma facilmente scalabile.
- Il dettaglio dei componenti UI e dei models verrà raffinato nella fase di sviluppo.
- Le modifiche strutturali vanno sempre tracciate in LOG_OPERATIVO.md

---

## Scenario test manuale
- Tutte le cartelle elencate sono create e referenziate a README.md
- Ogni cartella/documento ha un context.md o README.md di spiegazione
- Nessuna componente “core” fuori da src/
- Aggiornamento log e README.md immediato dopo ogni modifica architetturale
- Backup integrale architettura incollato in LOG_OPERATIVO.md

---
## [2025-08-15 19:25] - Bozza struttura dati MVP: aggiunto STRUTTURA_DATI_BOZZA.md e aggiornati log e README

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Prodotta e versionata la bozza struttura dati per il gestionale didattica (MVP) come da checklist progettazione e scenario test. Creato STRUTTURA_DATI_BOZZA.md, incollato integralmente in coda a LOG_OPERATIVO.md e aggiornata la sezione documentazione di README.md per garantire backup e reperibilità.  
**File coinvolti**:
- STRUTTURA_DATI_BOZZA.md (nuovo)
- LOG_OPERATIVO.md (aggiornato)
- README.md (aggiornato)

**Scenario Test**:
- STRUTTURA_DATI_BOZZA.md presente in root e completo.
- Sezione documentazione progettuale di README.md aggiornata con la struttura dati.
- LOG_OPERATIVO.md contiene nuova entry dettagliata e backup integrale della bozza struttura dati in fondo al file.
- Nessun campo troncato, tutte le relazioni e le entità principali descritte.
- Pronto per revisione, discussione o raffinamento.

**Esito atteso**:
- La struttura dati permette di coprire tutte le necessità della mappa funzionale e delle regole operative.
- Nessuna entità fondamentale mancante.
- Backup garantito anche in caso di perdita file singolo.

---

## [2025-08-15 19:15] - Riepilogo stato sessione e to-do operativo fase progettazione

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Inserito riepilogo stato sessione e to-do operativo a chiusura della fase di backup deliverable progettazione (MAPPA_FUNZIONALE, CHECKLIST, SCENARIO TEST) secondo linee guida operative.
**File coinvolti**:
- LOG_OPERATIVO.md
- README.md
- MAPPA_FUNZIONALE_Version13.md
- PROGETTAZIONE_CHECKLIST_Version73.md
- SCENARIO_TEST_PROGETTAZIONE_Version73.md

**Scenario Test**:
- Il riepilogo sessione compare come entry autonoma, subito prima del backup deliverable, recando done/to do correnti.
- Tutte le entry precedenti e i backup restano invariati e integrali.
- Pronto per push contestuale di log, checklist, readme, mappa funzionale e scenario test.

**Esito atteso**:
- Il log operativo fotografa lo stato e i prossimi step con chiarezza e tracciabilità.
- La struttura aderisce agli standard e non perde nessuna informazione di contesto.

---

### RIEPILOGO STATO SESSIONE – 2025-08-15 19:15

**DONE (completato in questa sessione):**
- Backup integrale deliverable progettazione Fase 2: MAPPA_FUNZIONALE_Version13.md, PROGETTAZIONE_CHECKLIST_Version73.md, SCENARIO_TEST_PROGETTAZIONE_Version73.md incollati integralmente in coda a LOG_OPERATIVO.md.
- Stessi file singoli presenti e versionati nella root del progetto.
- README.md aggiornato con backup integrale nella sezione documentazione progettuale.
- LOG_OPERATIVO.md aggiornato (partendo dalla versione lunga) con nuova entry, scenario test, deliverable incollati integralmente dopo tutte le entry precedenti.
- CMD/PowerShell per push forniti sia per solo LOG_OPERATIVO.md che per il push multiplo di tutti i file deliverable + README.md + LOG_OPERATIVO.md.
- Scenario test manuale fornito per verifica integrità/backup/aderenza allo standard operativo.

**TO DO (prossimi step consigliati):**
- Procedere con la bozza struttura dati (entità chiave, relazioni, attributi principali) e successivamente architettura cartelle/componenti e milestone di sviluppo.
- Ogni nuovo deliverable dovrà essere:
  - Versionato come file singolo
  - Incollato integralmente in coda al LOG_OPERATIVO.md (con entry dedicata)
  - Integrato nel README.md se rientra tra i documenti progettuali di fase
- Aggiornare LOG_OPERATIVO.md dopo ogni passaggio significativo, come da procedura.
- Se aggiorni uno dei deliverable già incollati, ricordati di aggiornare anche la copia nel log e nel README.
- Eseguire periodicamente scenario test manuali per garantire coerenza, backup e reperibilità di ogni deliverable.

---

## [2025-08-15 18:50] - Rinominato GIT_COMMANDS_Version7.md in GIT_COMMANDS.md e aggiornati riferimenti

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Rinomina file comandi git per uniformare la nomenclatura ed eliminare la versione dal nome; aggiornati tutti i riferimenti nei documenti di standard e README.  
**File coinvolti**:
- GIT_COMMANDS_Version7.md (rinominato)
- GIT_COMMANDS.md (nuovo nome)
- LOG_OPERATIVO.md
- STANDARD_OPERATIVO.md
- README.md

**Scenario Test**:
- Verificato che GIT_COMMANDS.md sia presente e accessibile nella repo.
- Tutti i riferimenti nei documenti puntano al nuovo nome file.
- Il vecchio file GIT_COMMANDS_Version7.md non risulta più presente nella struttura.
- Provato a copiare i comandi dal file rinominato, confermata la corretta visualizzazione e utilizzo.

**Esito atteso**:
- Nome file coerente e riferimenti uniformati in tutta la documentazione.
- Nessun errore di link o riferimento nei documenti operativi.

**Note**:
- In caso di riferimenti interni in altri file (es. issue template, CONTRIBUTING.md), aggiornarli contestualmente.

---

## [2025-08-15 18:40] - Aggiornamento GIT_COMMANDS_Version7.md: snippet comandi git standardizzati

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Aggiornati gli snippet pronti di comandi git in GIT_COMMANDS_Version7.md per uniformità tra CMD e PowerShell e coerenza con le regole operative.  
**File coinvolti**:
- GIT_COMMANDS_Version7.md
- LOG_OPERATIVO.md

**Scenario Test**:
- Copiato e incollato i blocchi CMD/PowerShell, verificato che siano corretti e pronti all’uso immediato.
- Controllato che i comandi siano conformi agli standard operativi, senza commenti all’interno dei blocchi di codice.

**Esito atteso**:
- Comandi git aggiornati e uniformi, pronti per copia/incolla operativo.

**Note**:
- Se in futuro cambia lo standard operativo, aggiornare anche STANDARD_OPERATIVO.md e README.md.

---

## [2025-08-15 18:30] - Chiusura fase requisiti gestionale didattica e promemoria scenario test

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Conclusa la raccolta e validazione dei requisiti base per il gestionale didattica (MVP).  
**File coinvolti**:
- GESTIONALE_REQUISITI_BASE.md (nuovo)
- LOG_OPERATIVO.md

**Scenario Test**:
- Riepilogati, validati e confermati tutti i requisiti e dati minimi necessari.
- Prodotto file di checklist GESTIONALE_REQUISITI_BASE.md con tutte le specifiche approvate.
- Confermato che non si procede con progettazione tecnica/codifica finché non viene completata e validata la fase 2. Scenario Test - Progettazione.

**Esito atteso**:
- Tutti i requisiti sono raccolti, discussi e documentati.
- Il file GESTIONALE_REQUISITI_BASE.md funge da riferimento e checklist.
- Il log operativo fotografa la chiusura della fase di analisi e blocca la progettazione sullo scenario test.

**Note**:
- Ricordarsi di aggiornare sempre LOG_OPERATIVO.md dopo ogni decisione strutturale.
- Prima di codificare, validare la fase 2. Scenario Test - Progettazione.

---

## [2025-08-15 18:20] - Sincronizzazione struttura progetto e push file/cartelle mancanti

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Push di tutti i file e cartelle presenti localmente ma assenti dal repository remoto. Allineamento completo tra struttura locale e GitHub.  
**File coinvolti**:
- STANDARD_OPERATIVO.md
- context.md
- END_SESSION.md
- ONBOARDING_SESSION.md
- output.md
- GIT_COMMANDS_Version7.md
- .gitignore (rimosso gitignore senza punto)
- app/
- public/
- src/

**Scenario Test**:
- Controllo visivo delle differenze tra repository GitHub e struttura locale tramite screenshot.
- Eseguite operazioni di add/rm/commit/push per sincronizzare tutti i file e cartelle mancanti.
- Verificato su GitHub che tutti i file e le cartelle siano presenti e corrispondano a quelle locali.
- Confermato che la struttura rispetti lo STANDARD_OPERATIVO.md.

**Esito atteso**:
- Nessun file/cartella presente in locale risulta mancante su GitHub.
- Struttura perfettamente allineata.
- Repository pronto a ricevere ulteriori modifiche secondo procedure standard.

**Note**:
- In caso di file temporanei, valutare se inserirli in .gitignore.
- Se la struttura cambia, aggiornare anche README.md e STANDARD_OPERATIVO.md.

---

## [2025-08-15 18:15] - Pulizia branch test-failure-PR completata dopo merge e verifica

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Eliminazione branch test-failure-PR locale e remoto dopo merge riuscito. Verifica integrità flusso operativo.  
**File coinvolti**:
- test-failure-PR (branch eliminato sia localmente che su origin)
- LOG_OPERATIVO.md

**Scenario Test**:
- Switch su branch main.
- Eliminazione branch test-failure-PR in locale e su GitHub.
- Commit e push LOG_OPERATIVO.md.
- Confermata integrità del repository, nessun branch di test residuo.
- Pronto per test di robustezza (riavvio PC e verifica memoria chat/contesto).

**Esito atteso**:
- Repository pulito da branch di test non più necessari.
- Log operativo aggiornato.
- Dopo riavvio, il sistema deve essere in grado di ricostruire lo stato e la cronologia lavori.

**Note**:
- Entry conforme a STANDARD_OPERATIVO.md.

---

## [2025-08-15 18:10] - Pulizia branch test completati dopo merge

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Eliminazione branch test-failure-PR dopo merge riuscito e superamento test workflow.  
**File coinvolti**:
- test-failure-PR (branch eliminato, remoto e locale)
- LOG_OPERATIVO.md

**Scenario Test**:
- PR su test-failure-PR fusa con successo in main.
- Tutti i check superati.
- Branch test-failure-PR eliminato sia da GitHub che localmente dopo cambio branch su main.
- Nessun impatto sul flusso operativo principale.

**Esito atteso**:
- Repository pulito da branch di test non più necessari.
- Log operativo aggiornato.

**Note**:
- Entry conforme a STANDARD_OPERATIVO.md.

---

## [2025-08-15 18:05] - Pulizia branch test completati

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Eliminazione branch test-failure-PR dopo merge riuscito e superamento test workflow  
**File coinvolti**:
- test-failure-PR (branch eliminato, remoto e locale)
- LOG_OPERATIVO.md

**Scenario Test**:
- PR su test-failure-PR fusa con successo in main.
- Tutti i check superati.
- Branch test-failure-PR eliminato sia da GitHub che localmente.
- Nessun impatto sul flusso operativo principale.

**Esito atteso**:
- Repository pulito da branch di test non più necessari.
- Log operativo aggiornato.

**Note**:
- Entry conforme a STANDARD_OPERATIVO.md.

---

## [2025-08-15 18:00] - Conclusione ciclo diagnostica workflow: superamento test e ripristino merge

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Conclusione ciclo di test e diagnostica su workflow operativi. Tutti i check superati, merge sbloccato.  
**File coinvolti**:
- .github/workflows/check-log-operativo.yml
- LOG_OPERATIVO.md

**Scenario Test**:
- Eseguiti test ripetuti con aggiornamento workflow e diagnostica avanzata.
- Commit, push e PR aggiornata.
- Tutti i check superati, merge disponibile senza conflitti.
- Flusso operativo ripristinato e documentato.

**Esito atteso**:
- I workflow operativi funzionano come da standard.
- Merge consentito solo se il log operativo è aggiornato.

**Note**:
- Entry conforme a STANDARD_OPERATIVO.md.

---

## [2025-08-15 17:55] - Risoluzione blocco workflow e ripresa flusso merge

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Sostituzione e diagnostica avanzata su check-log-operativo.yml, superamento blocco check modifiche file, merge workflow riuscito  
**File coinvolti**:
- .github/workflows/check-log-operativo.yml
- LOG_OPERATIVO.md

**Scenario Test**:
- Sostituito workflow check-log-operativo.yml con versione diagnostica avanzata (fetch main e debug).
- Commit, push e PR aperta.
- Verificato nei log che la lista dei file modificati era corretta.
- Il check “Verifica presenza LOG_OPERATIVO.md tra i file modificati” è passato correttamente.
- Merge ora possibile senza conflitti.

**Esito atteso**:
- Il blocco workflow è risolto.
- Flusso operativo ripristinato.
- Se si rilevano regressioni o errori, aggiornare lo standard e ripetere la diagnostica.

**Note**:
- Entry conforme a STANDARD_OPERATIVO.md.

---

## [2025-08-15 17:40] - Diagnostica avanzata per workflow bloccato su verifica file modificati

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Test e diagnostica per superamento workflow bloccante su modifica README.md e LOG_OPERATIVO.md  
**File coinvolti**:
- README.md
- LOG_OPERATIVO.md
- .github/workflows/[NOME_WORKFLOW].yml (debug fetch e diff branch)

**Scenario Test**:
- Modificato README.md e LOG_OPERATIVO.md con entry conforme.
- Aggiunti step di fetch e debug alla pipeline per mostrare branch remoti e diff reale.
- Commit e push di tutti i file.
- Apertura PR con verifica lista file realmente visti dal workflow e superamento check.

**Esito atteso**:
- La diagnostica mostra la vera lista file modificati.
- Il check "Verifica presenza LOG_OPERATIVO.md tra i file modificati" passa se la pipeline è corretta e i file sono effettivamente visti.
- Se il check fallisce ancora, il log di debug mostra il motivo.

**Note**:
- Entry conforme a STANDARD_OPERATIVO.md.
- Se la pipeline viene aggiornata, ricordarsi di descrivere la modifica anche in STANDARD_OPERATIVO.md.

---

## [2025-08-15 17:30] - Test workflow: modifica README.md e verifica superamento check operativi

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Test workflow GitHub Actions tramite modifica a README.md  
**File coinvolti**:
- README.md
- LOG_OPERATIVO.md

**Scenario Test**:
- Modificato README.md per testare il trigger workflow e la validazione automatica.
- Aggiornato LOG_OPERATIVO.md con una entry conforme che cita tutti i file modificati.
- Commit e push di entrambi i file.
- Apertura PR: verifica superamento workflow.

**Esito atteso**:
- Il check "Verifica presenza LOG_OPERATIVO.md tra i file modificati" deve passare.
- Il check "Controllo Operativo Bloccante" deve passare se la formattazione è conforme.

**Note**:
- Entry conforme a STANDARD_OPERATIVO.md.

---

## [2025-08-15 16:45] - Fix contenuto check-operativo.js: rimossi header/commenti non JS

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Correzione file .github/scripts/check-operativo.js, ora contiene solo codice JS valido senza commenti non JS  
**File coinvolti**:
- .github/scripts/check-operativo.js

**Scenario Test**:
- Sostituito il contenuto di .github/scripts/check-operativo.js con la versione fornita.
- Commit e push della modifica.
- Aggiornamento PR, verifica che il check bloccante venga eseguito senza errori di sintassi JS.
- Prossimo step: verifica esito workflow e aggiornamento log operativo con risultato finale.

---

## [2025-08-15 16:10] - Test: superamento workflow bloccante con entry conforme e dettagliata

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Test di superamento workflow bloccante su PR che modifica sia README.md sia LOG_OPERATIVO.md  
**File coinvolti**:
- README.md
- LOG_OPERATIVO.md

**Scenario Test**:
- Modifica di README.md (aggiunta riga di test) e aggiornamento contestuale di LOG_OPERATIVO.md con entry formattata e dettagliata.
- Commit e push su branch `test-failure-PR`.
- Apertura PR verso main, verifica passaggio dei workflow bloccanti.

**Esito atteso**:
- Tutti i workflow (“Controllo LOG_OPERATIVO.md”, “Controllo Operativo Bloccante”) devono passare, consentendo il merge.

**Note**:
- La entry include tutti i file modificati e rispetta il formato richiesto da STANDARD_OPERATIVO.md.

---

## [2025-08-15 15:40] - Conferma funzionamento check bloccanti su PR

- Eseguito commit e push: "Test: esito trigger workflow su PR, check bloccanti attivi come atteso".
- Aperta PR: i workflow vengono eseguiti e i check falliscono come atteso, bloccando il merge.
- Scenario test conforme a STANDARD_OPERATIVO.md: workflow bloccanti attivi e funzionanti.
- Prossimo step: modificare LOG_OPERATIVO.md in modo conforme per verificare superamento dei check operativi.

---

## [2025-08-15 15:30] - Test trigger workflow su PR

- Modificato README.md per testare il trigger dei workflow su Pull Request.
- Eseguito commit e push su branch `test-failure-PR`.
- Aperta PR verso `main`, verificato che i check GitHub Actions vengano eseguiti.
- Esito: **I workflow vengono eseguiti regolarmente** su PR non relative a LOG_OPERATIVO.md.
- I check “Controllo LOG_OPERATIVO.md” e “Controllo Operativo Bloccante” falliscono attivamente come atteso, perché la modifica non aggiorna il LOG_OPERATIVO.md.
- Scenario test positivo: i workflow bloccano il merge in modo corretto secondo le regole operative.
- Prossimo step: test su PR con modifica e aggiornamento di LOG_OPERATIVO.md per verifica superamento check.

---

## [2025-08-15 12:25] - Creazione struttura di progetto iniziale

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Setup base del gestionale, strutturazione iniziale  
**File coinvolti**:
- app/
- src/components/
- src/fetcher/
- public/
- context.md
- app/context.md
- src/components/context.md
- src/fetcher/context.md
- public/context.md

**Scenario Test**:
- Verificata la presenza di tutte le cartelle e dei rispettivi file context.md

**Note**:
- Standard operativo definito in STANDARD_OPERATIVO.md

**TODO**:
- Inizializzare Next.js

---

# Mini-checklist per LOG_OPERATIVO.md

- [ ] Versione STANDARD_OPERATIVO.md aggiornata e riportata
- [ ] Scenario Test presente e chiaro
- [ ] Tutti i file coinvolti sono elencati
- [ ] Note e TODO aggiornati

---

## [2025-08-15 19:10] - Backup integrale deliverable progettazione Fase 2 (MAPPA_FUNZIONALE, CHECKLIST, SCENARIO TEST) incollati in LOG_OPERATIVO.md

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Incollati integralmente in coda a LOG_OPERATIVO.md i tre deliverable chiave della fase 2 progettazione: MAPPA_FUNZIONALE_Version13.md, PROGETTAZIONE_CHECKLIST_Version73.md, SCENARIO_TEST_PROGETTAZIONE_Version73.md. Garantito backup storico e recuperabilità anche in caso di perdita dei file singoli.  
**File coinvolti**:
- LOG_OPERATIVO.md
- MAPPA_FUNZIONALE_Version13.md
- PROGETTAZIONE_CHECKLIST_Version73.md
- SCENARIO_TEST_PROGETTAZIONE_Version73.md
- README.md

**Scenario Test**:
- Dopo questa entry, il contenuto dei tre file risulta incollato integralmente e inalterato in coda a LOG_OPERATIVO.md.
- In caso di perdita o cancellazione accidentale dei file singoli, il backup rimane recuperabile dal log.
- In caso di revisione futura, aggiornare contestualmente log, README e i file separati.

**Esito atteso**:
- Conformità totale allo standard operativo: nessun deliverable di fase 2 risulta disperso.
- Pronto per revisione e proseguimento con le prossime milestone progettuali.

**Note**:
- In caso di modifica di uno qualsiasi dei deliverable, aggiornare contestualmente anche il backup nel log.

---

# === BACKUP INTEGRALE DELIVERABLE PROGETTAZIONE FASE 2 ===

## MAPPA_FUNZIONALE_Version13.md

# Mappa funzionale – Gestionale Didattica (MVP)

## Obiettivo gestionale
Supportare la gestione operativa e amministrativa delle attività didattiche, con particolare attenzione a: pacchetti ore, anagrafica clienti, fatturazione, monitoraggio attività, e reporting.

---

## Funzionalità principali

### 1. Gestione anagrafica clienti
- Creazione, modifica, eliminazione di clienti (enti, aziende, privati)
- Gestione dettagli: dati fiscali, contatti, note operative

### 2. Gestione pacchetti ore
- Creazione/assegnazione di pacchetti ore a clienti
- Monitoraggio consumo ore per cliente e per progetto
- Segnalazione automatica esaurimento/soglia ore

### 3. Gestione attività e rendicontazione
- Registrazione attività svolte (data, ora, descrizione, operatore, cliente associato)
- Collegamento attività a pacchetti ore
- Calcolo automatico ore residue

### 4. Fatturazione e amministrazione
- Generazione documenti di fatturazione (proforma, fattura, ricevuta)
- Esportazione dati per amministrazione
- Stato pagamenti e scadenze

### 5. Reportistica e dashboard
- Visualizzazione riepiloghi per cliente, attività, pacchetti ore, fatturato
- Esportazione report (PDF, XLS)
- Indicatori di performance (ore erogate, residuo, valore economico)

---

## Funzionalità secondarie/di supporto

### 6. Gestione utenti e permessi
- Ruoli: amministratore, operatore, visualizzatore
- Accesso e gestione differenziata dei dati a seconda del ruolo

### 7. Notifiche e alert
- Alert automatici su scadenze, esaurimento ore, mancata rendicontazione

### 8. Audit e storico modifiche
- Log delle modifiche su dati critici (anagrafica, pacchetti, attività)

---

## Funzionalità future (fuori MVP, opzionali)
- Integrazione con sistemi esterni (es. CRM, contabilità)
- Accesso clienti (portalino)
- Integrazione calendario
- App mobile

---

## Note operative
- Ogni funzionalità dovrà essere poi mappata su entità dati e componenti UI nelle prossime fasi.
- La mappa funzionale può essere aggiornata in iterazioni successive prima del “GO”.

---

## PROGETTAZIONE_CHECKLIST_Version73.md

# Checklist Fase 2 – Progettazione Gestionale Didattica

## 1. Raccolta e validazione requisiti
- [x] Requisiti raccolti e documentati (`GESTIONALE_REQUISITI_BASE.md`)
- [x] Entry di chiusura fase requisiti su `LOG_OPERATIVO.md`
- [x] Validazione formale (in chat e nel log) per passaggio a Fase 2

## 2. Progettazione tecnica – Deliverable da produrre e validare
- [ ] Mappa funzionale (elenco e descrizione funzioni principali/secondarie)
- [ ] Bozza struttura dati (entità, relazioni, attributi chiave; anche schema ER/tabella)
- [ ] Bozza architettura cartelle/componenti (con spiegazione suddivisione logica)
- [ ] Lista milestone/fasi di sviluppo (sequenza, priorità, dipendenze)

## 3. Scenario test manuale per la progettazione
- [ ] Tutti i deliverable sono presenti e accessibili
- [ ] Deliverable coerenti coi requisiti raccolti
- [ ] Nessun file di codice/progetto generato prima della validazione
- [ ] Validazione formale e “GO” alla progettazione/codifica approvati (in chat e su `LOG_OPERATIVO.md`)

## 4. Aggiornamento documenti di processo
- [ ] Entry di chiusura fase progettazione su `LOG_OPERATIVO.md` (completa e dettagliata)
- [ ] Aggiornamento `STANDARD_OPERATIVO.md` se necessario
- [ ] Aggiornamento `README.md` se necessario

---

## Note operative
- Usa questa checklist per monitorare lo stato tra una sessione e l’altra.
- Non passare alla codifica se non hai tutte le spunte nella sezione 3.
- Ogni step significativo va tracciato sia in chat che su `LOG_OPERATIVO.md`.
- In caso di revisione, aggiorna questa checklist e il log.

---

## SCENARIO_TEST_PROGETTAZIONE_Version73.md

# Scenario Test Manuale – Progettazione Gestionale Didattica

## Obiettivo
Validare la fase di progettazione tecnica prima di qualsiasi attività di codifica, assicurando che siano prodotti e approvati tutti i deliverable di progetto secondo requisiti e standard.

---

## Deliverable richiesti

1. **Mappa funzionale**
   - Elenco delle funzioni principali e secondarie del gestionale, con descrizione sintetica del loro obiettivo.
2. **Bozza di struttura dati**
   - Rappresentazione (anche preliminare) delle entità chiave, relazioni tra dati, e principali attributi.
   - Può essere uno schema ER, una tabella di sintesi, o un diagramma.
3. **Bozza di architettura delle cartelle e componenti**
   - Proposta di struttura delle principali cartelle (es. src/, app/, public/, ecc.) e dei macro-componenti, con spiegazione della suddivisione logica.
4. **Lista delle milestone/fasi di sviluppo**
   - Sequenza delle macro-fasi (ad es: setup ambiente, implementazione autenticazione, gestione utenti, …), con priorità e dipendenze.

---

## Scenario di validazione manuale

- Tutti i deliverable sopra elencati sono presenti e accessibili nella repository/project documentation.
- La mappa funzionale è coerente con i requisiti raccolti.
- La struttura dati è sufficiente per permettere una progettazione tecnica dettagliata nella fase successiva.
- La proposta di architettura di cartelle e componenti rispetta le linee guida tecniche (STANDARD_OPERATIVO.md, eventuali vincoli tecnologici).
- La lista delle milestone copre tutte le funzionalità previste, con priorità e dipendenze corrette.
- **Validazione formale:**  
  Nessun file di progetto/codice viene generato prima dell’approvazione esplicita (in chat e/o nel log-operativo) di tutti i deliverable di progettazione da parte del responsabile progetto/PO.
- **Criterio di superamento:**  
  Il responsabile progetto/PO conferma in chat e con apposita entry in LOG_OPERATIVO.md che la fase di progettazione è “GO”.

---

## Checklist di validazione

- [ ] Tutti i deliverable richiesti sono presenti e accessibili
- [ ] Coerenza rispetto ai requisiti raccolti (vedi GESTIONALE_REQUISITI_BASE.md)
- [ ] Struttura dati e architettura cartelle/componenti sufficientemente dettagliate
- [ ] Milestone/fasi complete e ordinate
- [ ] Validazione e “GO” alla codifica approvati e loggati

---

## Note
- In caso di revisione o modifica a uno qualsiasi dei deliverable, aggiornare contestualmente la documentazione e il log operativo.
- Nessuna codifica o creazione di file tecnici fino a validazione conclusa.

---

# Fine backup integrale deliverable progettazione Fase 2

---

# === BACKUP STRUTTURA_DATI_BOZZA.md ===

# Bozza struttura dati – Gestionale Didattica (MVP)

## Entità principali

### CLIENTE
- id_cliente (PK)
- ragione_sociale
- tipo_cliente (azienda, ente, privato)
- partita_iva/codice_fiscale
- email
- telefono
- indirizzo
- note
- data_creazione

---

### PACCHETTO_ORE
- id_pacchetto (PK)
- id_cliente (FK → CLIENTE)
- descrizione
- ore_acquistate
- ore_residue
- data_attivazione
- data_scadenza
- stato (attivo, esaurito, scaduto)
- note

---

### ATTIVITÀ
- id_attività (PK)
- id_pacchetto (FK → PACCHETTO_ORE)
- id_operatore (FK → UTENTE)
- data
- ora_inizio
- ora_fine
- durata_ore
- descrizione
- note

---

### FATTURA
- id_fattura (PK)
- id_cliente (FK → CLIENTE)
- id_pacchetto (FK → PACCHETTO_ORE)
- numero_fattura
- data_emissione
- importo
- stato_pagamento (da saldare, saldo parziale, saldata)
- data_scadenza
- data_pagamento
- note

---

### UTENTE
- id_utente (PK)
- nome
- cognome
- email
- ruolo (amministratore, operatore, visualizzatore)
- stato (attivo, sospeso)
- data_creazione

---

### NOTIFICA
- id_notifica (PK)
- destinatario (id_utente o id_cliente)
- tipo_notifica (scadenza, esaurimento ore, amministrazione, ecc.)
- testo
- data_creazione
- letto (boolean)

---

### LOG_MODIFICHE
- id_log (PK)
- entità_modificata (CLIENTE, PACCHETTO_ORE, ATTIVITÀ, ecc.)
- id_record
- azione (creazione, modifica, cancellazione)
- autore (id_utente)
- data_ora
- dettagli

---

## Relazioni principali

- Un CLIENTE può avere molti PACCHETTO_ORE
- Un PACCHETTO_ORE può avere molte ATTIVITÀ
- Un CLIENTE può avere molte FATTURA
- Un PACCHETTO_ORE può essere associato a 0...n FATTURA (opzionale)
- Un ATTIVITÀ è svolta da un UTENTE (operatore)
- Le NOTIFICHE possono essere associate a UTENTE e/o CLIENTE

---

## Note operative

- I campi note sono opzionali e servono per dettagli operativi.
- Gli stati (es. stato pacchetto, stato fattura, ruolo utente) vanno mappati su enum/tabella di riferimento.
- In fase di progettazione dettagliata, le entità potranno essere raffinate/estese (es. aggiunta storicizzazione, gestione allegati, ecc.).
- Possibili estensioni future: entità PROGETTO, gestione documenti, storico accessi.

---