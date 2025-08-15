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

## [2025-08-15] - Fix permessi push workflow

- Generato nuovo Personal Access Token (PAT) con permesso workflow.
- Aggiornato le credenziali di sistema.
- Rieffettuato push dei workflow in .github/workflows/.
- Scenario test: vedi sopra.

## [2025-08-15 14:19] - Test fallito e spostamento workflow

- Ho spostato i workflow in `.github/workflows/` e lo script in `.github/scripts/`
- Aggiornate le istruzioni personali per maggiore chiarezza
- Pronto per testare il funzionamento dei workflow su GitHub Actions
- Prossimo step: push file, test PR e verifica check automatici

---

## [2025-08-15 14:21] - Test fallito e spostamento workflow

- Spostato i workflow in `.github/workflows/` e gli script in `.github/scripts/`
- Aggiornate le istruzioni personali per maggiore chiarezza
- Push fallito: manca permesso `workflow` sul PAT
- Prossimo step: generare nuovo PAT con permesso `workflow`, aggiornare credenziale, ripetere push

---

## [2025-08-15 15:15] - Trovata causa blocco credenziali (PAT hardcoded in remote)

- Analisi configurazione: nessun helper attivo, remote.origin.url con PAT hardcoded
- Problema: Git non chiede mai credenziali perché usa sempre il PAT vecchio nell’URL
- Soluzione: ripristinato remote senza PAT, cancella tutte le credenziali da Gestore Windows, push forzato con nuovo PAT corretto
- Prossimo step: test push, verifica richiesta credenziali, uso PAT “Workflow Abilitated”

---

## [2025-08-15 15:50] - Test superamento workflow con aggiornamento log operativo

- Modificato solo LOG_OPERATIVO.md per testare il superamento dei check bloccanti.
- Formattazione conforme a STANDARD_OPERATIVO.md.
- Eseguito commit e push su branch `test-failure-PR`.
- Aperta PR, attesa superamento workflow automatici.
- Prossimo step: verifica merge PR e pulizia branch di test.

---

> Ricorda: STANDARD_OPERATIVO.md è la fonte di verità e va consultato SEMPRE prima di ogni step importante!