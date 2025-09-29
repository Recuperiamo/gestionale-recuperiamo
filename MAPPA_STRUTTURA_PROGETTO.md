# MAPPA_STRUTTURA_PROGETTO.md – Ultimo aggiornamento: 2025-08-25 23:15 (UTC+2)

---
# Mappa Struttura Progetto (Aggiornata)

# MAPPA STRUTTURA PROGETTO
# Ultimo aggiornamento: 2025-09-29 03:50 UTC+2

Root
├─ README.md
├─ STANDARD_OPERATIVO.md
├─ LOG_OPERATIVO.md
├─ MAPPA_STRUTTURA_PROGETTO.md
├─ elencocompleto.txt
├─ package.json
├─ next.config.js
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/...
├─ public/
│  ├─ favicon.ico
│  └─ (asset vari)
├─ app/
│  ├─ layout.js / layout.tsx (se presente)
│  ├─ page.js (landing / dashboard redirect)
│  ├─ api/
│  │  ├─ attivita/...
│  │  ├─ modifiche/...
│  │  ├─ clienti/...
│  │  └─ (altre route API)
│  ├─ profilo/
│  │  └─ page.js
│  ├─ pacchetti-lezioni/
│  │  └─ page.js
│  ├─ lavagna/
│  │  └─ page.js   (NUOVO prototipo)
│  ├─ materiale/
│  │  └─ page.js  (NUOVO prototipo)
│  ├─ clienti/
│  │  └─ page.js (se presente)
│  ├─ pacchetti/
│  │  └─ page.js (se presente)
│  ├─ attivita/
│  │  └─ page.js (se presente)
│  ├─ calendario/
│  │  └─ page.js (se presente calendario admin)
│  ├─ storico/
│  │  └─ page.js
│  ├─ admin/
│  │  ├─ modifiche/
│  │  │  └─ ApprovaRichiestaModal.jsx
│  │  └─ (altre eventuali sezioni admin)
│  ├─ components/
│  │  ├─ Navbar.js
│  │  ├─ calendario/
│  │  │  └─ CalendarioAttivita.jsx
│  │  ├─ modifiche/
│  │  │  ├─ RichiestaModificaModal.jsx   (modale unico per richieste cliente)
│  │  │  ├─ useRichiesteModifica.js / .ts
│  │  ├─ attivita/
│  │  │  └─ AttivitaDettaglioModal.jsx
│  │  ├─ pacchetti/...
│  │  └─ (altri componenti UI condivisi)
│  └─ (altri segmenti route / eventuali layout aggiuntivi)
├─ tests/
│  ├─ (spec, integration, e2e)
└─ (configurazioni varie: eslint, tsconfig, ecc.)

NOTE:
- Pagine /lavagna e /materiale sono prototipi: al passaggio a produzione richiedono API dedicate (CRUD + permessi).
- RichiestaModificaClienteModal rimossa/deprecata in favore di RichiestaModificaModal riutilizzata dal calendario (flag enableStudentRequests).
- Qualsiasi aggiunta futura deve ampliare, non ridurre, la presente mappa.


> Ultimo aggiornamento: 2025-09-28 (UTC+2)

