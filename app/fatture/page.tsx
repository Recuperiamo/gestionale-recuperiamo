// @ts-nocheck
"use client";
import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { FullPageSpinner } from "../components/Spinner";

// ── Costanti ──────────────────────────────────────────────────────────────────
const MODALITA_PAG = [
  { cod: "MP05", label: "Bonifico bancario" },
  { cod: "MP01", label: "Contanti" },
  { cod: "MP08", label: "Carta di pagamento" },
  { cod: "MP02", label: "Assegno" },
  { cod: "MP21", label: "Rid" },
];

const STATO_CFG = {
  BOZZA:     { label: "Bozza",     bg: "#f3f4f6", color: "#374151" },
  EMESSA:    { label: "Emessa",    bg: "#dbeafe", color: "#1d4ed8" },
  PAGATA:    { label: "Pagata",    bg: "#dcfce7", color: "#15803d" },
  ANNULLATA: { label: "Annullata", bg: "#fee2e2", color: "#b91c1c" },
};

const C = {
  bg: "#f0f4ff", card: "#fff", primary: "#20489a", light: "#dbeafe",
  text: "#1e293b", sub: "#6b7280", border: "#e5e7eb",
  green: "#15803d", red: "#b91c1c",
};

function fmtEur(v) { return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v ?? 0); }
function fmtData(d) { return d ? new Date(d).toLocaleDateString("it-IT") : "—"; }

// ── Voce fattura ──────────────────────────────────────────────────────────────
function VoceRow({ v, idx, onChange, onRemove }) {
  const totale = (Number(v.quantita) || 0) * (Number(v.prezzoUnitario) || 0);
  useEffect(() => { if (Math.abs(totale - v.totale) > 0.001) onChange(idx, { ...v, totale }); }, [v.quantita, v.prezzoUnitario]);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 100px 100px 32px", gap: 6, marginBottom: 8, alignItems: "center" }}>
      <input value={v.descrizione} onChange={e => onChange(idx, { ...v, descrizione: e.target.value })}
        placeholder="Descrizione servizio" style={inp} />
      <input type="number" value={v.quantita} min={0.01} step="any"
        onChange={e => onChange(idx, { ...v, quantita: Number(e.target.value) })}
        style={{ ...inp, textAlign: "right" }} placeholder="Qta" />
      <input type="number" value={v.prezzoUnitario} min={0} step="any"
        onChange={e => onChange(idx, { ...v, prezzoUnitario: Number(e.target.value) })}
        style={{ ...inp, textAlign: "right" }} placeholder="€ unit." />
      <input value={totale.toFixed(2)} readOnly style={{ ...inp, background: "#f9fafb", color: C.sub, textAlign: "right" }} />
      <button type="button" onClick={() => onRemove(idx)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.red, padding: 0 }}>✕</button>
    </div>
  );
}

