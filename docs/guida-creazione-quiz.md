# Guida creazione quiz — Recuperiamo

Questo documento serve a due scopi:
- **Per un essere umano:** segui le regole e il template JSON per creare un quiz manualmente e importarlo nella piattaforma.
- **Per Claude (AI):** leggi questa guida come specifica e genera il JSON del quiz rispettando esattamente i vincoli indicati.

---

## Flusso di creazione

```
0. Chiedi argomento, classe/livello e materia se non già forniti, e attendi la risposta
1. Scegli la lezione di riferimento
2. Valuta l'ampiezza dell'argomento e stabilisci quante domande generare (vedi tabella sotto)
3. Scrivi le domande seguendo le regole per ogni tipo
4. Produci il JSON rispettando esattamente lo schema
5. Importa il JSON nella piattaforma: tab Quiz → Importa JSON
```

---

## Distribuzione consigliata

| Tipo | Minimo | Standard |
|---|---|---|
| Scelta multipla (`mcq`) | 2 | 4 |
| Vero / Falso (`vero_falso`) | 1 | 3 |
| Completamento (`completamento`) | 1 | 2 |
| Testo libero (`testo_libero`) | 0 | 1 |
| **Totale** | **4** | **10** |

**Non c'è un tetto massimo al numero di domande.** I valori "Minimo" sono vincolanti (vedi fasce di ampiezza più sotto), "Standard" è solo un riferimento per il caso medio. Se l'argomento è ampio, il quiz può avere anche molte più di 10-14 domande: meglio un quiz completo che uno artificialmente accorciato.

**Regola:** per ogni domanda a correzione manuale (`completamento` + `testo_libero`) includere almeno 3 domande a correzione automatica (`mcq` + `vero_falso`).

