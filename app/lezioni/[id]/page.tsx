// @ts-nocheck
"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import QuizPlayer, { QuizListLezione } from "../../components/quiz/QuizPlayer";
import { FullPageSpinner } from "../../components/Spinner";

const MATERIE = [
  "Matematica","Fisica","Chimica","Biologia","Informatica",
  "Italiano","Latino","Storia","Filosofia","Inglese","Scienze","Generale"
];
const ANNI = ["I","II","III","IV","V"];

// ── Utility: legge file come testo ───────────────────────────────────────────
function readHtmlFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
  });
}

function readBinaryFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── Patch HTML per navigazione sicura nell'iframe ────────────────────────────
// Senza questo, i link <a href="#id"> in srcDoc navigano il parent (Next.js router),
// e i link relativi caricano la app dentro l'iframe.
function injectIframeNav(html: string): string {
  if (!html) return html;
  const baseTag = '<base target="_blank">';
  const fixScript = `<script>
(function(){
  // Anchor nav: scrollIntoView invece di navigare il parent
  document.addEventListener('click', function(e){
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href) return;
    if (href.startsWith('#')) {
      e.preventDefault();
      var el = document.getElementById(href.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, true);
  // Auto-resize: segnala l'altezza reale del contenuto al parent
  function sendHeight() {
    var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight);
    window.parent.postMessage({ iframeHeight: h }, '*');
  }
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(sendHeight).observe(document.body);
  }
  window.addEventListener('load', sendHeight);
  sendHeight();
})();
<\/script>`;
  if (html.includes('</head>')) return html.replace('</head>', baseTag + '\n' + fixScript + '\n</head>');
  if (html.includes('<head>')) return html.replace('<head>', '<head>' + baseTag + '\n' + fixScript);
  return baseTag + fixScript + html;
}

// ── Convertitori per strumenti interattivi ────────────────────────────────────
function buildGgbHtml(base64) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>*{margin:0;padding:0;box-sizing:border-box}body{overflow:hidden;background:#fff}
#ggb-container{width:100vw;height:100vh}</style>
<script src="https://www.geogebra.org/apps/deployggb.js"><\/script>
</head><body><div id="ggb-container"></div>
<script>
var a=new GGBApplet({"appName":"geometry","width":window.innerWidth,"height":window.innerHeight,
"ggbBase64":"${base64}","showToolBar":true,"showAlgebraInput":false,"showMenuBar":false,
"enableRightClick":false,"scaleContainerClass":"ggb-container"},true);
window.addEventListener("load",function(){a.inject("ggb-container");});
<\/script></body></html>`;
}

function buildSvgHtml(svgText) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>*{margin:0;padding:0}body{display:flex;justify-content:center;align-items:flex-start;padding:20px;background:#fff}
svg{max-width:100%;height:auto}</style>
</head><body>${svgText}</body></html>`;
}