app/
│   layout.js
│   page.js
│
├── api/
│   ├── attivita/
│   │   └── route.js
│   ├── modifiche/
│   │   └── route.js                          # API richieste modifica/cancellazione (override approvazione)
│   ├── pacchetti/
│   │   ├── route.js
│   │   └── [id]/
│   │       └── route.js
│   ├── clienti/
│   │   ├── route.js
│   │   └── [id]/
│   │       └── route.js (placeholder GET/PUT/DELETE)
│   └── auth/
│       └── [...nextauth]/
│           ├── route.js
│           └── authOptions.js
│
├── admin/
│   └── modifiche/
│       ├── page.js                           # Gestione richieste (stati, filtri, modale approvazione)
│       └── ApprovaRichiestaModal.jsx         # Modale approvazione con override
│
├── pacchetti-lezioni/
│   └── page.js                               # Vista cliente: lezioni prenotate / svolte + richieste inviate
│
├── clienti/
│   └── page.js
├── pacchetti/
│   └── page.js
├── attivita/
│   └── page.js (se presente: UI admin attività – da riallineare con nuova logica)
│
├── components/
│   ├── Navbar.jsx
│   ├── Alert.jsx
│   ├── AuthGuard.jsx
│   ├── attivita/
│   │   ├── AttivitaDettaglioModal.jsx        # Modale dettaglio lezione (per cliente include Richiedi modifica)
│   ├── modifiche/
│   │   ├── RichiestaModificaModal.jsx        # Modale cliente invio richiesta
│   │   └── useRichiesteModifica.js           # Hook fetch richieste (se esistente)
│   ├── clienti/
│   │   ├── ClientiForm.jsx
│   │   ├── ClientiTable.jsx
│   │   └── ClienteDettaglioModal.jsx
│   ├── pacchetti/
│   │   ├── PacchettiList.jsx
│   │   ├── PacchettoForm.jsx
│   │   ├── PacchettoEditForm.jsx
│   │   └── ConfirmDeleteModal.jsx
│   └── utils/
│       └── (varie)
│
├── (DA IMPLEMENTARE PROSSIMA SESSIONE)
│   ├── lavagna/
│   │   └── page.js (TODO)                    # Spazio note/conversazioni interne
│   ├── classroom-materiali/
│   │   └── page.js (TODO)                    # Scambio materiali (upload/download)
│
public/
│   └── (assets)
src/
│   ├── fetcher/
│   │   └── clienti/
│   │       └── clientiAPI.js
│   ├── lib/
│   │   └── prisma.js (o index.js)
│   └── (eventuali alias precedenti da uniformare)
prisma/
│   └── schema.prisma                        # Include RichiestaModifica + enums
LOG_OPERATIVO.md
STANDARD_OPERATIVO.md
README.md
ROADMAP_MILESTONE_ISSUE_BOZZA.md
output.md

gestionale-recuperiamo/
│
├── app/                                              # [ROOT Next.js app]
│   ├── api/                                         # [API Route Handlers]
│   │   ├── attivita/
│   │   │   └── route.js                             # CRUD attività (API REST)
│   │   ├── user/
│   │   │   └── route.js                             # API utente autenticazione/info
│   │   ├── clienti/
│   │   │   └── [clienteId]/
│   │   │       └── attivita/
│   │   │           └── route.js                     # Lista attività per cliente (via pacchetti)
│   │   ├── pacchetti/
│   │   │   └── [id]/
│   │   │       └── changelog/
│   │   │           └── route.js                     # API storico variazioni ore residue pacchetto
│   │   └── ...                                      # [ALTRE API o future estensioni]
│   ├── components/                                  # [Componenti React riutilizzabili]
│   │   ├── Navbar.js                                # Navbar principale
│   │   ├── clienti/
│   │   │   └── ClienteDettaglioModal.jsx            # Bottone "Vedi storico attività" funzionante
│   │   ├── attivita/
│   │   │   ├── AttivitaList.jsx                     # Tabella attività filtrabile
│   │   │   ├── AttivitaForm.jsx                     # Form CRUD attività
│   │   │   ├── AttivitaDettaglioModal.jsx           # Modale dettaglio attività
│   │   │   ├── AttivitaClienteList.jsx              # Lista attività per cliente (via pacchetti)
│   │   │   ├── StoricoAttivitaTable.jsx             # Tabella storico attività filtrabile/esportabile
│   │   │   └── ...                                  # Altri componenti attività
│   │   ├── ChangelogTable.jsx                       # Tabella storico modifiche pacchetto
│   │   └── ...                                      # Altri componenti
│   ├── utils/                                       # [Funzioni di utilità condivise]
│   │   ├── exportToPdf.js                           # Export PDF (placeholder)
│   │   ├── exportToXls.js                           # Export XLS (placeholder)
│   │   └── ...                                      # Altre utility
│   ├── attivita/                                    # [Route UI attività]
│   │   └── page.js                                  # Pagina principale attività
│   ├── clienti/                                     # [Route UI clienti]
│   │   └── page.js                                  # Pagina principale clienti
│   ├── pacchetti/                                   # [Route UI pacchetti]
│   │   ├── page.js                                  # Pagina principale pacchetti
│   │   └── [id]/
│   │       └── changelog/
│   │           └── page.js                          # Pagina storico modifiche pacchetto (in arrivo)
│   ├── storico/                                     # [Route UI storico]
│   │   └── page.js                                  # Route principale storico attività
│   ├── layout.js                                    # Layout root globale
│   ├── page.js                                      # Home/dashboard
│   ├── not-found.js                                 # Pagina custom 404
│   └── ...                                          # Altri file Next.js
│
├── lib/                                             # [Utility JS condivise globali]
│   └── prisma.js                                    # Client Prisma singleton (UNICA ISTANZA per tutte le API route)
│
├── tests/                                           # [Test automatici]
│   ├── components/
│   │   ├── attivita/
│   │   │   ├── AttivitaList.integration.test.jsx
│   │   │   ├── AttivitaForm.integration.test.jsx
│   │   │   └── AttivitaDettaglioModal.test.js
│   │   ├── clienti/
│   │   │   ├── ClientiForm.integration.test.jsx
│   │   │   └── validateClientiForm.test.js
│   │   └── ...                                      # Altri test
│   └── ...                                          # Test di sistema/future
│
├── prisma/                                          # [Schema DB e migrazioni]
│   ├── schema.prisma                                # Modello dati Prisma
│   └── migrations/
│       ├── 20230823-initial/
│       │   └── migration.sql
│       ├── 20250824213220_attivita_collegate_cliente/
│       │   └── migration.sql
│       └── ...                                      # Altre migrazioni
│
├── sql/                                             # [Script SQL manuali]
│   └── attivita_pacchetto_cliente_trigger.sql        # Trigger/funzione per vincolo pacchetto/cliente su Attivita
│
├── public/                                          # [File statici Next.js]
│   ├── favicon.ico
│   ├── logo.png
│   └── ...
│
├── .env                                             # Variabili ambiente base
├── .env.local                                       # Variabili ambiente local dev
├── .gitignore                                       # Esclusioni git
├── package.json                                     # Configurazione npm/progetto
├── README.md                                        # Documentazione principale repo
├── STANDARD_OPERATIVO.md                            # Regole operative vincolanti
├── LOG_OPERATIVO.md                                 # Log operativo
├── MAPPA_STRUTTURA_PROGETTO.md                      # Questa mappa, sempre aggiornata
└── ...                                              # Altri file root (es. script, doc, config)

