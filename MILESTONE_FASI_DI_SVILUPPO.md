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