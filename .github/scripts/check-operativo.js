2. **Controlla che il contenuto sia quello fornito (JavaScript, non YAML).**

---

### SCENARIO TEST MANUALE

1. Rinomina il file come sopra.
2. Fai commit e push della modifica.
3. Apri/aggiorna la PR.
4. Verifica che ora il check “Controllo Operativo Bloccante” parta e non abbia più errori “MODULE_NOT_FOUND”.  
5. Se il check fallisce, controlla il messaggio: ora il motivo sarà solo se il log operativo non è aggiornato o se la formattazione non è conforme.

---

## LOG_OPERATIVO.md aggiornato

Ecco il file completo aggiornato con questa operazione e scenario test:

````markdown name=LOG_OPERATIVO.md
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

## [2025-08-15 15:30] - Test trigger workflow su PR

- Modificato README.md per testare il trigger dei workflow su Pull Request.
- Eseguito commit e push su branch `test-failure-PR`.
- Aperta PR verso `main`, verificato che i check GitHub Actions vengano eseguiti.
- Esito: **I workflow vengono eseguiti regolarmente** su PR non relative a LOG_OPERATIVO.md.
- I check “Controllo LOG_OPERATIVO.md” e “Controllo Operativo Bloccante” falliscono attivamente come atteso, perché la modifica non aggiorna il LOG_OPERATIVO.md.
- Scenario test positivo: i workflow bloccano il merge in modo corretto secondo le regole operative.
- Prossimo step: test su PR con modifica e aggiornamento di LOG_OPERATIVO.md per verifica superamento check.

## [2025-08-15 15:40] - Conferma funzionamento check bloccanti su PR

- Eseguito commit e push: "Test: esito trigger workflow su PR, check bloccanti attivi come atteso".
- Aperta PR: i workflow vengono eseguiti e i check falliscono come atteso, bloccando il merge.
- Scenario test conforme a STANDARD_OPERATIVO.md: workflow bloccanti attivi e funzionanti.
- Prossimo step: modificare LOG_OPERATIVO.md in modo conforme per verificare superamento dei check operativi.

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

## [2025-08-15 16:30] - Ripristino corretto script check-operativo.js e scenario test

**Versione STANDARD_OPERATIVO.md**: 2025-08-15  
**Autore**: Recuperiamo  
**Motivo**: Correzione posizione e nome script controllo operativo, da .yml a .js  
**File coinvolti**:
- .github/scripts/check-operativo.js

**Scenario Test**:
- Rinominato file di controllo operativo da .yml a .js.
- Commit e push della modifica.
- Apertura/aggiornamento PR, verifica che il check bloccante venga eseguito senza errore “MODULE_NOT_FOUND”.
- Se LOG_OPERATIVO.md è conforme, il check passa; se non conforme, il motivo sarà esplicitato dal messaggio workflow.
- Prossimo step: verifica esito e aggiorna log operativo con risultato finale.

---