---

## LEGENDA DIRECTORY E FILE CHIAVE

- **README.md**:  
  Documentazione principale della repo.  
  Contiene **solo** descrizione, panoramica funzionale, struttura attuale del progetto, informazioni per utente e sviluppatore, avvio rapido e note operative generali.  
  **Non** include policy operative, regole di processo o scenario test/manuale (che sono spostati in STANDARD_OPERATIVO.md).
  Per ogni dubbio operativo, rimanda esplicitamente a STANDARD_OPERATIVO.md.

- **STANDARD_OPERATIVO.md**:  
  Raccolta **completa e vincolante** di tutte le regole operative, policy di processo, naming, scenario test/manuale, milestone, policy commit/push, anti-doppioni, ecc.  
  È **l’unico punto di verità** per workflow, convenzioni, checklist, debug, policy CI/CD e tutte le pratiche di sviluppo e mantenimento.  
  Ogni cambiamento strutturale o di policy va qui e **deve essere riportato in LOG_OPERATIVO.md**.

- **LOG_OPERATIVO.md**:  
  Log storico e operativo di tutte le modifiche rilevanti, audit, test manuali, note storiche, errori, refactor e ogni evento di rilievo.  
  **Deve contenere tutte le informazioni (anche “sporco”)** per massima trasparenza e auditabilità.  
  Gli orari sono sempre UTC+2, reverse order (più recente in cima).  
  Non va “ripulito”: ogni dettaglio serve per possibili revisioni e controllo qualità.

- **MAPPA_STRUTTURA_PROGETTO.md**:  
  Questa mappa, **sempre aggiornata** e **mai per difetto**: ogni revisione deve essere almeno pari o più dettagliata/estensiva della precedente.  
  Deve elencare **tutti** i file, cartelle, moduli, componenti, script e asset effettivamente presenti (eccetto quelli esclusi da .gitignore o node_modules).  
  Deve contenere dichiarazioni e note per tutte le principali directory e feature, oltre a scenario test/manuale aggiornato a ogni milestone.

  ### [NUOVO] elencocompleto.txt
