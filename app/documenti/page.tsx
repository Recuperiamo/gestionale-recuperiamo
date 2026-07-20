// @ts-nocheck
"use client";
import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { FullPageSpinner } from "../components/Spinner";

const MODALITA_PAG = [
  { cod: "MP05", label: "Bonifico bancario" },
  { cod: "MP01", label: "Contanti" },
  { cod: "MP08", label: "Carta di pagamento" },
  { cod: "MP02", label: "Assegno" },
  { cod: "MP21", label: "Rid" },
];

const C = {
  bg: "#f0f4ff", card: "#fff", primary: "#20489a", light: "#dbeafe",
  text: "#1e293b", sub: "#6b7280", border: "#e5e7eb",
  green: "#15803d",
};

function fmtEur(v) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v ?? 0);
}
function fmtData(d) {
  return d ? new Date(d).toLocaleDateString("it-IT") : "—";
}

const STATO_CFG = {
  EMESSA: { label: "Emessa",    bg: "#dbeafe", color: "#1d4ed8" },
  PAGATA: { label: "Pagata",    bg: "#dcfce7", color: "#15803d" },
};

function StatoBadge({ stato }) {
  const cfg = STATO_CFG[stato] ?? { label: stato, bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 6, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>
      {cfg.label}
    </span>
  );
}

function stampaPdf(f) {
  const dest = f.destinatario ?? {};
  const nomeCompl = [dest.nome, dest.cognome].filter(Boolean).join(" ");
  const vociHtml = (f.voci || []).map(v => `
    <tr>
      <td>${v.descrizione}</td>
      <td style="text-align:right">${Number(v.quantita).toFixed(2)}</td>
      <td style="text-align:right">€ ${Number(v.prezzoUnitario).toFixed(2)}</td>
      <td style="text-align:right">€ ${Number(v.totale).toFixed(2)}</td>
    </tr>`).join("");
  const inpsRiga = f.applicaRivalsaInps && f.importoRivalsaInps > 0
    ? `<tr><td colspan="3">Rivalsa INPS 4% — Gestione Separata</td><td style="text-align:right">€ ${Number(f.importoRivalsaInps).toFixed(2)}</td></tr>` : "";
  const bolloRiga = f.importoBollo > 0
    ? `<tr><td colspan="3">Marca da bollo virtuale</td><td style="text-align:right">€ 2,00</td></tr>` : "";
  const modPagLabel = MODALITA_PAG.find(m => m.cod === f.modalitaPagamento)?.label ?? f.modalitaPagamento;

  const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"/>
  <title>Fattura N. ${f.numero}/${f.anno}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:10pt;color:#111;padding:18mm}
    .cortesia{background:#fff8e1;border:1.5px solid #f59e0b;border-radius:6px;padding:7px 14px;margin-bottom:18px;font-size:8.5pt;color:#92400e;text-align:center}
    .cortesia strong{display:block;font-size:10pt;margin-bottom:2px}
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
  <div class="cortesia">
    <strong>Copia di cortesia</strong>
    Questo documento non ha alcuna valenza fiscale
  </div>
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
    ${inpsRiga}
    ${bolloRiga}
    <tr class="total-row"><td colspan="3">TOTALE DA PAGARE</td><td style="text-align:right">€ ${Number(f.totale).toFixed(2)}</td></tr>
  </table>
  <div class="footer">
    Operazione in franchigia IVA e non soggetta a ritenuta d'acconto effettuata ai sensi dell'art. 1, commi da 54 a 89 della Legge n. 190/2014 &ndash; Regime forfettario.${f.importoBollo > 0 ? "<br/>Imposta di bollo assolta in modo virtuale ai sensi del D.M. 17 giugno 2014." : ""}<br/>
    Modalità di pagamento: ${modPagLabel}
    ${f.note ? `<br/>${f.note}` : ""}
  </div>
  <script>
    fetch("/api/config-fiscale").then(r=>r.json()).then(cfg=>{
      document.getElementById("emit").innerHTML =
        "<strong>"+(cfg.nome||"")+" "+(cfg.cognome||"")+"</strong><br/>"+
        (cfg.partitaIva?"P.IVA "+cfg.partitaIva+"<br/>":"")+
        (cfg.codiceFiscale?"C.F. "+cfg.codiceFiscale+"<br/>":"")+
        [cfg.indirizzo,[cfg.cap,cfg.comune,cfg.provincia].filter(Boolean).join(" ")].filter(Boolean).join("<br/>")+
        (cfg.email?"<br/>"+cfg.email:"");
      window.print();
    }).catch(()=>{ window.print(); });
  </script>
  </body></html>`;

  const w = window.open("", "_blank");
  w?.document.write(html);
  w?.document.close();
}

function DocumentiPageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [fatture, setFatture] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;
    fetch("/api/documenti")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => setFatture(Array.isArray(data) ? data : []))
      .catch(e => setLoadErr(e.message))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) return <FullPageSpinner text="Carico documenti…" />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <Navbar />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px" }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 24, color: C.text }}>I miei documenti</h1>
          <p style={{ margin: "5px 0 0", color: C.sub, fontSize: 13 }}>
            Fatture emesse a tuo nome — solo lettura, copia di cortesia
          </p>
        </div>

        {loadErr && (
          <div style={{ padding: "14px 18px", background: "#fee2e2", borderRadius: 10, color: "#b91c1c", marginBottom: 20 }}>
            Errore nel caricamento: {loadErr}
          </div>
        )}

        {!loadErr && fatture.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.sub }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            <p style={{ fontSize: 16, margin: 0 }}>Nessun documento disponibile</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Le fatture emesse a tuo nome appariranno qui</p>
          </div>
        )}

        {fatture.length > 0 && (
          <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8faff", borderBottom: `2px solid ${C.border}` }}>
                  {["N°", "Data", "Totale", "Stato", ""].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, color: C.sub, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fatture.map(f => (
                  <tr key={f.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: C.primary }}>
                      {f.numero}/{f.anno}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: C.sub, whiteSpace: "nowrap" }}>
                      {fmtData(f.data)}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: C.text }}>
                      {fmtEur(f.totale)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <StatoBadge stato={f.stato} />
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button
                        onClick={() => stampaPdf(f)}
                        title="Scarica PDF"
                        style={{
                          background: C.light, color: C.primary, border: `1px solid #bfdbfe`,
                          borderRadius: 7, padding: "6px 14px", cursor: "pointer",
                          fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6,
                        }}
                      >
                        🖨️ Scarica PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p style={{ marginTop: 20, fontSize: 11, color: C.sub, textAlign: "center" }}>
          Il documento fiscale ufficiale è il file XML trasmesso al Sistema di Interscambio (SDI). Questo PDF è una copia di cortesia senza valenza fiscale.
        </p>
      </div>
    </div>
  );
}

export default function DocumentiPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <DocumentiPageInner />
    </Suspense>
  );
}