function buildJsonHtml(jsonText, filename) {
  const escaped = jsonText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{margin:0;padding:16px;font-family:monospace;font-size:13px;background:#1e1e2e;color:#cdd6f4;white-space:pre-wrap;word-break:break-all}
.title{color:#89b4fa;font-family:Arial;font-size:14px;font-weight:bold;margin-bottom:12px;display:block}</style>
</head><body><span class="title">${filename}</span>${escaped}</body></html>`;
}

function buildIpynbHtml(ipynbText) {
  try {
    const nb = JSON.parse(ipynbText);
    const cells = (nb.cells || []).map(cell => {
      const src = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '');
      const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      if (cell.cell_type === 'markdown') {
        return `<div class="cell md"><pre>${esc(src)}</pre></div>`;
      }
      if (cell.cell_type === 'code') {
        const outs = (cell.outputs || []).map(o => {
          const t = o.text ? (Array.isArray(o.text)?o.text.join(''):o.text)
            : o.data?.['text/plain'] ? (Array.isArray(o.data['text/plain'])?o.data['text/plain'].join(''):o.data['text/plain']) : '';
          return t ? `<div class="output">${esc(t)}</div>` : '';
        }).join('');
        return `<div class="cell code"><pre>${esc(src)}</pre>${outs}</div>`;
      }
      return '';
    }).join('');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{margin:0;padding:16px;font-family:Arial,sans-serif;background:#fff;color:#111}
.cell{border:1px solid #e5e7eb;border-radius:8px;margin-bottom:12px;overflow:hidden}
.cell.md pre{margin:0;padding:12px 16px;background:#f9fafb;font-family:inherit;font-size:14px;white-space:pre-wrap}
.cell.code pre{margin:0;padding:12px 16px;background:#1e1e2e;color:#cdd6f4;font-size:13px;overflow-x:auto;white-space:pre}
.output{padding:8px 16px;background:#f0f4ff;font-family:monospace;font-size:12px;white-space:pre-wrap;border-top:1px solid #e5e7eb}
</style></head><body>${cells}</body></html>`;
  } catch {
    return `<!DOCTYPE html><html><body><pre style="padding:16px;font-family:monospace;white-space:pre-wrap">${ipynbText.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre></body></html>`;
  }
}

// ── Download strumento con copyright ─────────────────────────────────────────
function downloadStrumento(html, titolo) {
  const year = new Date().getFullYear();
  const banner = `<div style="position:fixed;bottom:0;left:0;right:0;background:rgba(32,72,154,0.93);color:#fff;text-align:center;padding:6px 12px;font-size:11px;font-family:Arial,sans-serif;z-index:99999;letter-spacing:0.3px">© ${year} Recuperiamo · Materiale didattico riservato agli studenti della piattaforma · Vietata la riproduzione non autorizzata</div>`;
  const comment = `\n<!-- © ${year} Recuperiamo - ${titolo} - Materiale protetto da copyright - Tutti i diritti riservati -->`;
  const withCopyright = html.includes('</body>')
    ? html.replace('</body>', banner + '\n</body>') + comment
    : html + banner + comment;
  const slug = titolo.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const blob = new Blob([withCopyright], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}-strumento.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function convertFileToHtml(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'ggb') {
    const buf = await readBinaryFile(file);
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    return buildGgbHtml(btoa(bin));
  }
  const text = await readHtmlFile(file);
  if (ext === 'svg') return buildSvgHtml(text);
  if (ext === 'json') return buildJsonHtml(text, file.name);
  if (ext === 'ipynb') return buildIpynbHtml(text);
  return text; // html, htm e qualsiasi altro formato testuale
}

// ── Utility: scansiona HTML per titoli di altri argomenti ─────────────────────
const ARTICLES_RE = /^(la |il |lo |le |i |gli |un |una |l'|l'|delle |degli |dei |del |della |dello )/i;

function scanHtmlForLinks(html, allArgomenti, currentId) {
  if (!html || !allArgomenti?.length) return [];
  // Estrai testo puro
  const div = document.createElement("div");
  div.innerHTML = html;
  const plainText = div.innerText || div.textContent || "";
  const lowerText = plainText.toLowerCase();

  const results = [];
  for (const arg of allArgomenti) {
    if (arg.id === Number(currentId)) continue;

    const candidates = [];
    const full = arg.titolo.trim();
    if (full.length >= 3) candidates.push(full);
    const short = full.replace(ARTICLES_RE, "").trim();
    if (short !== full && short.length >= 3) candidates.push(short);

    for (const term of candidates) {
      const idx = lowerText.indexOf(term.toLowerCase());
      if (idx !== -1) {
        // Recupera il testo originale con la capitalizzazione originale
        const originalTerm = plainText.slice(idx, idx + term.length);
        results.push({ term: originalTerm, argomento: arg, approved: true });
        break; // una sola corrispondenza per argomento
      }
    }
  }
  return results;
}

// ── Utility: inserisce link alla prima occorrenza in ogni text node ───────────
function insertFirstLink(doc, searchText, argId) {
  const walker = doc.createTreeWalker(
    doc.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        // Salta nodi dentro <a>
        let p = node.parentElement;
        while (p && p !== doc.body) {
          if (p.tagName === "A") return NodeFilter.FILTER_REJECT;
          p = p.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  let node;
  while ((node = walker.nextNode())) {
    const lower = node.textContent.toLowerCase();
    const idx = lower.indexOf(searchText.toLowerCase());
    if (idx !== -1) {
      const before = node.textContent.slice(0, idx);
      const match = node.textContent.slice(idx, idx + searchText.length);
      const after = node.textContent.slice(idx + searchText.length);
      const a = doc.createElement("a");
      a.href = "/lezioni/" + argId;
      a.textContent = match;
      a.style.cssText = "color:#1cb0f6;font-weight:600;text-decoration:underline;";
      const parent = node.parentNode;
      if (before) parent.insertBefore(doc.createTextNode(before), node);
      parent.insertBefore(a, node);
      if (after) parent.insertBefore(doc.createTextNode(after), node);
      parent.removeChild(node);
      return true;
    }
  }
  return false;
}

function applyLinksToHtml(htmlString, approvedSuggestions) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  for (const s of approvedSuggestions) {
    if (s.approved) insertFirstLink(doc, s.term, s.argomento.id);
  }
  const isFullDoc = /<html/i.test(htmlString);
  return isFullDoc ? doc.documentElement.outerHTML : doc.body.innerHTML;
}

// ── Componente upload sezione HTML ────────────────────────────────────────────
function UploadSection({ label, htmlKey, value, onUploaded }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const html = await readHtmlFile(file);
      await onUploaded(htmlKey, html);
    } catch {
      alert("Errore nella lettura del file");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#20489a", minWidth: 60 }}>{label}</span>
      {value ? (
        <span style={{ fontSize: 12, color: "#12753a", fontWeight: 600, background: "#c7f7d7", borderRadius: 20, padding: "3px 10px" }}>✓ Caricato</span>
      ) : (
        <span style={{ fontSize: 12, color: "#aaa" }}>Nessun file</span>
      )}
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
        style={{ background: "#1cb0f6", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        {uploading ? "..." : value ? "Sostituisci" : "Carica .html"}
      </button>
      {value && (
        <button type="button" onClick={() => onUploaded(htmlKey, null)}
          style={{ background: "#ffebee", color: "#c62828", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Rimuovi
        </button>
      )}
      <input ref={fileRef} type="file" accept=".html,.htm" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}

// ── Componente upload strumenti interattivi ───────────────────────────────────
function UploadStrumenti({ value, scaricabile, onUploaded, onToggleScaricabile }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const html = await convertFileToHtml(file);
      await onUploaded("strumentiHtml", html);
    } catch (err) {
      alert("Errore nella lettura del file: " + (err?.message || err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#20489a", minWidth: 60 }}>Strumenti</span>
        {value ? (
          <span style={{ fontSize: 12, color: "#12753a", fontWeight: 600, background: "#c7f7d7", borderRadius: 20, padding: "3px 10px" }}>✓ Caricato</span>
        ) : (
          <span style={{ fontSize: 12, color: "#aaa" }}>Nessun file</span>
        )}
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ background: "#1cb0f6", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          {uploading ? "Conversione…" : value ? "Sostituisci" : "Carica file"}
        </button>
        {value && (
          <button type="button" onClick={() => onUploaded("strumentiHtml", null)}
            style={{ background: "#ffebee", color: "#c62828", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Rimuovi
          </button>
        )}
        <span style={{ fontSize: 11, color: "#999" }}>.html · .json · .ggb · .ipynb · .svg</span>
        <input ref={fileRef} type="file" accept=".html,.htm,.json,.ggb,.ipynb,.svg" style={{ display: "none" }} onChange={handleFile} />
      </div>
      {value && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 68, cursor: "pointer" }}>
          <input type="checkbox" checked={!!scaricabile} onChange={onToggleScaricabile}
            style={{ accentColor: "#20489a", width: 14, height: 14 }} />
          <span style={{ fontSize: 12, color: scaricabile ? "#20489a" : "#6b7280", fontWeight: scaricabile ? 600 : 400 }}>
            Permetti download agli studenti
            {scaricabile && <span style={{ marginLeft: 6, fontSize: 11, color: "#6b7280", fontWeight: 400 }}>(con copyright Recuperiamo)</span>}
          </span>
        </label>
      )}
    </div>
  );
}

// ── Pannello suggerimenti link ────────────────────────────────────────────────
function SuggestLinksPanel({ suggestions, setSuggestions, onApply, applying }) {
  if (!suggestions) return null;

  if (suggestions.length === 0) {
    return (
      <div style={{ background: "#f0f7ff", border: "1px solid #c3d9f0", borderRadius: 10, padding: "12px 16px", marginTop: 10, fontSize: 13, color: "#4268b3" }}>
        Nessuna corrispondenza trovata con altri argomenti pubblicati.
      </div>
    );
  }

  const anyApproved = suggestions.some(s => s.approved);

  return (
    <div style={{ background: "#f8faff", border: "1.5px solid #1cb0f6", borderRadius: 10, padding: "14px 16px", marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#20489a" }}>
          {suggestions.length} corrispondenz{suggestions.length === 1 ? "a" : "e"} trovata{suggestions.length === 1 ? "" : "e"}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setSuggestions(null)}
            style={{ background: "transparent", border: "none", fontSize: 12, color: "#aaa", cursor: "pointer", fontWeight: 600 }}>
            Chiudi
          </button>
          <button onClick={onApply} disabled={!anyApproved || applying}
            style={{ background: anyApproved ? "#1cb0f6" : "#ddd", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: anyApproved ? "pointer" : "not-allowed" }}>
            {applying ? "Applicazione..." : "Applica selezionati"}
          </button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {suggestions.map((s, i) => (
          <label key={i} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 10px", borderRadius: 8, background: s.approved ? "#e0f4ff" : "#f5f5f5", border: "1px solid " + (s.approved ? "#90caf9" : "#e0e0e0") }}>
            <input type="checkbox" checked={s.approved}
              onChange={e => setSuggestions(prev => prev.map((x, j) => j === i ? { ...x, approved: e.target.checked } : x))} />
            <span style={{ fontFamily: "monospace", background: "#fff3cd", borderRadius: 4, padding: "1px 6px", fontSize: 13, fontWeight: 700, color: "#20489a" }}>
              "{s.term}"
            </span>
            <span style={{ fontSize: 12, color: "#666" }}>→</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#20489a" }}>{s.argomento.titolo}</span>
            <span style={{ fontSize: 11, color: "#4268b3", background: "#e3eefe", borderRadius: 12, padding: "1px 8px" }}>
              {s.argomento.materia}{s.argomento.anno ? " · " + s.argomento.anno : ""}
            </span>
          </label>
        ))}
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 11, color: "#aaa" }}>
        Verrà inserito un link alla prima occorrenza di ogni termine nel testo.
      </p>
    </div>
  );
}

// ── Pagina dettaglio (inner, uses useSearchParams) ────────────────────────────
function LezioneDetailPageInner() {
  const { data: session } = useSession();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id;
  const role = session?.user?.role;
  const isAdmin = role === "admin" || role === "operatore";

  const [lezione, setLezione] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(searchParams?.get("tab") || null);
  const [saving, setSaving] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(620);

  // Ascolta l'altezza reale dell'iframe per eliminare lo scroll interno
  useEffect(() => {
    function onMessage(e) {
      if (e.data?.iframeHeight) setIframeHeight(Math.max(400, e.data.iframeHeight));
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Reset altezza iframe al cambio tab
  useEffect(() => { setIframeHeight(620); }, [tab]);

  // Modifica info
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState(null);
  const [savingInfo, setSavingInfo] = useState(false);
  const [macroArgomenti, setMacroArgomenti] = useState([]);
  const [argomenti, setArgomenti] = useState([]);

  function openEditInfo() {
    setInfoForm({
      titolo: lezione.titolo,
      materia: lezione.materia,
      anno: lezione.anno || "",
      argomentoId: lezione.argomentoId ?? "",
      macroArgomentoId: lezione.macroArgomentoId ?? "",
    });
    setEditingInfo(true);
    if (!macroArgomenti.length) {
      fetch("/api/macro-argomenti").then(r=>r.json()).then(d=>setMacroArgomenti(Array.isArray(d)?d:[]));
      fetch("/api/argomenti").then(r=>r.json()).then(d=>setArgomenti(Array.isArray(d)?d:[]));
    }
  }

  async function handleSaveInfo() {
    if (!infoForm.titolo.trim()) return;
    setSavingInfo(true);
    try {
      const body = {
        titolo: infoForm.titolo,
        materia: infoForm.materia,
        anno: infoForm.anno || null,
        argomentoId: infoForm.argomentoId ? Number(infoForm.argomentoId) : null,
        macroArgomentoId: (!infoForm.argomentoId && infoForm.macroArgomentoId) ? Number(infoForm.macroArgomentoId) : null,
      };
      const res = await fetch("/api/lezioni/" + id, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      const updated = await res.json();
      setLezione(prev => ({ ...prev, ...updated }));
      setEditingInfo(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingInfo(false);
    }
  }

  // Alias per compatibilità con il resto del codice
  const argomento = lezione;

  // Suggerisci link
  const [allArgomenti, setAllArgomenti] = useState(null);
  const [loadingArgs, setLoadingArgs] = useState(false);
  const [suggestions, setSuggestions] = useState(null); // null = non scansionato
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch("/api/lezioni/" + id, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error("Non autorizzato o non trovato"); return r.json(); })
      .then(data => { setLezione(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [id]);

  // Seleziona tab iniziale
  useEffect(() => {
    if (!argomento) return;
    const urlTab = searchParams?.get("tab");
    const available = [];
    if (argomento.mappaHtml) available.push("mappa");
    if (argomento.teoriaHtml) available.push("teoria");
    if (argomento.eserciziHtml) available.push("esercizi");
    if (argomento.strumentiHtml) available.push("strumenti");
    if (urlTab && available.includes(urlTab)) { setTab(urlTab); return; }
    if (available.length > 0) setTab(available[0]);
  }, [argomento, searchParams]);

  // Reset suggerimenti quando cambia tab
  useEffect(() => { setSuggestions(null); }, [tab]);

  async function handleToggleScaricabile() {
    const res = await fetch("/api/lezioni/" + id, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strumentiScaricabile: !argomento.strumentiScaricabile }),
    });
    if (res.ok) { const updated = await res.json(); setLezione(prev => ({ ...prev, ...updated })); }
  }

  async function handleUploaded(key, html) {
    setSaving(true);
    try {
      const res = await fetch("/api/lezioni/" + id, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: html }),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      const updated = await res.json();
      setLezione(prev => ({ ...prev, ...updated }));
      if (html) setTab(key.replace("Html", ""));
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSuggest() {
    const htmlKey = tab + "Html";
    const html = argomento?.[htmlKey];
    if (!html) return;

    // Carica tutti gli argomenti se non già caricati
    let args = allArgomenti;
    if (!args) {
      setLoadingArgs(true);
      try {
        const r = await fetch("/api/lezioni", { credentials: "include" });
        args = r.ok ? await r.json() : [];
        setAllArgomenti(args);
      } catch {
        args = [];
      } finally {
        setLoadingArgs(false);
      }
    }

    const found = scanHtmlForLinks(html, args, id);
    setSuggestions(found);
  }

  async function handleApplySuggestions() {
    const htmlKey = tab + "Html";
    const html = argomento?.[htmlKey];
    if (!html || !suggestions) return;

    const approved = suggestions.filter(s => s.approved);
    if (approved.length === 0) return;

    setApplying(true);
    try {
      const newHtml = applyLinksToHtml(html, approved);
      await handleUploaded(htmlKey, newHtml);
      setSuggestions(null);
    } finally {
      setApplying(false);
    }
  }

  const pageStyle = { maxWidth: 1100, margin: "0 auto", padding: "28px 20px", fontFamily: "'Inter','Segoe UI',Arial,sans-serif" };
  const wrapStyle = { minHeight: "100vh", background: "#f0f4ff" };

  if (loading) return <FullPageSpinner text="Carico la lezione..." />;

  if (error) return (
    <div style={wrapStyle}>
      <Navbar />
      <div style={pageStyle}>
        <div style={{ background: "#ffebee", border: "1px solid #ffcdd2", borderRadius: 10, padding: 20, color: "#c62828", fontWeight: 600 }}>{error}</div>
        <Link href="/lezioni" style={{ display: "inline-block", marginTop: 16, color: "#1cb0f6", fontWeight: 600, textDecoration: "none" }}>← Torna alle lezioni</Link>
      </div>
    </div>
  );

  const allSezioni = [
    { key: "mappa",      htmlKey: "mappaHtml",      label: "Mappa concettuale" },
    { key: "teoria",     htmlKey: "teoriaHtml",     label: "Teoria" },
    { key: "esercizi",   htmlKey: "eserciziHtml",   label: "Esercizi" },
    { key: "strumenti",  htmlKey: "strumentiHtml",  label: "Strumenti interattivi" },
  ];
  const sezioniConContenuto = allSezioni.filter(s => argomento[s.htmlKey]);
  // Il tab "quiz" è sempre visibile (admin: editor; studente: player)
  const tuttiTab = [...sezioniConContenuto, { key: "quiz", htmlKey: null, label: "Mettiti alla prova" }];
  const htmlContent = { mappa: argomento.mappaHtml, teoria: argomento.teoriaHtml, esercizi: argomento.eserciziHtml, strumenti: argomento.strumentiHtml };
  const currentHtml = htmlContent[tab] || "";

  return (
    <div style={wrapStyle}>
      <Navbar />
      <div style={pageStyle}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href="/lezioni" style={{ color: "#1cb0f6", fontWeight: 600, textDecoration: "none", fontSize: 14 }}>← Lezioni</Link>
        {argomento.macroArgomento && <>
          <span style={{ color: "#ccc" }}>/</span>
          <Link href={"/lezioni?macro=" + encodeURIComponent(argomento.macroArgomento.nome)} style={{ color: "#4268b3", fontSize: 14, textDecoration: "none", fontWeight: 600 }}>{argomento.macroArgomento.nome}</Link>
        </>}
        {argomento.argomento && <>
          <span style={{ color: "#ccc" }}>/</span>
          <Link href={"/lezioni?macro=" + encodeURIComponent(argomento.argomento.macroArgomento?.nome||"") + "&arg=" + encodeURIComponent(argomento.argomento.nome)} style={{ color: "#4268b3", fontSize: 14, textDecoration: "none", fontWeight: 600 }}>{argomento.argomento.nome}</Link>
        </>}
        <span style={{ color: "#ccc" }}>/</span>
        <span style={{ color: "#20489a", fontWeight: 700, fontSize: 14 }}>{argomento.titolo}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, color: "#20489a", fontWeight: 800 }}>{argomento.titolo}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#4268b3", background: "#e3eefe", padding: "2px 10px", borderRadius: 20, fontWeight: 600 }}>{argomento.materia}</span>
          {argomento.anno && <span style={{ fontSize: 13, color: "#4268b3", background: "#e3eefe", padding: "2px 10px", borderRadius: 20, fontWeight: 600 }}>{argomento.anno}</span>}
          {argomento.tags?.map(t => (
            <span key={t} style={{ fontSize: 12, color: "#20489a", background: "#f0f7ff", border: "1px solid #c3d9f0", padding: "2px 10px", borderRadius: 20, fontWeight: 600 }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Gestione contenuti (admin) */}
      {isAdmin && (
        <div style={{ background: "#f8faff", border: "1px solid #dbe4f1", borderRadius: 12, padding: "14px 18px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#20489a" }}>Gestione contenuti</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {saving && <span style={{ fontSize: 12, color: "#1cb0f6" }}>Salvataggio...</span>}
              <button onClick={editingInfo ? () => setEditingInfo(false) : openEditInfo}
                style={{ background: editingInfo ? "#e3eefe" : "#fff", color: "#20489a", border: "1.5px solid #dbe4f1", borderRadius: 7, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {editingInfo ? "Chiudi" : "✏️ Modifica info"}
              </button>
            </div>
          </div>

          {/* Form modifica info */}
          {editingInfo && infoForm && (
            <div style={{ background: "#fff", border: "1px solid #dbe4f1", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
              {(() => {
                const fi = { display: "block", width: "100%", border: "1.5px solid #dbe4f1", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", marginTop: 3 };
                const filteredMacro = macroArgomenti.filter(m => m.materia === infoForm.materia);
                const filteredArg = argomenti.filter(a => !infoForm.macroArgomentoId || a.macroArgomentoId === Number(infoForm.macroArgomentoId));
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label style={{ display: "flex", flexDirection: "column", fontSize: 12, fontWeight: 600, color: "#20489a" }}>
                      Titolo
                      <input value={infoForm.titolo} onChange={e => setInfoForm(f => ({ ...f, titolo: e.target.value }))} style={fi} />
                    </label>
                    <div style={{ display: "flex", gap: 10 }}>
                      <label style={{ display: "flex", flexDirection: "column", fontSize: 12, fontWeight: 600, color: "#20489a", flex: 1 }}>
                        Materia
                        <select value={infoForm.materia} onChange={e => setInfoForm(f => ({ ...f, materia: e.target.value, macroArgomentoId: "", argomentoId: "" }))} style={fi}>
                          {MATERIE.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", fontSize: 12, fontWeight: 600, color: "#20489a", flex: 1 }}>
                        Anno
                        <select value={infoForm.anno} onChange={e => setInfoForm(f => ({ ...f, anno: e.target.value }))} style={fi}>
                          <option value="">— nessuno —</option>
                          {ANNI.map(a => <option key={a} value={a}>{a} anno</option>)}
                        </select>
                      </label>
                    </div>
                    <label style={{ display: "flex", flexDirection: "column", fontSize: 12, fontWeight: 600, color: "#20489a" }}>
                      Macro-argomento
                      <select value={infoForm.macroArgomentoId} onChange={e => setInfoForm(f => ({ ...f, macroArgomentoId: e.target.value, argomentoId: "" }))} style={fi}>
                        <option value="">— nessuno —</option>
                        {filteredMacro.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                      </select>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", fontSize: 12, fontWeight: 600, color: "#20489a" }}>
                      Argomento <span style={{ fontWeight:400,color:"#6b7280",fontSize:11 }}>(opzionale)</span>
                      <select value={infoForm.argomentoId} onChange={e => setInfoForm(f => ({ ...f, argomentoId: e.target.value }))} style={fi}>
                        <option value="">— nessuno (la lezione è già l'argomento) —</option>
                        {filteredArg.map(a => <option key={a.id} value={a.id}>{a.nome}{a.macroArgomento ? ` (${a.macroArgomento.nome})` : ""}</option>)}
                      </select>
                    </label>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => setEditingInfo(false)} style={{ background: "#e3eefe", color: "#20489a", border: "none", borderRadius: 7, padding: "7px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Annulla</button>
                      <button onClick={handleSaveInfo} disabled={savingInfo || !infoForm.titolo.trim()}
                        style={{ background: "#1cb0f6", color: "#fff", border: "none", borderRadius: 7, padding: "7px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                        {savingInfo ? "Salvataggio..." : "Salva"}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <UploadSection label="Mappa" htmlKey="mappaHtml" value={argomento.mappaHtml} onUploaded={handleUploaded} />
            <UploadSection label="Teoria" htmlKey="teoriaHtml" value={argomento.teoriaHtml} onUploaded={handleUploaded} />
            <UploadSection label="Esercizi" htmlKey="eserciziHtml" value={argomento.eserciziHtml} onUploaded={handleUploaded} />
            <UploadStrumenti value={argomento.strumentiHtml} scaricabile={argomento.strumentiScaricabile} onUploaded={handleUploaded} onToggleScaricabile={handleToggleScaricabile} />
          </div>

          {/* Pulsante suggerisci link — solo per contenuto didattico testuale, non per strumenti */}
          {currentHtml && tab !== "strumenti" && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #dbe4f1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={handleSuggest}
                  disabled={loadingArgs}
                  style={{ background: "#fff", color: "#20489a", border: "1.5px solid #20489a", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {loadingArgs ? "Caricamento..." : "🔗 Suggerisci link interni"}
                </button>
                <span style={{ fontSize: 11, color: "#999" }}>
                  Cerca corrispondenze con altri argomenti pubblicati nella sezione "{tab}"
                </span>
              </div>

              <SuggestLinksPanel
                suggestions={suggestions}
                setSuggestions={setSuggestions}
                onApply={handleApplySuggestions}
                applying={applying}
              />
            </div>
          )}
        </div>
      )}

      {/* Contenuto */}
      {sezioniConContenuto.length === 0 && !isAdmin ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#4268b3" }}>
          <p style={{ fontWeight: 600 }}>Nessun contenuto disponibile per questo argomento.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", borderBottom: "2px solid #dbe4f1" }}>
            {tuttiTab.map(s => (
              <button key={s.key} onClick={() => setTab(s.key)} style={{ border: "none", borderBottom: tab === s.key ? "3px solid #1cb0f6" : "3px solid transparent", borderRadius: 0, padding: "10px 22px", fontWeight: 600, fontSize: 14, cursor: "pointer", background: "transparent", color: tab === s.key ? "#1cb0f6" : "#4268b3", marginBottom: -2 }}>
                {s.label}
              </button>
            ))}
            {currentHtml && tab !== "quiz" && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 6, paddingRight: 8 }}>
                {tab === "strumenti" && argomento.strumentiScaricabile && (
                  <button
                    onClick={() => downloadStrumento(currentHtml, argomento.titolo)}
                    title="Scarica strumento"
                    style={{ background: "#20489a", color: "#fff", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                    ⬇ Scarica
                  </button>
                )}
                <button
                  onClick={() => {
                    const blob = new Blob([currentHtml], { type: "text/html" });
                    const url = URL.createObjectURL(blob);
                    window.open(url, "_blank");
                  }}
                  title="Apri in nuova scheda"
                  style={{ background: "transparent", border: "1px solid #dbe4f1", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#4268b3", cursor: "pointer", fontWeight: 600 }}>
                  ↗ Nuova scheda
                </button>
              </div>
            )}
          </div>
          <div style={{ border: "1px solid #dbe4f1", borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
            {tab === "quiz" ? (
              <div style={{ padding: "16px 20px" }}>
                {isAdmin && (
                  <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
                    <a href="/quiz" style={{ fontSize: 12, color: "#4268b3", fontWeight: 600, textDecoration: "none", border: "1px solid #dbe4f1", borderRadius: 7, padding: "5px 14px", background: "#f8faff" }}>
                      ✏️ Gestisci test →
                    </a>
                  </div>
                )}
                <QuizListLezione lezioneId={Number(id)} />
              </div>
            ) : currentHtml ? (
              <iframe key={tab} srcDoc={injectIframeNav(currentHtml)} style={{ width: "100%", height: iframeHeight, border: "none", display: "block", overflow: "hidden" }} sandbox="allow-scripts allow-same-origin allow-forms" />
            ) : (
              <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>
                {isAdmin ? "Carica i file HTML qui sopra per aggiungere contenuto." : "Nessun contenuto per questa sezione."}
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
}

// ── Export con Suspense (richiesto da useSearchParams in Next.js 15) ───────────
export default function LezioneDetailPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <LezioneDetailPageInner />
    </Suspense>
  );
}
