# Guida creazione quiz — Recuperiamo

Questo documento serve a due scopi:
- **Per un essere umano:** segui le regole e il template JSON per creare un quiz manualmente e importarlo nella piattaforma.
- **Per Claude (AI):** leggi questa guida come specifica e genera il JSON del quiz rispettando esattamente i vincoli indicati.

---

## Flusso di creazione

```
1. Scegli la lezione di riferimento
2. Decidi argomento e tipo di verifica (ripasso / formativa / sommativa)
3. Stabilisci la distribuzione delle domande (vedi tabella sotto)
4. Scrivi le domande seguendo le regole per ogni tipo
5. Produci il JSON rispettando esattamente lo schema
6. Importa il JSON nella piattaforma: tab Quiz → Importa JSON
```

---

## Distribuzione consigliata

| Tipo | Minimo | Standard | Massimo |
|---|---|---|---|
| Scelta multipla (`mcq`) | 2 | 4 | 8 |
| Vero / Falso (`vero_falso`) | 1 | 3 | 6 |
| Completamento (`completamento`) | 1 | 2 | 4 |
| Testo libero (`testo_libero`) | 0 | 1 | 2 |
| **Totale** | **4** | **10** | **20** |

**Regola:** per ogni domanda a `testo_libero` includere almeno 3 domande a correzione automatica.

**Ordine consigliato delle domande nel JSON:** prima `vero_falso`, poi `mcq`, poi `completamento`, infine `testo_libero`.

---

## Titolo

Formato obbligatorio:

```
[Materia] — [Argomento] — [Tipo verifica]
```

Esempi validi:
- `Matematica — Equazioni di 2° grado — Ripasso`
- `Fisica — Dinamica — Verifica formativa`
- `Italiano — Analisi del periodo — Esercizio`

---

## Schema JSON (obbligatorio)

```json
{
  "titolo": "string — formato: [Materia] — [Argomento] — [Tipo]",
  "domande": [
    {
      "tipo": "mcq | vero_falso | completamento | testo_libero",
      "testo": "string — testo della domanda",
      "opzioni": ["string", "..."],
      "rispostaCorretta": "string"
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
- `completamento` → stringa attesa (confronto case-insensitive, spazi ignorati)
- `testo_libero` → **non includere** il campo (la correzione è manuale)

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
- Se si accettano sinonimi, indicarlo nel testo (es. "...accettato anche 'F=ma'")
- Il confronto è automatico: case-insensitive, spazi iniziali/finali ignorati

### `testo_libero`
- Usare per ragionamento e argomentazione, non per memoria semplice
- Indicare nel testo la lunghezza attesa (es. "in 2–3 righe", "elenca almeno 3 esempi")
- Non aggiungere `rispostaCorretta` — la correzione avviene manualmente nella piattaforma

---

## Esempio completo (10 domande standard)

```json
{
  "titolo": "Matematica — Equazioni di 2° grado — Ripasso",
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
      "rispostaCorretta": "4ac"
    },
    {
      "tipo": "completamento",
      "testo": "Se Δ > 0, l'equazione ha due soluzioni reali e ___",
      "rispostaCorretta": "distinte"
    },
    {
      "tipo": "testo_libero",
      "testo": "Spiega in 2–3 righe come si determina il numero di soluzioni di un'equazione di 2° grado prima di risolverla, e perché è utile farlo."
    }
  ]
}
```

---

## Istruzioni per Claude (prompt di generazione)

Quando chiedi a Claude di generare un quiz, usa questo schema di richiesta:

```
Genera un quiz in formato JSON seguendo esattamente la guida in allegato.

Argomento: [inserisci argomento]
Materia: [inserisci materia]
Tipo verifica: [Ripasso / Verifica formativa / Esercizio]
Distribuzione: [es. 3 vero_falso, 4 mcq, 2 completamento, 1 testo_libero]
Livello: [es. liceo scientifico, 3° anno]
Note aggiuntive: [es. focalizzarsi su X, evitare Y]

Restituisci solo il JSON, senza testo aggiuntivo prima o dopo.
```

**Vincoli che Claude deve rispettare:**
- Il campo `tipo` deve essere esattamente uno tra: `mcq`, `vero_falso`, `completamento`, `testo_libero`
- `rispostaCorretta` per `vero_falso` deve essere esattamente `"vero"` o `"falso"`
- `rispostaCorretta` per `mcq` deve essere identica (carattere per carattere) a una delle `opzioni`
- Non aggiungere `rispostaCorretta` nelle domande `testo_libero`
- Non aggiungere `opzioni` nelle domande che non sono `mcq`
- Rispettare l'ordine: prima `vero_falso`, poi `mcq`, poi `completamento`, infine `testo_libero`
- Il titolo deve seguire il formato: `[Materia] — [Argomento] — [Tipo verifica]`

---

## Checklist prima di importare

- [ ] Il JSON è sintatticamente valido (nessuna virgola mancante, parentesi chiuse)
- [ ] Il titolo segue il formato `[Materia] — [Argomento] — [Tipo]`
- [ ] Ogni `mcq` ha almeno 2 opzioni e `rispostaCorretta` identica a una di esse
- [ ] Ogni `vero_falso` ha `rispostaCorretta` uguale a `"vero"` o `"falso"`
- [ ] Nessuna domanda `testo_libero` ha il campo `rispostaCorretta`
- [ ] Nessuna domanda non-`mcq` ha il campo `opzioni`
- [ ] Le domande sono ordinate: vero_falso → mcq → completamento → testo_libero
