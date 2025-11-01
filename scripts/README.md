# Git push helper (gp)

Questo script PowerShell semplifica il flusso di aggiunta/commit/push locale seguendo le regole concordate.

Comandi principali

- Eseguire lo script con messaggio personalizzato:
  ```powershell
  .\scripts\git-push.ps1 -message "fix: sistemato ..."
  ```

- Eseguire come npm script:
  ```powershell
  npm run gp -- -message "fix: ..."
  ```

- Preview (dry run):
  ```powershell
  .\scripts\git-push.ps1 -dryRun
  ```

Opzioni utili

- `-skipChecks` : salta lint/build (di default il flusso esegue `npm run lint` e `npm run build` se presenti)
- `-exclude "path1,path2"` : esclude percorsi espliciti dal commit (es. `app/pacchetti-lezioni-sandbox/`)
- `-createBranch my/branch` : crea una nuova branch e push su quella branch
- `-createPr` : tenta di creare una PR (richiede `gh` per funzionare automaticamente)
- `-noVerify` : passa l'opzione `--no-verify` al commit
- `-force` : forza il push (`git push --force`) — disabilitato per default, usare con attenzione

Note di sicurezza e politiche

- Lo script non esegue push forzati di default. L'opzione `-force` è disponibile solo se la passi esplicitamente.
- Lo script rispetta le esclusioni che passi con `-exclude` e il `.gitignore`.
- Non attiva job periodici automaticamente; puoi aggiungere una GitHub Action o una Scheduled Task locale separatamente.