- **Contenuto:** Elenco di tutti i file e path della repository, sempre aggiornato dopo ogni modifica strutturale.
- **Regole:** Deve essere usato come riferimento principale per controllo duplicati, omonimie e rischi di conflitto nomi file.
- **Aggiornamento:** Ogni volta che cambia la struttura (aggiunta/rimozione/spostamento file) aggiorna sempre anche questo file.
- **Obbligatorietà:** Nessuna operazione strutturale può essere proposta/creata senza averlo consultato e aggiornato.

---


---

## DICHIARAZIONI STRUTTURA (per directory chiave)

### app/api/
- **Contenuto:** Solo route handler Next.js (file route.js o [endpoint]/route.js).
- **Regole:** Unico entry-point per ogni risorsa/entità. Sottocartelle solo per subresource o endpoint specifici.
- **Integrazione:** Chiamate da fetch lato frontend e test automatici.

### app/components/
- **Contenuto:** Solo componenti React riutilizzabili (file .jsx, .js).
- **Regole:** Sottocartelle per area funzionale (es: attivita/), nessuna logica fetch diretta (solo props/eventi).
- **Integrazione:** Import in page.js, modali, e altre UI.

### app/utils/
- **Contenuto:** Utility JS/TS (funzioni helper, export, ecc).
- **Regole:** Niente logica di UI, solo esportazioni di funzioni.
- **Integrazione:** Usato da componenti, API, ecc.

### lib/
- **Contenuto:** Utility JS condivise globali (es: prisma.js, config, logger).
- **Regole:** Usato da tutte le API route e da altre utility/server functions.
- **Integrazione:** Import in tutte le API route come "../../../lib/prisma" (relativo dalla route) o tramite alias, se presente.
- **Nota:** Da agosto 2025 prisma.js è stato spostato qui per evitare problemi di import nelle API route Next.js.

### app/[area]/
- **Contenuto:** Route Next.js (page.js per vista, layout.js opzionale).
- **Regole:** Una sola page.js per area/funzionalità. Integrazione solo di componenti dichiarati in app/components/.
- **Integrazione:** Navigazione utente, routing Next.js.

### tests/
- **Contenuto:** Test automatici (unit/integration, organized per component/feature).
- **Regole:** Sottocartelle per area, file test chiari, nessun codice di produzione.
- **Integrazione:** npm test, CI.

### prisma/
- **Contenuto:** schema.prisma (modello DB), migrazioni.
- **Regole:** Una sola schema.prisma per repo, migration per ogni modifica sostanziale modello dati.
- **Integrazione:** prisma migrate, prisma generate.

#### [NEW] Pacchetto_ChangeLog (storico variazioni ore residue pacchetto)
- **File:** prisma/schema.prisma (model Pacchetto_ChangeLog), migrato via migrations/
- **Contenuto:** Tracciamento di ogni variazione di ore residue su ogni pacchetto (creazione/modifica/eliminazione attività, rettifiche manuali, errori).
- **Campi:** pacchetto, ore prima/dopo, tipo operazione, attività collegata (se presente), utente, timestamp, motivazione.
- **Audit trail:** Consultabile da API/console, UI in sviluppo.

### public/
- **Contenuto:** File statici serviti da Next.js (immagini, icone, ecc).
- **Regole:** Solo asset, niente codice/app.
- **Integrazione:** <img src="/logo.png"/> ecc.

---

## NOTE OPERATIVE

- La mappa **non va mai ridotta**: ogni versione deve aggiungere dettagli, mai eliminarli.
- Dopo ogni modifica strutturale, aggiorna anche README.md, STANDARD_OPERATIVO.md, LOG_OPERATIVO.md.
- Ogni nuova feature, refactor, o introduzione di file/componente deve essere riflessa nella mappa prima di chiudere la milestone.
- Esegui SEMPRE il controllo duplicati file:
  ```powershell
  Get-ChildItem -Recurse -File | Group-Object Name | Where-Object { $_.Count -gt 1 } | Select-Object -ExpandProperty Name
  ```
  Se la lista è vuota repo OK, altrimenti risolvi subito e logga.
