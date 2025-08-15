# Task operativi milestone 1 – Setup ambiente e infrastruttura

**Riferimento milestone:**  
1. Setup ambiente e infrastruttura (`MILESTONE_FASI_DI_SVILUPPO.md`)

## Obiettivo milestone
Inizializzare il progetto, impostare la struttura delle cartelle, configurare i workflow di automazione (GitHub Actions), garantire ambiente di sviluppo/test replicabile e tracciato.

---

## Task/issue operativi

### 1. Creazione repository e struttura cartelle base

- Inizializza repo (se non già fatto), struttura le cartelle principali come da `ARCHITETTURA_CARTELLE_BOZZA.md`.
- Crea i file `context.md` o `README.md` in ogni cartella, spiegando scopo e regole d’uso.
- **Scenario test:**  
  - Clonando la repo da zero si trovano tutte le cartelle e i file di contesto previsti
  - Ogni cartella/folder è spiegata dal relativo file

---

### 2. Inizializzazione progetto (framework, dipendenze base)

- Setup ambiente node (o altro), installa framework scelto (Next.js, ecc.), inserisci dipendenze minime.
- Esegui `npm init`/`yarn init` e primo commit di package.json, lockfile, ecc.
- **Scenario test:**  
  - Da un clone pulito, `npm install` (o analogo) funziona senza errori
  - Il comando di avvio (`npm run dev`, ecc.) mostra la shell di base del framework

---

### 3. Configurazione .gitignore e file di standard

- Imposta un `.gitignore` coerente (node_modules, output temporanei, file di build…)
- Verifica e aggiorna `STANDARD_OPERATIVO.md` se necessario
- **Scenario test:**  
  - File e cartelle da escludere non vengono committati
  - Nessun file di configurazione strategico viene escluso erroneamente

---

### 4. Setup workflow GitHub Actions (CI/check operativi)

- Crea workflow base per:
  - Check presenza e aggiornamento di `LOG_OPERATIVO.md` su ogni PR
  - Check di conformità formale/strutturale dove applicabile
- Includi template base per issue/PR nella cartella `.github/`
- **Scenario test:**  
  - Creando una PR, i workflow si attivano e bloccano merge se mancano log o formattazione
  - I template vengono proposti correttamente nella UI GitHub

---

### 5. Setup ambiente di testing locale

- Definisci procedure e script per test locale (avvio, build, lint, ecc.)
- Documenta in `README.md` i comandi chiave per sviluppatori
- **Scenario test:**  
  - Un nuovo dev può leggere README.md e far partire l’ambiente locale senza errori
  - I comandi di test e lint funzionano e danno feedback chiaro

---

### 6. Aggiornamento README.md e LOG_OPERATIVO.md

- Aggiorna README.md con istruzioni aggiornate, riferimenti ai task e scenario test
- Aggiorna LOG_OPERATIVO.md dopo ogni step significativo (creazione cartelle, setup, workflow…)
- **Scenario test:**  
  - README.md è allineato e aggiornato
  - LOG_OPERATIVO.md fotografa ogni step con entry conforme

---

## Sequenza consigliata

1. Creazione struttura repo/cartelle
2. Inizializzazione progetto e dipendenze
3. Configurazione .gitignore e standard
4. Setup workflow e template GitHub
5. Setup ambiente test locale
6. Aggiornamento documentazione e log

---

## Checklist milestone

- [ ] Tutte le cartelle e file di contesto sono creati e spiegati
- [ ] Framework e dipendenze installati
- [ ] .gitignore e file standard aggiornati
- [ ] Workflow e template attivi
- [ ] Ambiente locale funzionante/documentato
- [ ] README.md e LOG_OPERATIVO.md aggiornati e coerenti

---

## Note operative

- Non procedere con milestone successive senza aver chiuso e tracciato tutti i task di questa.
- Ogni modifica strutturale (cartelle, workflow, regole standard) va documentata su LOG_OPERATIVO.md e README.md.
- Se emergono revisioni o problemi, aggiornare anche STANDARD_OPERATIVO.md.
- Ogni task può (e dovrebbe) essere tracciato come issue GitHub, con questa checklist come riferimento.

---