// ── Modale crea/modifica fattura ──────────────────────────────────────────────
function FatturaModal({ fattura, clienti, onClose, onSaved }) {
  const isEdit = !!fattura?.id;
  const dest0 = fattura?.destinatario ?? {};
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);

  // Destinatario
  const [clienteId, setClienteId] = useState(fattura?.clienteId ?? "");
  const [destNome, setDestNome] = useState(dest0.nome ?? "");
  const [destCognome, setDestCognome] = useState(dest0.cognome ?? "");
  const [destCf, setDestCf] = useState(dest0.codiceFiscale ?? "");
  const [destPiva, setDestPiva] = useState(dest0.partitaIva ?? "");
  const [destIndirizzo, setDestIndirizzo] = useState(dest0.indirizzo ?? "");
  const [destCap, setDestCap] = useState(dest0.cap ?? "");
  const [destComune, setDestComune] = useState(dest0.comune ?? "");
  const [destProvincia, setDestProvincia] = useState(dest0.provincia ?? "");
  const [destPaese, setDestPaese] = useState(dest0.paese ?? "IT");
  const [destEmail, setDestEmail] = useState(dest0.email ?? "");
  const [destPec, setDestPec] = useState(dest0.pec ?? "");
  const [destSdi, setDestSdi] = useState(dest0.codiceDestinatarioSdi ?? "");

  // Servizi
  const voce0 = { descrizione: "", quantita: 1, prezzoUnitario: 0, totale: 0, aliquotaIva: 0, natura: "N2.2" };
  const [voci, setVoci] = useState(fattura?.voci ?? [voce0]);

  // Pagamento e metadati
  const [dataFattura, setDataFattura] = useState(
    fattura?.data ? new Date(fattura.data).toISOString().substring(0, 10)
      : new Date().toISOString().substring(0, 10)
  );
  const [modalitaPag, setModalitaPag] = useState(fattura?.modalitaPagamento ?? "MP05");
  const [scadenza, setScadenza] = useState(fattura?.dataScadenzaPagamento ? new Date(fattura.dataScadenzaPagamento).toISOString().substring(0, 10) : "");
  const [note, setNote] = useState(fattura?.note ?? "");
  const [stato, setStato] = useState(fattura?.stato ?? "BOZZA");

  // Totali calcolati
  const totImponibile = voci.reduce((s, v) => s + (Number(v.totale) || 0), 0);
  const bollo = totImponibile > 77.47 ? 2 : 0;
  const totale = totImponibile + bollo;

  // Pre-fill da cliente selezionato
  function fillDaCliente(id) {
    setClienteId(id);
    const c = clienti.find(x => x.id === Number(id));
    if (!c) return;
    const parts = (c.nomeReferente || "").split(" ");
    setDestNome(parts[0] || "");
    setDestCognome(parts.slice(1).join(" ") || "");
    setDestCf(c.codiceFiscale || "");
    setDestPiva(c.partitaIva || "");
    setDestEmail(c.email || "");
    const addr = c.indirizzo || "";
    if (addr) setDestIndirizzo(addr);
  }

  function updateVoce(idx, v) { setVoci(prev => prev.map((x, i) => i === idx ? v : x)); }
  function addVoce() { setVoci(prev => [...prev, { ...voce0 }]); }
  function removeVoce(idx) { setVoci(prev => prev.filter((_, i) => i !== idx)); }

  async function handleSave() {
    if (!destNome.trim()) { setTab(0); return; }
    if (!voci.length || voci.every(v => !v.descrizione.trim())) { setTab(1); return; }
    setSaving(true);
    const body = {
      clienteId: clienteId || null,
      destinatario: {
        nome: destNome.trim(), cognome: destCognome.trim(),
        codiceFiscale: destCf.trim(), partitaIva: destPiva.trim(),
        indirizzo: destIndirizzo.trim(), cap: destCap.trim(),
        comune: destComune.trim(), provincia: destProvincia.trim(),
        paese: destPaese.trim() || "IT",
        email: destEmail.trim(), pec: destPec.trim(),
        codiceDestinatarioSdi: destSdi.trim(),
      },
      voci: voci.map(v => ({ ...v, totale: (Number(v.quantita) || 0) * (Number(v.prezzoUnitario) || 0), aliquotaIva: 0, natura: "N2.2" })),
      data: dataFattura, modalitaPagamento: modalitaPag,
      dataScadenzaPagamento: scadenza || null,
      note, stato,
    };
    const url = isEdit ? `/api/fatture/${fattura.id}` : "/api/fatture";
    const res = await fetch(url, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { onSaved(); onClose(); }
    setSaving(false);
  }

  const tabs = ["👤 Destinatario", "📦 Servizi", "💳 Pagamento"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: C.card, borderRadius: 14, width: 640, maxWidth: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 0", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 17, color: C.text }}>{isEdit ? `Modifica Fattura N. ${fattura.numero}/${fattura.anno}` : "Nuova Fattura"}</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.sub }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 0 }}>
            {tabs.map((t, i) => (
              <button key={i} onClick={() => setTab(i)} style={{
                flex: 1, padding: "10px 8px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === i ? 700 : 400,
                borderBottom: `2.5px solid ${tab === i ? C.primary : "transparent"}`,
                color: tab === i ? C.primary : C.sub, background: "transparent", transition: "all .12s",
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px" }}>

          {/* ── TAB 0: Destinatario ── */}
          {tab === 0 && <>
            <label style={lbl}>Seleziona da clienti esistenti</label>
            <select value={clienteId} onChange={e => fillDaCliente(e.target.value)} style={inp}>
              <option value="">— inserimento manuale —</option>
              {clienti.map(c => <option key={c.id} value={c.id}>{c.nomeReferente}</option>)}
            </select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
              <div><label style={lbl}>Nome *</label><input value={destNome} onChange={e => setDestNome(e.target.value)} style={inp} placeholder="Mario"/></div>
              <div><label style={lbl}>Cognome</label><input value={destCognome} onChange={e => setDestCognome(e.target.value)} style={inp} placeholder="Rossi"/></div>
              <div><label style={lbl}>Codice Fiscale</label><input value={destCf} onChange={e => setDestCf(e.target.value.toUpperCase())} style={inp} placeholder="RSSMRO80A01H501U" maxLength={16}/></div>
              <div><label style={lbl}>Partita IVA</label><input value={destPiva} onChange={e => setDestPiva(e.target.value)} style={inp} placeholder="12345678901" maxLength={11}/></div>
              <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Indirizzo</label><input value={destIndirizzo} onChange={e => setDestIndirizzo(e.target.value)} style={inp} placeholder="Via Roma 1"/></div>
              <div><label style={lbl}>CAP</label><input value={destCap} onChange={e => setDestCap(e.target.value)} style={inp} placeholder="00100" maxLength={5}/></div>
              <div><label style={lbl}>Comune</label><input value={destComune} onChange={e => setDestComune(e.target.value)} style={inp} placeholder="Roma"/></div>
              <div><label style={lbl}>Provincia</label><input value={destProvincia} onChange={e => setDestProvincia(e.target.value.toUpperCase())} style={inp} placeholder="RM" maxLength={2}/></div>
              <div><label style={lbl}>Paese</label><input value={destPaese} onChange={e => setDestPaese(e.target.value.toUpperCase())} style={inp} placeholder="IT" maxLength={2}/></div>
              <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Email</label><input value={destEmail} onChange={e => setDestEmail(e.target.value)} style={inp} placeholder="mario.rossi@email.it" type="email"/></div>
              <div><label style={lbl}>PEC</label><input value={destPec} onChange={e => setDestPec(e.target.value)} style={inp} placeholder="mario@pec.it"/></div>
              <div><label style={lbl}>Codice SDI <span style={{ fontWeight: 400, color: C.sub }}>(7 car.)</span></label><input value={destSdi} onChange={e => setDestSdi(e.target.value.toUpperCase())} style={inp} placeholder="0000000" maxLength={7}/></div>
            </div>
          </>}

          {/* ── TAB 1: Servizi ── */}
          {tab === 1 && <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 100px 100px 32px", gap: 6, marginBottom: 8 }}>
              {["Descrizione", "Qta", "€ Unitario", "Totale", ""].map((h, i) => (
                <div key={i} style={{ fontSize: 11, color: C.sub, fontWeight: 600 }}>{h}</div>
              ))}
            </div>
            {voci.map((v, i) => <VoceRow key={i} v={v} idx={i} onChange={updateVoce} onRemove={removeVoce} />)}
            <button type="button" onClick={addVoce} style={{ ...btnSec, marginTop: 4, fontSize: 13 }}>+ Aggiungi voce</button>

            {/* Riepilogo */}
            <div style={{ marginTop: 20, padding: "14px 18px", background: "#f8faff", borderRadius: 10, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: C.sub, marginBottom: 6 }}>
                <span>Totale imponibile</span>
                <span style={{ fontWeight: 600, color: C.text }}>{fmtEur(totImponibile)}</span>
              </div>
              {bollo > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.sub, marginBottom: 6 }}>
                  <span>Marca da bollo virtuale (imponibile &gt; €77,47)</span>
                  <span style={{ fontWeight: 600, color: C.text }}>{fmtEur(bollo)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 4 }}>
                <span style={{ fontWeight: 700, color: C.text }}>Totale fattura</span>
                <span style={{ fontWeight: 800, color: C.primary, fontSize: 18 }}>{fmtEur(totale)}</span>
              </div>
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 12, color: C.sub }}>
              Operazione non soggetta ad IVA ex art. 1, c. 54-89, L. 190/2014 — Regime Forfettario (RF19)
            </p>
          </>}

          {/* ── TAB 2: Pagamento ── */}
          {tab === 2 && <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
              <div>
                <label style={lbl}>Data fattura *</label>
                <input type="date" value={dataFattura} onChange={e => setDataFattura(e.target.value)} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Stato</label>
                <select value={stato} onChange={e => setStato(e.target.value)} style={inp}>
                  {Object.entries(STATO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Modalità di pagamento</label>
                <select value={modalitaPag} onChange={e => setModalitaPag(e.target.value)} style={inp}>
                  {MODALITA_PAG.map(m => <option key={m.cod} value={m.cod}>{m.label} ({m.cod})</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Scadenza pagamento</label>
                <input type="date" value={scadenza} onChange={e => setScadenza(e.target.value)} style={inp}/>
              </div>
            </div>
            <label style={lbl}>Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} style={{ ...inp, resize: "vertical" }} placeholder="Note aggiuntive in fattura…"/>
          </>}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa" }}>
          <div style={{ fontSize: 13, color: C.sub }}>
            Totale: <strong style={{ color: C.text }}>{fmtEur(totale)}</strong>
            {bollo > 0 && <span style={{ marginLeft: 8, color: "#ca8a04" }}>+ €2 bollo</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={btnSec}>Annulla</button>
            <button onClick={handleSave} disabled={saving || !destNome.trim()} style={btnPri}>
              {saving ? "Salvo…" : isEdit ? "Aggiorna" : "Crea Fattura"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Badge stato ───────────────────────────────────────────────────────────────
function StatoBadge({ stato }) {
  const cfg = STATO_CFG[stato] ?? { label: stato, bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 6, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>
      {cfg.label}
    </span>
  );
}

// ── Funzione stampa PDF (client-side) ─────────────────────────────────────────
function stampaPdf(f, clienti) {
  const dest = f.destinatario;
  const nomeCompl = [dest.nome, dest.cognome].filter(Boolean).join(" ");
  const vociHtml = (f.voci || []).map(v => `
    <tr>
      <td>${v.descrizione}</td>
      <td style="text-align:right">${Number(v.quantita).toFixed(2)}</td>
      <td style="text-align:right">€ ${Number(v.prezzoUnitario).toFixed(2)}</td>
      <td style="text-align:right">€ ${Number(v.totale).toFixed(2)}</td>
    </tr>`).join("");
  const bolloRiga = f.importoBollo > 0 ? `<tr><td colspan="3">Marca da bollo virtuale</td><td style="text-align:right">€ 2,00</td></tr>` : "";
  const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"/>
  <title>Fattura N. ${f.numero}/${f.anno}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:10pt;color:#111;padding:18mm}
    h1{font-size:22pt;color:#20489a;margin-bottom:4px}
    .sub{font-size:9pt;color:#555;margin-bottom:24px}
    .two{display:flex;justify-content:space-between;margin-bottom:28px}
    .box{min-width:45%}
    .box h3{font-size:9pt;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:5px}
    table{width:100%;border-collapse:collapse;margin-bottom:18px}
    th{background:#20489a;color:#fff;padding:7px 10px;font-size:9pt;text-align:left}
    td{padding:7px 10px;border-bottom:1px solid #eee;font-size:9.5pt}
    .total-row td{background:#f0f4ff;font-weight:700;border-top:2px solid #20489a}
    .footer{margin-top:24px;font-size:8pt;color:#777;border-top:1px solid #ddd;padding-top:10px;line-height:1.6}
    @media print{body{padding:10mm}@page{size:A4}}
  </style></head><body>
  <div class="two">
    <div>
      <h1>FATTURA</h1>
      <div class="sub">N. ${f.numero}/${f.anno} &nbsp;·&nbsp; ${fmtData(f.data)}</div>
    </div>
  </div>
  <div class="two">
    <div class="box"><h3>Emittente</h3><div id="emit">—</div></div>
    <div class="box"><h3>Committente</h3>
      <strong>${nomeCompl}</strong><br/>
      ${dest.codiceFiscale ? `C.F. ${dest.codiceFiscale}<br/>` : ""}
      ${dest.partitaIva ? `P.IVA ${dest.partitaIva}<br/>` : ""}
      ${[dest.indirizzo, [dest.cap, dest.comune, dest.provincia].filter(Boolean).join(" ")].filter(Boolean).join("<br/>")}
      ${dest.email ? `<br/>${dest.email}` : ""}
    </div>
  </div>
  <table>
    <tr><th>Descrizione</th><th style="text-align:right">Qtà</th><th style="text-align:right">€ Unitario</th><th style="text-align:right">Totale</th></tr>
    ${vociHtml}
    <tr><td colspan="3">Totale imponibile</td><td style="text-align:right">€ ${Number(f.totaleImponibile).toFixed(2)}</td></tr>
    ${bolloRiga}
    <tr class="total-row"><td colspan="3">TOTALE DA PAGARE</td><td style="text-align:right">€ ${Number(f.totale).toFixed(2)}</td></tr>
  </table>
  <div class="footer">
    Operazione non soggetta ad IVA ex art. 1, c. 54-89, L. 190/2014 — Regime Forfettario RF19<br/>
    Modalità di pagamento: ${MODALITA_PAG.find(m=>m.cod===f.modalitaPagamento)?.label ?? f.modalitaPagamento}
    ${f.note ? `<br/>${f.note}` : ""}
  </div>
  <script>
    fetch("/api/config-fiscale").then(r=>r.json()).then(cfg=>{
      document.getElementById("emit").innerHTML =
        "<strong>"+cfg.nome+" "+cfg.cognome+"</strong><br/>"+
        (cfg.partitaIva?"P.IVA "+cfg.partitaIva+"<br/>":"")+
        (cfg.codiceFiscale?"C.F. "+cfg.codiceFiscale+"<br/>":"")+
        [cfg.indirizzo, [cfg.cap,cfg.comune,cfg.provincia].filter(Boolean).join(" ")].filter(Boolean).join("<br/>")+
        (cfg.email?"<br/>"+cfg.email:"");
      window.print();
    });
  </script>
  </body></html>`;
  const w = window.open("", "_blank");
  w?.document.write(html);
  w?.document.close();
}

// ── Pagina principale ─────────────────────────────────────────────────────────
function FatturePageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [fatture, setFatture] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [filtroStato, setFiltroStato] = useState("TUTTE");
  const [modal, setModal] = useState<null | "nuova" | any>(null); // null | "nuova" | fattura obj
  const [deletingId, setDeletingId] = useState(null);

  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "operatore";

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated" || !isAdmin) return;
    loadAll();
  }, [status, anno]);

  async function loadAll() {
    setLoading(true);
    setLoadErr("");
    try {
      const [rF, rC] = await Promise.all([
        fetch(`/api/fatture?anno=${anno}`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
        fetch("/api/clienti").then(r => r.json()).catch(() => []),
      ]);
      setFatture(Array.isArray(rF) ? rF : []);
      setClienti(Array.isArray(rC) ? rC : []);
    } catch (e) {
      setLoadErr(e.message || "Errore di caricamento");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Eliminare questa bozza?")) return;
    setDeletingId(id);
    await fetch(`/api/fatture/${id}`, { method: "DELETE" });
    setFatture(prev => prev.filter(f => f.id !== id));
    setDeletingId(null);
  }

  async function handleStato(id, stato) {
    const res = await fetch(`/api/fatture/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stato }),
    });
    if (res.ok) { const f = await res.json(); setFatture(prev => prev.map(x => x.id === id ? f : x)); }
  }

  function downloadXml(id) { window.open(`/api/fatture/${id}/xml`, "_blank"); }

  // Stats
  const emesse = fatture.filter(f => f.stato === "EMESSA" || f.stato === "PAGATA");
  const totEmesso = emesse.reduce((s, f) => s + f.totale, 0);
  const daRicevere = fatture.filter(f => f.stato === "EMESSA").reduce((s, f) => s + f.totale, 0);
  const incassato = fatture.filter(f => f.stato === "PAGATA").reduce((s, f) => s + f.totale, 0);

  // Filtro
  const fattureVis = filtroStato === "TUTTE" ? fatture : fatture.filter(f => f.stato === filtroStato);
  const filtriDisp = ["TUTTE", "BOZZA", "EMESSA", "PAGATA", "ANNULLATA"];

  if (status === "loading" || loading) return <FullPageSpinner text="Carico fatture…" />;
  if (loadErr) return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <Navbar />
      <div style={{ maxWidth: 500, margin: "80px auto", textAlign: "center", color: "#b91c1c", fontSize: 15, padding: 24 }}>
        <p style={{ fontSize: 22 }}>⚠️</p>
        <p><strong>Errore di caricamento:</strong> {loadErr}</p>
        <p style={{ color: "#6b7280", fontSize: 13, marginTop: 8 }}>Riavvia il server Next.js se l'errore è "HTTP 500". Se il problema persiste controlla la console.</p>
        <button onClick={() => loadAll()}
          style={{ marginTop: 16, padding: "8px 20px", background: C.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
          Riprova
        </button>
      </div>
    </div>
  );
  if (!isAdmin) return <div style={{ padding: 40, textAlign: "center" }}>Accesso non autorizzato</div>;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <Navbar />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 16px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, color: C.text }}>Fatture</h1>
            <p style={{ margin: "4px 0 0", color: C.sub, fontSize: 13 }}>{fatture.length} fatture · anno {anno}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/fatture/config" style={{ ...btnSec, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              ⚙️ Dati fiscali
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button onClick={() => setAnno(a => a - 1)} style={{ ...btnSec, padding: "8px 10px" }}>‹</button>
              <span style={{ fontWeight: 700, color: C.text, minWidth: 44, textAlign: "center" }}>{anno}</span>
              <button onClick={() => setAnno(a => a + 1)} style={{ ...btnSec, padding: "8px 10px" }}>›</button>
            </div>
            <button onClick={() => setModal("nuova")} style={btnPri}>+ Nuova Fattura</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: `Emesso ${anno}`, val: totEmesso, color: C.primary, bg: "#dbeafe" },
            { label: "Da ricevere", val: daRicevere, color: "#b45309", bg: "#fef3c7" },
            { label: "Incassato", val: incassato, color: C.green, bg: "#dcfce7" },
          ].map(s => (
            <div key={s.label} style={{ background: C.card, borderRadius: 12, padding: "16px 20px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, color: C.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{fmtEur(s.val)}</div>
            </div>
          ))}
        </div>

        {/* Filtri */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {filtriDisp.map(f => {
            const n = f === "TUTTE" ? fatture.length : fatture.filter(x => x.stato === f).length;
            return (
              <button key={f} onClick={() => setFiltroStato(f)} style={{
                border: "none", borderRadius: 20, padding: "5px 14px", cursor: "pointer", fontSize: 13, fontWeight: filtroStato === f ? 700 : 400,
                background: filtroStato === f ? C.primary : "#fff", color: filtroStato === f ? "#fff" : C.sub,
                border: `1.5px solid ${filtroStato === f ? C.primary : C.border}`,
              }}>
                {f === "TUTTE" ? "Tutte" : STATO_CFG[f]?.label} ({n})
              </button>
            );
          })}
        </div>

        {/* Tabella */}
        {fattureVis.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: C.sub }}>
            <p style={{ fontSize: 18, margin: "0 0 8px" }}>Nessuna fattura{filtroStato !== "TUTTE" ? ` in stato "${STATO_CFG[filtroStato]?.label}"` : ` per ${anno}`}</p>
            <button onClick={() => setModal("nuova")} style={{ ...btnPri, marginTop: 12 }}>+ Nuova Fattura</button>
          </div>
        ) : (
          <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8faff", borderBottom: `2px solid ${C.border}` }}>
                  {["N°", "Data", "Committente", "Imponibile", "Bollo", "Totale", "Stato", "Azioni"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, color: C.sub, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fattureVis.map(f => {
                  const dest = f.destinatario;
                  const nomeCompl = [dest?.nome, dest?.cognome].filter(Boolean).join(" ") || f.cliente?.nomeReferente || "—";
                  return (
                    <tr key={f.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: C.primary }}>{f.numero}/{f.anno}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: C.sub, whiteSpace: "nowrap" }}>{fmtData(f.data)}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nomeCompl}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, textAlign: "right" }}>{fmtEur(f.totaleImponibile)}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, textAlign: "center", color: f.importoBollo > 0 ? "#b45309" : C.sub }}>{f.importoBollo > 0 ? "€2" : "—"}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: C.text, textAlign: "right", whiteSpace: "nowrap" }}>{fmtEur(f.totale)}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ position: "relative" }}>
                          <select value={f.stato} onChange={e => handleStato(f.id, e.target.value)}
                            style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 700, color: STATO_CFG[f.stato]?.color, padding: 0 }}>
                            {Object.entries(STATO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => setModal(f)} title="Modifica" style={btnXS}>✏️</button>
                          <button onClick={() => stampaPdf(f, clienti)} title="Stampa PDF" style={btnXS}>🖨️</button>
                          <button onClick={() => downloadXml(f.id)} title="Scarica XML FatturaPA" style={btnXS}>📄</button>
                          {f.stato === "BOZZA" && (
                            <button onClick={() => handleDelete(f.id)} disabled={deletingId === f.id} title="Elimina bozza" style={{ ...btnXS, color: C.red }}>🗑</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && (
        <FatturaModal
          fattura={modal === "nuova" ? null : modal}
          clienti={clienti}
          onClose={() => setModal(null)}
          onSaved={loadAll}
        />
      )}
    </div>
  );
}

const lbl = { display: "block", fontSize: 13, color: "#374151", marginBottom: 4, marginTop: 12 } as const;
const inp = { width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" } as const;
const btnPri = { background: "#20489a", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: 14, fontWeight: 600 } as const;
const btnSec = { background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 14 } as const;
const btnXS  = { background: "transparent", border: "none", cursor: "pointer", fontSize: 15, padding: "2px 4px", borderRadius: 4 } as const;

export default function FatturePage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <FatturePageInner />
    </Suspense>
  );
}