- In caso di dubbio sulla destinazione di una informazione tra README, STANDARD_OPERATIVO o mappa, **chiedi conferma**.
- Se la mappa dovesse risultare più corta o omettere aree rispetto alla versione precedente, **avvisa subito l’utente** prima di procedere.

---

## SCENARIO TEST MANUALE

### Release attuale: filtro attività per intervallo temporale

1. Seleziona “Cliente”: la tabella mostra solo le attività di quel cliente.
2. Seleziona “Pacchetto”: la tabella mostra solo le attività di quel pacchetto.
3. Imposta solo “Dal”: la tabella mostra tutte le attività dalla data selezionata in poi.
4. Imposta solo “Al”: la tabella mostra tutte le attività fino a quella data inclusa.
5. Imposta sia “Dal” che “Al”: la tabella mostra solo le attività tra le due date (estremi inclusi).
6. Combinazioni con altri filtri funzionano (AND logico).
7. Reset filtri: tornano tutte le attività.
8. Tabella vuota: se nessuna attività corrisponde ai filtri, compare il messaggio “Nessuna attività trovata”.
9. Creazione/modifica/eliminazione: la tabella si aggiorna sempre secondo i filtri attivi.

---

### [NEW] Feature: Lista attività di un cliente (via pacchetti)

1. Crea almeno due pacchetti per un cliente e aggiungi attività in entrambi.
2. Accedi tramite endpoint `/api/clienti/[clienteId]/attivita`: devono risultare tutte le attività del cliente, anche su pacchetti diversi.
3. Visualizza tramite `AttivitaClienteList.jsx`: devono essere mostrate tutte le attività per il cliente selezionato.
4. Ripeti per altro cliente: solo le sue attività, nessuna attività di altri clienti.
5. Verifica caso cliente senza pacchetti o senza attività: la lista deve risultare vuota.
6. Test errori: ID cliente non valido, backend non raggiungibile.
7. Testa link/vista dal dettaglio cliente, se integrato nella UI.

---

### [NEW] Feature: Storico attività filtrabile/esportabile

**Scenario test manuale eseguito:**
1. Accedi a /storico: vedi tabella storico con tutti i dati.
2. Filtra per cliente, pacchetto, intervallo data: la tabella si aggiorna.
3. Togli tutti i filtri: torna la lista completa.
4. Clicca su Export PDF/XLS: alert di funzione non ancora implementata.
5. Cambia filtri rapidamente: nessun errore, dati sempre coerenti.
6. Nessun dato trovato: messaggio “Nessuna attività trovata”.
7. Creazione/modifica/eliminazione: la tabella si aggiorna secondo i filtri attivi.
8. Tabella aggiornata live anche su reset filtri e cambio rapido.
9. Tutti i campi visibili in tabella sono centrati (test di UI superato).
10. (**Integrato solo per cliente**) Navigazione da dettaglio cliente a storico con filtro pre-impostato: OK, bottone funzionante.
11. (**Non previsto**) Deep link da dettaglio pacchetto a storico: NON richiesto, la UI attuale soddisfa il requisito tramite filtro cliente.
12. (**Non integrato**) Stress test con molte attività e filtri rapidi.

---

### [NEW] Feature: Storico variazioni ore residue pacchetto (Pacchetto_ChangeLog)

1. Ogni modifica sulle ore residue di un pacchetto (creazione/modifica/eliminazione attività, rettifiche manuali, errori) genera un record in Pacchetto_ChangeLog.
2. Verifica che il record contenga: pacchetto, ore prima/dopo, tipo operazione, attività collegata (se presente), utente, timestamp, motivazione.
3. Recupero storico per pacchetto: la sequenza delle variazioni è progressiva e ricostruisce sempre il saldo ore.
4. Rettifica manuale: compare sempre evento di tipo “rettifica”.
5. Simulazione errore/anomalia: registra evento di tipo “errore” in ChangeLog.
6. Audit trail consultabile da API o UI (in sviluppo).

## Riepilogo funzionalità correlate: attività e modifiche pacchetto