**Regola:** un quiz non è mai composto da un solo tipo di domanda. Anche nella versione più corta possibile, includi sempre almeno i minimi di `vero_falso`, `mcq` e `completamento` indicati in tabella (il `testo_libero` resta l'unico tipo facoltativo, minimo 0).

**Ordine consigliato delle domande nel JSON:** prima `vero_falso`, poi `mcq`, poi `completamento`, infine `testo_libero`.

---

## Titolo

Formato obbligatorio:

```
[Materia] — [Argomento]
```

Esempi validi:
- `Matematica — Equazioni di 2° grado`
- `Fisica — Dinamica`
- `Italiano — Analisi del periodo`

---

## Schema JSON (obbligatorio)

```json
{
  "titolo": "string — formato: [Materia] — [Argomento]",
  "domande": [
    {
      "tipo": "mcq | vero_falso | completamento | testo_libero",
      "testo": "string — testo della domanda",
      "opzioni": ["string", "..."],
      "rispostaCorretta": "string",
      "rispostaAttesa": "string"
    }
  ]
}
```

### Campo `opzioni`
- **Obbligatorio** solo per `mcq`
- **Non includere** per `vero_falso`, `completamento`, `testo_libero`

### Campo `rispostaCorretta`
- `mcq` → deve essere **identica** a una delle stringhe in `opzioni`
- `vero_falso` → deve essere esattamente `"vero"` oppure `"falso"` (minuscolo)
- `completamento` → **non includere** il campo (la correzione è manuale, a cura del docente)
- `testo_libero` → **non includere** il campo (la correzione è manuale)

### Campo `rispostaAttesa`
- **Obbligatorio** solo per `completamento`
- **Non includere** per `mcq`, `vero_falso`, `testo_libero`
- È una risposta di riferimento a uso del docente in fase di correzione manuale — **non** viene usata dalla piattaforma per correggere automaticamente (a differenza di `rispostaCorretta`)
- Se si accettano sinonimi o formulazioni alternative, indicarlo qui (es. "F=ma (accettato anche 'forza = massa per accelerazione')")

---

## Regole per tipo di domanda

### `mcq` — Scelta multipla
- Minimo 2 opzioni, consigliato 4, massimo 6
- Una sola risposta corretta
- I distrattori devono essere plausibili, non inventati
- Non usare "tutte le precedenti" o "nessuna delle precedenti"
- Variare la posizione della risposta corretta tra le opzioni

### `vero_falso`
- Solo per affermazioni univoche e non ambigue
- Evitare doppia negazione ("Non è vero che non...")
- Alternare Vero e Falso — non mettere più di 3 dello stesso tipo consecutivi

### `completamento`
- Il testo deve contenere il contesto completo, non solo la lacuna
- Preferire risposte di 1–3 parole
- Non aggiungere `rispostaCorretta` — la correzione è manuale, a cura del docente (come `testo_libero`)
- Aggiungere sempre `rispostaAttesa` con la risposta di riferimento, utile al docente in fase di correzione — non è usata per correggere automaticamente

### `testo_libero`
- Usare per ragionamento e argomentazione, non per memoria semplice
- Indicare nel testo la lunghezza attesa (es. "in 2–3 righe", "elenca almeno 3 esempi")
- Non aggiungere `rispostaCorretta` — la correzione avviene manualmente nella piattaforma

---

## Notazione scientifica e formule

Il testo delle domande è una stringa JSON semplice: non supporta HTML, LaTeX o markdown, quindi apici e pedici scritti come `^` o come numero in linea (es. `sp3`, `H2O`, `x^2`) **non vengono resi correttamente**. Usa sempre i caratteri Unicode per apici e pedici, in ogni campo `testo` e `opzioni`, per qualunque tipo di domanda.

- **Apici** (esponenti, orbitali ibridi, potenze, cariche): `⁰ ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ⁺ ⁻`
  Corretto: `sp³` — Sbagliato: `sp3`
  Corretto: `x²` — Sbagliato: `x^2`
  Corretto: `10⁻⁵` — Sbagliato: `10^-5`
- **Pedici** (indici di formule chimiche, numeri quantici): `₀ ₁ ₂ ₃ ₄ ₅ ₆ ₇ ₈ ₉`
  Corretto: `H₂O` — Sbagliato: `H2O`
  Corretto: `C₆H₁₂O₆` — Sbagliato: `C6H12O6`
- **Simboli utili**: `→ ⇌ ° Å Δ π ± √ ≈ ≤ ≥`

Se per un caso specifico non esiste un carattere Unicode adeguato, scrivi la notazione nel modo più leggibile possibile e, se può generare ambiguità, chiarisci tra parentesi (es. "espresso in cm elevato alla meno uno").

---

## Esempio completo (10 domande standard)

```json
{
  "titolo": "Matematica — Equazioni di 2° grado",
  "domande": [
    {
      "tipo": "vero_falso",
      "testo": "Un'equazione di 2° grado ha sempre due soluzioni reali distinte.",
      "rispostaCorretta": "falso"
    },
    {
      "tipo": "vero_falso",
      "testo": "Se il discriminante è zero, l'equazione ha due soluzioni coincidenti.",
      "rispostaCorretta": "vero"
    },
    {
      "tipo": "vero_falso",
      "testo": "La formula quadratica si applica solo alle equazioni con coefficiente a = 1.",
      "rispostaCorretta": "falso"
    },
    {
      "tipo": "mcq",
      "testo": "Qual è il discriminante dell'equazione x² - 5x + 6 = 0?",
      "opzioni": ["1", "25", "49", "11"],
      "rispostaCorretta": "1"
    },
    {
      "tipo": "mcq",
      "testo": "Quante soluzioni reali ha un'equazione con discriminante negativo?",
      "opzioni": ["Nessuna", "Una", "Due distinte", "Infinite"],
      "rispostaCorretta": "Nessuna"
    },
    {
      "tipo": "mcq",
      "testo": "Quale delle seguenti è la formula quadratica corretta?",
      "opzioni": [
        "x = (-b ± √Δ) / a",
        "x = (-b ± √Δ) / 2a",
        "x = (b ± √Δ) / 2a",
        "x = (-b ± Δ) / 2a"
      ],
      "rispostaCorretta": "x = (-b ± √Δ) / 2a"
    },
    {
      "tipo": "mcq",
      "testo": "Qual è la somma delle radici di x² - 3x + 2 = 0?",
      "opzioni": ["2", "3", "-3", "1"],
      "rispostaCorretta": "3"
    },
    {
      "tipo": "completamento",
      "testo": "Il discriminante di un'equazione di 2° grado ax² + bx + c = 0 è Δ = b² - ___",
      "rispostaAttesa": "4ac"
    },
    {
      "tipo": "completamento",
      "testo": "Se Δ > 0, l'equazione ha due soluzioni reali e ___",
      "rispostaAttesa": "distinte"
    },
    {
      "tipo": "testo_libero",
      "testo": "Spiega in 2–3 righe come si determina il numero di soluzioni di un'equazione di 2° grado prima di risolverla, e perché è utile farlo."
    }
  ]
}
```

---

## Istruzioni per Claude (comportamento nel Project)

Quando l'utente chiede di generare un quiz, Claude deve seguire questi passi, in ordine:

1. **Verifica le informazioni essenziali — passaggio obbligatorio, non saltabile.** Servono sempre tre dati: **argomento**, **classe/livello** e **materia**. Se anche uno solo di questi non è stato scritto esplicitamente dall'utente nella conversazione, Claude DEVE fermarsi e chiederlo, anche se pensa di poterlo intuire dal contesto del Project o da conversazioni precedenti. Non generare alcuna domanda finché l'utente non ha risposto.

2. **Controlla che l'argomento sia sufficientemente specifico.** Se l'argomento fornito è troppo ampio per generare domande mirate (es. "Storia", "Grammatica", "Chimica" senza altro), Claude non deve procedere: deve chiedere di restringerlo (unità, capitolo, periodo, autore, formula/teorema specifico...) e attendere la risposta. Un argomento è abbastanza specifico quando permette di scrivere almeno 4-5 domande `mcq` distinte senza uscire dal tema (es. "La Rivoluzione francese", "Le equazioni di 2° grado", "I promessi sposi — capitoli 1-3" sono validi; "Storia" o "Matematica" da soli non lo sono).

3. **Valuta l'ampiezza dell'argomento e stabilisci il numero di domande di conseguenza — non usare sempre lo stesso numero.** Una volta superato il controllo del punto 2, classifica l'argomento in una di queste tre fasce e scegli la lunghezza del quiz coerentemente:
   - **Ristretto** (una singola formula, una singola regola, un evento puntuale, 1-2 sotto-concetti): minimo assoluto **4 domande**, nessun tetto massimo.
   - **Medio** (un capitolo, un'unità didattica, un argomento con 3-5 sotto-concetti collegati — è il caso più frequente): minimo assoluto **8 domande**, target di riferimento 10, nessun tetto massimo.
   - **Ampio** (un intero modulo, più capitoli collegati, un argomento con molti sotto-concetti): minimo assoluto **14 domande**, nessun tetto massimo — se l'argomento ha molti sotto-concetti, il quiz può tranquillamente superare le 20 domande.

   Questi sono minimi assoluti verso il basso: un quiz sotto il minimo della fascia scelta non è accettabile. Non esiste invece un limite massimo: è sempre meglio un quiz un po' più lungo ma che copre davvero l'argomento, piuttosto che uno accorciato artificialmente.

   In ogni fascia, rispetta comunque i minimi per tipo della tabella e la regola che vieta quiz composti da un solo tipo di domanda: un quiz "ristretto" da 4-6 domande deve comunque includere sia `vero_falso` che `mcq` che `completamento`, non solo uno di questi. Se hai dubbi su quale fascia scegliere, dillo esplicitamente all'utente insieme al numero di domande proposto, così può correggerti prima che tu generi il JSON.

4. **Note aggiuntive** (facoltative): focus su un sotto-argomento, cosa evitare, difficoltà desiderata — vanno usate se fornite, ma non richieste attivamente.

5. **Genera il JSON** rispettando esattamente lo schema e le regole di questa guida.

6. **Autoconteggio obbligatorio — ultimo passaggio prima di rispondere.** Conta manualmente quanti elementi ci sono nell'array `domande` che hai appena scritto. Confronta il numero con il minimo assoluto della fascia scelta al punto 3 (4 / 8 / 14). Se il totale è inferiore, **non rispondere ancora**: aggiungi altre domande — rispettando tipo, ordine e regole — finché non raggiungi almeno quel minimo, poi riconta. Solo dopo aver verificato il conteggio, controlla anche che il JSON sia sintatticamente valido (parentesi, virgole, virgolette).

7. **Crea un file scaricabile, non incollare il JSON in chat.** Genera un file `.json` con il contenuto del quiz (nome file: `quiz-[materia]-[argomento breve].json`, senza spazi, es. `quiz-chimica-legami-di-valenza.json`) e condividilo come allegato. Il messaggio di chat deve restare breve (una riga di conferma tipo "Quiz pronto, X domande"): il JSON non va mai ripetuto come testo o blocco di codice nella risposta, va solo nel file.

Se l'utente preferisce fornire tutto subito senza attendere le domande di Claude, può scrivere direttamente:

```
Argomento: [...]
Classe: [...]
Materia: [...]
Distribuzione (opzionale): [...]
Note aggiuntive (opzionale): [...]
```

**Vincoli che Claude deve rispettare:**
- Il campo `tipo` deve essere esattamente uno tra: `mcq`, `vero_falso`, `completamento`, `testo_libero`
- `rispostaCorretta` per `vero_falso` deve essere esattamente `"vero"` o `"falso"`
- `rispostaCorretta` per `mcq` deve essere identica (carattere per carattere) a una delle `opzioni`
- Non aggiungere `rispostaCorretta` nelle domande `completamento` o `testo_libero` (correzione manuale)
- Ogni domanda `completamento` deve avere `rispostaAttesa` (risposta di riferimento per il docente, non usata per correggere automaticamente)
- Non aggiungere `opzioni` nelle domande che non sono `mcq`
- Rispettare l'ordine: prima `vero_falso`, poi `mcq`, poi `completamento`, infine `testo_libero`
- Il titolo deve seguire il formato: `[Materia] — [Argomento]`
- Non generare il quiz finché argomento (specifico), classe e materia non sono noti
- Il quiz non deve mai contenere un solo tipo di domanda: rispetta sempre i minimi per tipo della tabella
- Il numero totale di domande deve riflettere l'ampiezza dell'argomento (fascia Ristretto/Medio/Ampio) e non scendere mai sotto il minimo assoluto della fascia scelta (4 / 8 / 14)
- Apici e pedici (formule chimiche, esponenti, orbitali) vanno scritti con caratteri Unicode, mai con `^` o numeri in linea
- Il JSON va sempre creato come file scaricabile, mai incollato o ripetuto come testo/blocco di codice nella risposta in chat

---

## Checklist prima di importare

- [ ] Il JSON è sintatticamente valido (nessuna virgola mancante, parentesi chiuse)
- [ ] Il titolo segue il formato `[Materia] — [Argomento]`
- [ ] Ogni `mcq` ha almeno 2 opzioni e `rispostaCorretta` identica a una di esse
- [ ] Ogni `vero_falso` ha `rispostaCorretta` uguale a `"vero"` o `"falso"`
- [ ] Nessuna domanda `completamento` o `testo_libero` ha il campo `rispostaCorretta`
- [ ] Ogni domanda `completamento` ha il campo `rispostaAttesa`
- [ ] Nessuna domanda non-`mcq` ha il campo `opzioni`
- [ ] Le domande sono ordinate: vero_falso → mcq → completamento → testo_libero
- [ ] Il quiz include almeno vero_falso, mcq e completamento (non un solo tipo)
- [ ] Il numero totale di domande rispetta il minimo assoluto della fascia scelta (Ristretto ≥4 / Medio ≥8 / Ampio ≥14)
- [ ] Apici e pedici (formule, esponenti) usano caratteri Unicode e non `^` o numeri in linea
