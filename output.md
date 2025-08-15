# Struttura del progetto gestionale ore (Next.js)

Questa repository segue una struttura modulare e ordinata per facilitare la manutenzione e l’estensione del gestionale.

## Cartelle principali

- `app/`: contiene le pagine dell’applicazione, le API localizzate e i layout principali (Next.js "app router").
- `src/components/`: componenti React riusabili (UI, CRUD, ecc.).
- `src/fetcher/`: funzioni che gestiscono le chiamate alle API lato frontend.
- `public/`: risorse statiche (immagini, icone, ecc.).

Consulta il file `context.md` in ogni cartella per una descrizione dettagliata del suo scopo.# Checklist Fine Sessione (END_SESSION)

> Da usare prima di chiudere la sessione/terminare il lavoro

- [ ] Ho aggiornato LOG_OPERATIVO.md con tutte le modifiche (inclusa versione STANDARD_OPERATIVO.md).
- [ ] Ho fornito/registrato uno SCENARIO TEST per ogni nuova feature.
- [ ] Ho aggiornato README.md e/o STANDARD_OPERATIVO.md se ho cambiato regole o struttura (in caso, avviso Copilot).
- [ ] Ho eseguito tutti i comandi git per aggiungere, committare e pushare le modifiche (vedi GIT_COMMANDS.md).
- [ ] Ho ricontrollato che tutte le checklist siano complete.
- [ ] Per ogni dubbio o incertezza, consulto STANDARD_OPERATIVO.md.

> Basta aprire questa checklist a fine sessione e spuntare (mentalmente o fisicamente) ogni punto!# Comandi Git Standard (snippet pronti)

## CMD
```
git add LOG_OPERATIVO.md
git add <files_da_aggiornare>
git commit -m "Aggiorna LOG_OPERATIVO.md e <breve_descrizione>"
git push
```

## PowerShell
```
git add LOG_OPERATIVO.md
git add <files_da_aggiornare>
git commit -m "Aggiorna LOG_OPERATIVO.md e <breve_descrizione>"
git push
```

> Sostituisci `<files_da_aggiornare>` con i file reali modificati.
> Copia e incolla questi blocchi ogni volta che devi salvare su GitHub, come da standard.
> NON serve allegare questo file a ogni sessione: tienilo nella repo come reference.## [2025-08-15 12:25] - Creazione struttura di progetto iniziale

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

# Come usare STANDARD_OPERATIVO.md nel flusso di lavoro

**All’inizio di ogni sessione**
- Apri e consulta STANDARD_OPERATIVO.md per ricordare regole e formato prima di iniziare.
- Se necessario, apri anche ONBOARDING_SESSION.md per la checklist rapida.

**Durante la sessione**
- Ogni volta che fai una modifica o hai un dubbio, torna a STANDARD_OPERATIVO.md per verificare che le regole siano rispettate.
- Usa LOG_OPERATIVO.md e la mini-checklist per tracciare ogni modifica.

**A fine sessione**
- Verifica che tutte le regole di STANDARD_OPERATIVO.md siano state rispettate.
- Aggiorna LOG_OPERATIVO.md se servono ritocchi.
- Salva tutto su GitHub con i comandi standard (consulta GIT_COMMANDS.md).
- Apri END_SESSION.md e spunta ogni voce della checklist prima di chiudere.

---

# Mini-checklist per LOG_OPERATIVO.md

> Da inserire anche in fondo a LOG_OPERATIVO.md (o tenere come file a parte)

- [ ] Versione STANDARD_OPERATIVO.md aggiornata e riportata
- [ ] Scenario Test presente e chiaro
- [ ] Tutti i file coinvolti sono elencati
- [ ] Note e TODO aggiornati
- [ ] Se ho dubbi su formato/contenuto, consulto STANDARD_OPERATIVO.md

> Usa questa checklist ogni volta che aggiungi una entry al log operativo!

> Ricorda: STANDARD_OPERATIVO.md è la fonte di verità e va consultato SEMPRE prima di ogni step importante!# Checklist Inizio Sessione (ONBOARDING)

> Da aprire e leggere ad ogni avvio di sessione di lavoro

- [ ] Ho letto STANDARD_OPERATIVO.md e ricordo le regole principali di formato e governance.
- [ ] Per ogni dubbio o incertezza, consulto prima STANDARD_OPERATIVO.md.
- [ ] Ho chiaro il contesto e l’obiettivo della sessione/coding.
- [ ] Se il contesto è vago, lo chiarisco prima di agire (o lo chiedo a Copilot).
- [ ] Mi assicuro che ogni modifica futura sia tracciata in LOG_OPERATIVO.md.
- [ ] Ricordo che ogni modifica va poi salvata su GitHub (vedi GIT_COMMANDS.md per i comandi).
- [ ] NON serve allegare README.md o GIT_COMMANDS.md in ogni sessione: sono reference stabili nella repo.

> Puoi copiare questa checklist all’inizio di ogni sessione o tenerla sempre aperta!# Gestionale Pacchetti Ore

Questo progetto segue SEMPRE e SOLO STANDARD_OPERATIVO.md come fonte di verità operativa.
Gestionale Next.js con struttura modulare.

> **Standard operativo:**  
> Tutte le operazioni, i formati e le convenzioni seguono il file [STANDARD_OPERATIVO.md](./STANDARD_OPERATIVO.md).
>  
> Se modifichi la struttura o aggiungi regole, aggiorna SEMPRE anche lo standard.

## Struttura cartelle principale

- `/app` — pagine, layout e route API Next.js
- `/src/components` — Componenti React riusabili
- `/src/fetcher` — Funzioni per chiamate API lato frontend
- `/public` — Asset statici

Consulta anche i `context.md` nelle varie cartelle per dettagli di scopo.
# STANDARD OPERATIVO E FORMATTAZIONE (VINCOLANTE)

> **IMPORTANTE:**  
> Se modifichi la struttura del progetto o le regole operative, aggiorna SEMPRE questo file e avvisa in LOG_OPERATIVO.md e in chat.

## Regole di governance e collaborazione

- Segui SEMPRE tutte le regole vincolanti di formato e comportamento in questo file.
- Ogni gruppo di comandi va dato in due blocchi distinti: CMD e PowerShell, nessun commento nei blocchi, una riga = un comando, spiegazioni solo fuori.
- Quando modifichi file, fornisci sempre file completi (non patch), elenca prima i file coinvolti, non cambiare stile.
- Dopo ogni step significativo aggiorna LOG_OPERATIVO.md e fornisci i comandi git per commit/push (se serve).
- **Contesto e obiettivi:** Se non sono chiari, chiedi sempre chiarimenti prima di procedere. Ricorda all’utente di spiegare meglio se è vago.
- **Proposte strutturali:** Se hai dubbi, chiedi conferma distinguendo tra scelte “consigliate” e “opzionali”.
- **SCENARIO TEST:** Suggerisci e descrivi sempre uno scenario test manuale per ogni funzionalità o feature, anche se non richiesto.
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