### 1. Attività
- **Cosa mostra:** Elenco delle attività svolte su pacchetti/clienti (es. ticket, interventi, lavorazioni) con campi: ID, data, descrizione, ore consumate, utente, note.
- **Dati:** tabella `Attivita`, riferimento a `pacchettoId` e/o `clienteId`.
- **Funzione:** Visualizzazione/gestione delle azioni operative che consumano ore.
- **Scenario utente:** Consultazione e inserimento attività svolte.

### 2. Storico attività
- **Cosa mostra:** Cronologia dettagliata e filtrabile di tutte le attività di uno o più clienti/pacchetti, orientata a reporting e analisi.
- **Dati:** tabella `Attivita`, con possibili filtri temporali o per stato.
- **Funzione:** Visione storica/analitica, export, audit delle attività.
- **Scenario utente:** Generazione report, controllo storico attività.

### 3. Storico modifiche (changelog pacchetto)
- **Cosa mostra:** Tutte le variazioni alle ore residue di un pacchetto (inclusi effetti di attività, modifiche manuali, storni, correzioni) con dettaglio: data/ora, operazione, ore prima/dopo, attività collegata (ID), utente, motivazione/note.
- **Dati:** tabella `Pacchetto_ChangeLog` (o simile).
- **Funzione:** Audit trail delle variazioni ore, controllo e ricostruzione di ogni modifica sulle ore residue.
- **Scenario utente:** Ricostruzione variazioni ore, verifica responsabili/modifiche.

---

### Possibile consolidamento futuro (opzione di fusione)

Per migliorare la fruibilità e ridurre ridondanze, in futuro è possibile accorpare queste tre pagine in una **pagina unica “Storico pacchetto”** strutturata a tab/accordion:

- **Tab 1:** Attività (lista azioni operative)
- **Tab 2:** Storico attività (cronologia filtrabile/report)
- **Tab 3:** Storico modifiche (tutte le variazioni sulle ore residue, anche non dovute ad attività)

**Criteri per la fusione:**
- Mantenere netta distinzione tra “azioni operative” (attività) e “variazioni audit” (modifiche ore residue).
- Offrire filtri, ricerca e export su ogni tab.
- Garantire chiarezza su cosa rappresenta ciascuna sezione.

#### Scenario test manuale per la pagina unificata
1. Accedi al dettaglio di un pacchetto.
2. Visualizza le tre tab: Attività | Storico attività | Storico modifiche.
3. Verifica che ogni tab mostri dati e funzioni come da descrizione sopra.
4. Simula inserimento/modifica attività, variazione manuale ore, verifica comparsa nei tab corretti.
5. Testa filtri/export/report su storico attività e storico modifiche.

## Backend (Next.js API)
- /api/pacchetti/[id]/route.js
  - Gestione completa cancellazione pacchetto:
    - DELETE: rimuove prima tutte le dipendenze (PacchettoAlertLetto, Pacchetto_ChangeLog, ecc) poi elimina PacchettoOre.
    - Presente log dettagliato in console per ogni step (deleteMany, delete, errori).
- /lib/prisma.js
  - Unica istanza PrismaClient, usata da tutte le API route.
  - Nota: la posizione del file è ora /lib/prisma.js (root progetto), non più in /app/utils.

## Database (schema.prisma)
- Model PacchettoOre: relazione 1-N con Pacchetto_ChangeLog (pacchettoId).
- Model Pacchetto_ChangeLog: collegato a PacchettoOre tramite foreign key pacchettoId.
- Attenzione: per cancellare un PacchettoOre occorre prima eliminare tutti i record Pacchetto_ChangeLog e PacchettoAlertLetto collegati (vincolo di integrità).
---

## ULTIMO AGGIORNAMENTO MAPPA

**Data e ora**: 2025-08-25 23:15 (UTC+2)  
**Nota**: Aggiornata la legenda file chiave e le note operative secondo la nuova distinzione di ruolo tra README.md, STANDARD_OPERATIVO.md e LOG_OPERATIVO.md. Ribadita la policy “mai per difetto”.  
**Mantieni SEMPRE aggiornata questa sezione dopo ogni modifica strutturale!**