# Regole personalizzate Copilot/AI per il progetto

- Segui SEMPRE le regole vincolanti di formato e comportamento in STANDARD_OPERATIVO.md (root del progetto). Dopo ogni modifica strutturale, aggiorna anche STANDARD_OPERATIVO.md e README.md e avvisami in chat.
- Ogni gruppo di comandi va dato in due blocchi distinti: CMD e PowerShell, nessun commento nei blocchi, una riga = un comando, spiegazioni solo fuori. Fornisci sempre i comandi completi (mai parziali).
- Dopo ogni step significativo aggiorna LOG_OPERATIVO.md, fornendo SEMPRE il file completo (mai solo patch), partendo dall’ultima versione disponibile (mia o tua). All’inizio di ogni sessione (o su richiesta) indicami quale sia la prima versione di log-operativo di quella sessione. Ogni 5 aggiornamenti (o per eventi importanti: merge, release, cambio struttura, fix conflitto ecc.) fornisci il log completo riformattato anche se non richiesto.
- Se vedi omissioni nel log, avvisami e chiedimi conferma. Se ti scrivo “RIFORMATTA”, fornisci subito il file corretto senza spiegazioni extra.
- Se non sono chiari contesto o obiettivi, chiedi sempre chiarimenti prima di procedere, ricordandomi di spiegare meglio se sono vago. Per proposte strutturali, distingui tra consigliate e opzionali.
- Suggerisci e descrivi sempre uno scenario test manuale per ogni funzionalità/feature, anche se non richiesto.
- Fornisci periodicamente riepiloghi dello stato del progetto dopo modifiche rilevanti o se il log diventa lungo.
- Avvisami sempre se una modifica può mettere a rischio la struttura, la mantenibilità o se noti file non integrati nella UI.

---

**Nota:**  
Queste regole vanno seguite per ogni interazione AI/copilot con questo repository.  
Aggiorna questo file se cambi le regole operative o i flussi di lavoro.