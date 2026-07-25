// @ts-nocheck
"use client";
import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { FullPageSpinner } from "../components/Spinner";

// ── Materie con ordine fisso ──────────────────────────────────────────────────
const MATERIE = [
  "Matematica","Fisica","Chimica","Biologia","Informatica",
  "Italiano","Latino","Storia","Filosofia","Inglese","Scienze","Generale"
];

const MATERIE_PINNED = ["Matematica","Fisica","Chimica"];

const MATERIE_CONFIG: Record<string,{colore:string;bg:string;icona:string}> = {
  Matematica: { colore:"#4f46e5", bg:"#e0e7ff", icona:"∑" },
  Fisica:     { colore:"#7c3aed", bg:"#ede9fe", icona:"⚡" },
  Chimica:    { colore:"#059669", bg:"#d1fae5", icona:"⚗️" },
};

const ANNI = ["I","II","III","IV","V"];

const MACRO_PREDEFINITI = {
  Matematica: [
    "Il linguaggio della Matematica","Logica","Insiemistica","Gli Insiemi Numerici",
    "Algebra","Geometria","Geometria Analitica","Calcolo Combinatorio",
    "Probabilità","Relazioni e Funzioni","Analisi Matematica"
  ],
};

const C = {
  bg:"#f0f4ff", card:"#fff", primary:"#4f46e5", light:"#e0e7ff",
  text:"#1e1b4b", sub:"#6b7280", border:"#e5e7eb",
  green:"#16a34a", red:"#dc2626", yellow:"#ca8a04",
  macroRow:"#f8f7ff", argRow:"#fafafa",
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODALE LEZIONE
// ═══════════════════════════════════════════════════════════════════════════════
function LezioneModal({ lezione, argomenti, macroArgomenti, onClose, onSaved }) {
  const isEdit = !!lezione?.id;
  const [titolo, setTitolo] = useState(lezione?.titolo || "");
  const [materia, setMateria] = useState(lezione?.materia || "Matematica");
  const [anno, setAnno] = useState(lezione?.anno || "");
  const [argomentoId, setArgomentoId] = useState(lezione?.argomentoId ?? "");
  const [macroArgomentoId, setMacroArgomentoId] = useState(lezione?.macroArgomentoId ?? "");
  const [saving, setSaving] = useState(false);
  const [creatingPredefiniti, setCreatingPredefiniti] = useState(false);

  const filteredMacro = macroArgomenti.filter(m=>m.materia===materia);
  const filteredArg = argomenti.filter(a=>
    !macroArgomentoId || a.macroArgomentoId===Number(macroArgomentoId)
  );
  const predefiniti = MACRO_PREDEFINITI[materia] || [];
  const mancanti = predefiniti.filter(n=>!macroArgomenti.some(m=>m.materia===materia&&m.nome===n));

  async function creaPredefiniti() {
    setCreatingPredefiniti(true);
    for (const nome of mancanti) {
      await fetch("/api/macro-argomenti", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ nome, materia })
      });
    }
    onSaved();
    setCreatingPredefiniti(false);
  }

  async function handleSave() {
    if (!titolo.trim()) return;
    setSaving(true);
    const body = {
      titolo, materia, anno: anno||null,
      argomentoId: argomentoId ? Number(argomentoId) : null,
      macroArgomentoId: (!argomentoId && macroArgomentoId) ? Number(macroArgomentoId) : null,
    };
    const res = await fetch(isEdit ? `/api/lezioni/${lezione.id}` : "/api/lezioni", {
      method: isEdit?"PATCH":"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(body),
    });
    if (res.ok) { onSaved(); onClose(); }
    setSaving(false);
  }

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ background:C.card,borderRadius:12,padding:28,width:480,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto" }}>
        <h3 style={{ margin:"0 0 18px",color:C.text }}>{isEdit?"Modifica lezione":"Nuova lezione"}</h3>

        <label style={lbl}>Titolo *</label>
        <input value={titolo} onChange={e=>setTitolo(e.target.value)} style={inp} placeholder="es. La circonferenza"/>

        <label style={lbl}>Materia</label>
        <select value={materia} onChange={e=>{setMateria(e.target.value);setMacroArgomentoId("");setArgomentoId("");}} style={inp}>
          {MATERIE.map(m=><option key={m}>{m}</option>)}
        </select>

        <label style={lbl}>Anno scolastico</label>
        <select value={anno} onChange={e=>setAnno(e.target.value)} style={inp}>
          <option value="">— nessuno —</option>
          {ANNI.map(a=><option key={a} value={a}>{a} anno</option>)}
        </select>

        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:12,marginBottom:4 }}>
          <span style={{ fontSize:13,color:"#374151",fontWeight:500 }}>Macro-argomento</span>
          {mancanti.length>0 && (
            <button type="button" onClick={creaPredefiniti} disabled={creatingPredefiniti}
              style={{ fontSize:11,background:"#e0e7ff",color:C.primary,border:"none",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontWeight:600 }}>
              {creatingPredefiniti ? "Creo..." : `+ Crea predefiniti (${mancanti.length})`}
            </button>
          )}
        </div>
        <select value={macroArgomentoId} onChange={e=>{setMacroArgomentoId(e.target.value);setArgomentoId("");}} style={inp}>
          <option value="">— nessuno —</option>
          {filteredMacro.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>

        <label style={lbl}>Argomento <span style={{ fontWeight:400,color:C.sub }}>(opzionale)</span></label>
        <select value={argomentoId} onChange={e=>setArgomentoId(e.target.value)} style={inp}>
          <option value="">— nessuno —</option>
          {filteredArg.map(a=><option key={a.id} value={a.id}>{a.nome}{a.macroArgomento?` (${a.macroArgomento.nome})`:""}</option>)}
        </select>

        <div style={{ display:"flex",gap:8,marginTop:20,justifyContent:"flex-end" }}>
          <button onClick={onClose} style={btnSec}>Annulla</button>
          <button onClick={handleSave} disabled={saving||!titolo.trim()} style={btnPri}>{saving?"Salvo...":"Salva"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODALE MACRO-ARGOMENTO
// ═══════════════════════════════════════════════════════════════════════════════
function MacroModal({ macro, onClose, onSaved }) {
  const isEdit = !!macro?.id;
  const [nome, setNome] = useState(macro?.nome||"");
  const [materia, setMateria] = useState(macro?.materia||"Matematica");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!nome.trim()) return;
    setSaving(true);
    const res = await fetch(isEdit?`/api/macro-argomenti/${macro.id}`:"/api/macro-argomenti", {
      method: isEdit?"PATCH":"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ nome, materia }),
    });
    if (res.ok) { onSaved(); onClose(); }
    setSaving(false);
  }

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ background:C.card,borderRadius:12,padding:28,width:400,maxWidth:"95vw" }}>
        <h3 style={{ margin:"0 0 18px",color:C.text }}>{isEdit?"Modifica macro-argomento":"Nuovo macro-argomento"}</h3>
        <label style={lbl}>Nome *</label>
        <input value={nome} onChange={e=>setNome(e.target.value)} style={inp} placeholder="es. Algebra"/>
        <label style={lbl}>Materia</label>
        <select value={materia} onChange={e=>setMateria(e.target.value)} style={inp}>
          {MATERIE.map(m=><option key={m}>{m}</option>)}
        </select>
        <div style={{ display:"flex",gap:8,marginTop:20,justifyContent:"flex-end" }}>
          <button onClick={onClose} style={btnSec}>Annulla</button>
          <button onClick={handleSave} disabled={saving||!nome.trim()} style={btnPri}>{saving?"Salvo...":"Salva"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODALE ARGOMENTO (livello 2)
// ═══════════════════════════════════════════════════════════════════════════════
function ArgomentoModal({ argomento, macroArgomenti, onClose, onSaved }) {
  const isEdit = !!argomento?.id;
  const [nome, setNome] = useState(argomento?.nome||"");
  const [macroId, setMacroId] = useState(argomento?.macroArgomentoId??"");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!nome.trim()) return;
    setSaving(true);
    const res = await fetch(isEdit?`/api/argomenti/${argomento.id}`:"/api/argomenti", {
      method: isEdit?"PATCH":"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ nome, macroArgomentoId: macroId?Number(macroId):null }),
    });
    if (res.ok) { onSaved(); onClose(); }
    setSaving(false);
  }

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ background:C.card,borderRadius:12,padding:28,width:400,maxWidth:"95vw" }}>
        <h3 style={{ margin:"0 0 18px",color:C.text }}>{isEdit?"Modifica argomento":"Nuovo argomento"}</h3>
        <label style={lbl}>Nome *</label>
        <input value={nome} onChange={e=>setNome(e.target.value)} style={inp} placeholder="es. Luoghi geometrici"/>
        <label style={lbl}>Macro-argomento</label>
        <select value={macroId} onChange={e=>setMacroId(e.target.value)} style={inp}>
          <option value="">— nessuno —</option>
          {macroArgomenti.map(m=><option key={m.id} value={m.id}>{m.nome} ({m.materia})</option>)}
        </select>
        <div style={{ display:"flex",gap:8,marginTop:20,justifyContent:"flex-end" }}>
          <button onClick={onClose} style={btnSec}>Annulla</button>
          <button onClick={handleSave} disabled={saving||!nome.trim()} style={btnPri}>{saving?"Salvo...":"Salva"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODALE ASSEGNA LEZIONE
// ═══════════════════════════════════════════════════════════════════════════════
function AssegnaModal({ lezione, clienti, onClose, onSaved }) {
  const [selezionati, setSelezionati] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    fetch(`/api/lezioni/${lezione.id}/assegna`)
      .then(r=>r.json())
      .then(ids=>{ setSelezionati(ids.map(Number)); setLoading(false); });
  },[lezione.id]);

  function toggle(id) { setSelezionati(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]); }

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/lezioni/${lezione.id}/assegna`,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ clienteIds: selezionati })
    });
    onSaved(); onClose();
  }

  const studenti = clienti.filter(c=>c.tipo==="STUDENTE"||c.tipo==="studente");

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ background:C.card,borderRadius:12,padding:28,width:460,maxWidth:"95vw",maxHeight:"80vh",overflowY:"auto" }}>
        <h3 style={{ margin:"0 0 4px",color:C.text }}>Assegna lezione</h3>
        <p style={{ margin:"0 0 16px",color:C.sub,fontSize:13 }}>{lezione.titolo}</p>
        {loading ? <p>Carico...</p> : studenti.map(s=>(
          <label key={s.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer" }}>
            <input type="checkbox" checked={selezionati.includes(s.id)} onChange={()=>toggle(s.id)}/>
            <span style={{ fontSize:14,color:C.text }}>{s.nomeReferente}</span>
          </label>
        ))}
        <div style={{ display:"flex",gap:8,marginTop:20,justifyContent:"flex-end" }}>
          <button onClick={onClose} style={btnSec}>Annulla</button>
          <button onClick={handleSave} disabled={saving} style={btnPri}>{saving?"Salvo...":"Salva"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIGA LEZIONE
// ═══════════════════════════════════════════════════════════════════════════════
function LezioneRow({ l, isAdmin, onEdit, onAssegna, onDelete, organizza, onDragStart, onDragOver, onDragEnd, onDrop, isDragTarget }) {
  const sezioni = [l.mappaHtml&&"Mappa",l.teoriaHtml&&"Teoria",l.eserciziHtml&&"Esercizi",l.strumentiHtml&&"Strumenti"].filter(Boolean);
  return (
    <div
      draggable={!!organizza}
      onDragStart={organizza ? onDragStart : undefined}
      onDragOver={organizza ? onDragOver : undefined}
      onDragEnd={organizza ? onDragEnd : undefined}
      onDrop={organizza ? onDrop : undefined}
      style={{
        display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:7,
        background:isDragTarget?"#dde3ff":C.card,
        marginBottom:4,
        border:`1.5px solid ${isDragTarget?C.primary:C.border}`,
        cursor:organizza?"grab":"default",
        transition:"background .12s,border .12s",
      }}>
      {organizza && (
        <span style={{ color:"#9ca3af",fontSize:18,lineHeight:1,userSelect:"none",flexShrink:0,cursor:"grab" }}>⠿</span>
      )}
      <Link
        href={`/lezioni/${l.id}`}
        style={{ flex:1,textDecoration:"none",color:C.text,fontSize:14,fontWeight:500 }}
        onClick={organizza?(e=>e.preventDefault()):undefined}>
        {l.titolo}
        {l.anno && <span style={{ marginLeft:8,fontSize:11,background:C.light,color:C.primary,borderRadius:4,padding:"1px 6px" }}>{l.anno}</span>}
      </Link>
      {sezioni.map(s=><span key={s} style={{ fontSize:11,background:"#f0fdf4",color:C.green,borderRadius:4,padding:"1px 6px" }}>{s}</span>)}
      {isAdmin && !organizza && (
        <div style={{ display:"flex",gap:4 }}>
          <button onClick={onAssegna} style={btnXS} title="Assegna studenti">👥</button>
          <button onClick={onEdit} style={btnXS}>✏️</button>
          <button onClick={onDelete} style={{...btnXS,color:C.red}}>🗑</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGINA PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════
function LezioniPageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [macroArgomenti, setMacroArgomenti] = useState([]);
  const [argomenti, setArgomenti] = useState([]);
  const [lezioni, setLezioni] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalLezione, setModalLezione] = useState(null);
  const [modalMacro, setModalMacro] = useState(null);
  const [modalArgomento, setModalArgomento] = useState(null);
  const [modalAssegna, setModalAssegna] = useState(null);

  const [openMacro, setOpenMacro] = useState(new Set());
  const [openArg, setOpenArg] = useState(new Set());
  const [openMaterie, setOpenMaterie] = useState<Set<string>>(new Set());

  // ── Organizza (drag-and-drop) ─────────────────────────────────────────────
  const [organizza, setOrganizza] = useState(false);
  const [drag, setDrag] = useState<{ type:string; id:number; groupKey:string }|null>(null);
  const [dragOverKey, setDragOverKey] = useState<string|null>(null);

  const isAdmin = session?.user?.role==="admin"||session?.user?.role==="operatore";

  useEffect(()=>{
    if (status==="unauthenticated"){router.push("/login");return;}
    if (status!=="authenticated") return;
    loadAll();
  },[status]);

  useEffect(()=>{
    const macroNome = searchParams.get("macro");
    const argNome = searchParams.get("arg");
    const materiaParam = searchParams.get("materia");
    if (macroNome && macroArgomenti.length) {
      const m = macroArgomenti.find(m=>m.nome===macroNome);
      if (m) setOpenMacro(s=>new Set([...s,m.id]));
    }
    if (argNome && argomenti.length) {
      const a = argomenti.find(a=>a.nome===argNome);
      if (a) setOpenArg(s=>new Set([...s,a.id]));
    }
    if (materiaParam) {
      const trovata = MATERIE.find(m=>m.toLowerCase()===materiaParam.toLowerCase());
      if (trovata) setOpenMaterie(new Set([trovata]));
    }
  },[searchParams,macroArgomenti,argomenti]);

  async function loadAll() {
    setLoading(true);
    try {
      const [rMacro, rArg, rLezioni] = await Promise.all([
        fetch("/api/macro-argomenti").then(r=>r.json()),
        fetch("/api/argomenti").then(r=>r.json()),
        fetch("/api/lezioni").then(r=>r.json()),
      ]);
      setMacroArgomenti(Array.isArray(rMacro)?rMacro:[]);
      setArgomenti(Array.isArray(rArg)?rArg:[]);
      setLezioni(Array.isArray(rLezioni)?rLezioni:[]);
      if (isAdmin) {
        const rC = await fetch("/api/clienti").then(r=>r.json()).catch(()=>[]);
        setClienti(Array.isArray(rC)?rC:[]);
      }
    } catch(e) {
      console.error("loadAll error:", e);
    } finally {
      setLoading(false);
    }
  }

  function toggleMacro(id){setOpenMacro(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});}
  function toggleArg(id){setOpenArg(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});}
  function toggleMateria(nome:string){setOpenMaterie(s=>{const n=new Set(s);n.has(nome)?n.delete(nome):n.add(nome);return n;});}
  function focusMateria(nome:string){
    setOpenMaterie(new Set([nome]));
    router.push(`/lezioni?materia=${nome.toLowerCase()}`);
    setTimeout(()=>document.getElementById(`materia-${nome}`)?.scrollIntoView({behavior:"smooth",block:"start"}),50);
  }
  function mostraTutte(){setOpenMaterie(new Set(materieVisibili));router.push("/lezioni");}

  async function deleteMacro(id){
    if(!confirm("Eliminare questo macro-argomento?")) return;
    await fetch(`/api/macro-argomenti/${id}`,{method:"DELETE"});
    loadAll();
  }
  async function deleteArgomento(id){
    if(!confirm("Eliminare questo argomento?")) return;
    await fetch(`/api/argomenti/${id}`,{method:"DELETE"});
    loadAll();
  }
  async function deleteLezione(id){
    if(!confirm("Eliminare questa lezione?")) return;
    await fetch(`/api/lezioni/${id}`,{method:"DELETE"});
    loadAll();
  }
  async function promuoviArgomento(arg){
    if(!confirm(`Promuovere "${arg.nome}" a macro-argomento?`)) return;
    await fetch(`/api/argomenti/${arg.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({op:"promuovi"})});
    loadAll();
  }

  // ── Drag-and-drop helpers ─────────────────────────────────────────────────
  async function persistOrder(type: string, orderedIds: number[]) {
    const base = type==='macro' ? '/api/macro-argomenti' : type==='arg' ? '/api/argomenti' : '/api/lezioni';
    await Promise.all(
      orderedIds.map((id, ordine) =>
        fetch(`${base}/${id}`, {
          method:'PATCH',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({ ordine }),
        })
      )
    );
  }

  async function handleDrop(type: string, targetId: number, groupKey: string) {
    if (!drag || drag.type!==type || drag.groupKey!==groupKey || drag.id===targetId) {
      setDragOverKey(null);
      return;
    }

    let list: any[];
    if (type==='macro') {
      list = macroArgomenti
        .filter(m=>m.materia===groupKey)
        .sort((a,b)=>a.ordine-b.ordine||a.nome.localeCompare(b.nome));
    } else if (type==='arg') {
      list = argomenti
        .filter(a=>a.macroArgomentoId===Number(groupKey))
        .sort((a,b)=>a.ordine-b.ordine||a.nome.localeCompare(b.nome));
    } else {
      const [scope,scopeId] = groupKey.split(':');
      if (scope==='arg') {
        list = lezioni
          .filter(l=>l.argomentoId===Number(scopeId))
          .sort((a,b)=>(a.ordine||0)-(b.ordine||0)||a.titolo.localeCompare(b.titolo));
      } else {
        list = lezioni
          .filter(l=>l.macroArgomentoId===Number(scopeId)&&!l.argomentoId)
          .sort((a,b)=>(a.ordine||0)-(b.ordine||0));
      }
    }

    const srcIdx = list.findIndex(i=>i.id===drag.id);
    const tgtIdx = list.findIndex(i=>i.id===targetId);
    if (srcIdx===-1||tgtIdx===-1){ setDragOverKey(null); return; }

    const reordered = [...list];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(tgtIdx, 0, moved);

    const updates = Object.fromEntries(reordered.map((i,idx)=>[i.id,idx]));

    // optimistic update
    if (type==='macro') {
      setMacroArgomenti(prev=>prev.map(m=>updates[m.id]!=null?{...m,ordine:updates[m.id]}:m));
    } else if (type==='arg') {
      setArgomenti(prev=>prev.map(a=>updates[a.id]!=null?{...a,ordine:updates[a.id]}:a));
    } else {
      setLezioni(prev=>prev.map(l=>updates[l.id]!=null?{...l,ordine:updates[l.id]}:l));
    }

    setDrag(null);
    setDragOverKey(null);
    await persistOrder(type, reordered.map(i=>i.id));
  }

  function stopDrag() { setDrag(null); setDragOverKey(null); }

  const materieVisibili = [
    ...MATERIE_PINNED,
    ...MATERIE.filter(m=>!MATERIE_PINNED.includes(m)&&macroArgomenti.some(ma=>ma.materia===m)),
  ];
  const lezioniNonClass = lezioni.filter(l=>!l.argomentoId&&!l.macroArgomentoId);

  if (status==="loading"||loading) return <FullPageSpinner text="Carico le lezioni..." />;

  return (
    <div style={{ minHeight:"100vh",background:C.bg }}>
      <Navbar />
      <div style={{ padding:"28px 16px" }}>
      <div style={{ maxWidth:860,margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:24 }}>
          <div>
            <h1 style={{ margin:0,fontSize:24,color:C.text }}>Lezioni</h1>
            <p style={{ margin:"4px 0 0",color:C.sub,fontSize:13 }}>{lezioni.length} lezioni · {macroArgomenti.length} macro-argomenti</p>
          </div>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            <Link href="/lezioni/indice" style={{ ...btnSec,textDecoration:"none",display:"inline-flex",alignItems:"center" }}>
              📚 Indice
            </Link>
            {isAdmin && <>
              {!organizza && <>
                <button onClick={()=>setModalMacro({})} style={btnSec}>+ Macro-arg.</button>
                <button onClick={()=>setModalArgomento({})} style={btnSec}>+ Argomento</button>
                <button onClick={()=>setModalLezione({})} style={btnPri}>+ Nuova lezione</button>
              </>}
              <button
                onClick={()=>{setOrganizza(o=>!o);setDrag(null);setDragOverKey(null);}}
                style={{
                  ...btnSec,
                  background:organizza?"#e0e7ff":"#fff",
                  color:organizza?C.primary:"#374151",
                  fontWeight:organizza?700:400,
                  borderColor:organizza?C.primary:"#d1d5db",
                }}>
                {organizza ? "✓ Fatto" : "⠿ Organizza"}
              </button>
            </>}
          </div>
        </div>

        {organizza && (
          <div style={{ marginBottom:16,padding:"10px 16px",background:"#e0e7ff",borderRadius:9,fontSize:13,color:C.primary,fontWeight:500,border:`1px solid ${C.primary}33` }}>
            Modalità organizzazione attiva — trascina ⠿ per riordinare macro-argomenti, argomenti e lezioni. Clicca <strong>✓ Fatto</strong> per uscire.
          </div>
        )}

        {/* Card materie principali */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12,marginBottom:openMaterie.size<materieVisibili.length?12:28 }}>
          {MATERIE_PINNED.map(materia=>{
            const cfg = MATERIE_CONFIG[materia];
            const nMacro = macroArgomenti.filter(m=>m.materia===materia).length;
            const macroIds = new Set(macroArgomenti.filter(m=>m.materia===materia).map(m=>m.id));
            const argIds = new Set(argomenti.filter(a=>macroIds.has(a.macroArgomentoId)).map(a=>a.id));
            const nLez = lezioni.filter(l=>macroIds.has(l.macroArgomentoId)||argIds.has(l.argomentoId)).length;
            const isFocused = openMaterie.size===1 && openMaterie.has(materia);
            return (
              <div key={materia}
                style={{ background:isFocused?cfg.bg:"#fff",border:`2px solid ${isFocused?cfg.colore:cfg.colore+"33"}`,borderRadius:14,padding:"18px 16px",cursor:"pointer",transition:"all .15s" }}
                onClick={()=>isFocused?mostraTutte():focusMateria(materia)}>
                <div style={{ fontSize:28,marginBottom:8 }}>{cfg.icona}</div>
                <div style={{ fontWeight:800,fontSize:16,color:cfg.colore,marginBottom:4 }}>{materia}</div>
                <div style={{ fontSize:12,color:"#6b7280" }}>
                  {nMacro ? `${nMacro} argomenti · ${nLez} lezioni` : "Nessun contenuto ancora"}
                </div>
                {isFocused && <div style={{ fontSize:11,color:cfg.colore,marginTop:6,fontWeight:700 }}>↩ Mostra tutte</div>}
              </div>
            );
          })}
        </div>
        {openMaterie.size<materieVisibili.length && openMaterie.size>0 && (
          <div style={{ textAlign:"right",marginBottom:20 }}>
            <button onClick={mostraTutte} style={{ ...btnSec,fontSize:12,padding:"5px 14px" }}>↩ Mostra tutte le materie</button>
          </div>
        )}

        {/* Gerarchia per materia */}
        {materieVisibili.map(materia=>{
          const cfg = MATERIE_CONFIG[materia];
          const borderColor = cfg ? cfg.colore : C.primary;
          const macroList = macroArgomenti.filter(m=>m.materia===materia).sort((a,b)=>a.ordine-b.ordine||a.nome.localeCompare(b.nome));
          const isMateriaOpen = openMaterie.has(materia);
          return (
            <div key={materia} id={`materia-${materia}`} style={{ marginBottom:isMateriaOpen?28:8 }}>
              <div
                onClick={()=>toggleMateria(materia)}
                style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"8px 12px 8px 12px",borderRadius:10,borderLeft:`4px solid ${borderColor}`,background:isMateriaOpen?`${borderColor}08`:"#fff",border:`1px solid ${borderColor}22`,marginBottom:isMateriaOpen?10:0,userSelect:"none" }}>
                <span style={{ fontSize:15,color:borderColor,width:18,textAlign:"center",flexShrink:0 }}>{isMateriaOpen?"▾":"▸"}</span>
                {cfg && <span style={{ fontSize:18 }}>{cfg.icona}</span>}
                <span style={{ fontWeight:700,fontSize:17,color:borderColor,flex:1 }}>{materia}</span>
                <span style={{ fontSize:12,color:"#9ca3af" }}>{macroList.length} argomenti</span>
              </div>
              {isMateriaOpen && macroList.length===0 && (
                <div style={{ padding:"20px 16px",background:"#f9fafb",border:`1px dashed ${borderColor}44`,borderRadius:10,textAlign:"center",color:"#9ca3af",fontSize:13 }}>
                  Nessun macro-argomento ancora
                  {isAdmin && (
                    <button onClick={()=>setModalMacro({materia})}
                      style={{ display:"block",margin:"10px auto 0",background:borderColor,color:"#fff",border:"none",borderRadius:7,padding:"6px 16px",fontSize:13,fontWeight:700,cursor:"pointer" }}>
                      + Crea primo macro-argomento
                    </button>
                  )}
                </div>
              )}
              {isMateriaOpen && macroList.map(macro=>{
                const isOpen = openMacro.has(macro.id);
                const argFigli = argomenti.filter(a=>a.macroArgomentoId===macro.id).sort((a,b)=>a.ordine-b.ordine||a.nome.localeCompare(b.nome));
                const lezDirette = lezioni.filter(l=>l.macroArgomentoId===macro.id&&!l.argomentoId).sort((a,b)=>(a.ordine||0)-(b.ordine||0));
                const totLezioni = lezDirette.length+argFigli.reduce((s,a)=>s+lezioni.filter(l=>l.argomentoId===a.id).length,0);
                const isDMacro = dragOverKey===`macro:${macro.id}` && drag?.groupKey===materia;
                return (
                  <div key={macro.id}
                    draggable={organizza}
                    onDragStart={organizza ? ()=>setDrag({type:'macro',id:macro.id,groupKey:materia}) : undefined}
                    onDragOver={organizza ? (e=>{if(drag?.type!=='macro')return;e.preventDefault();e.stopPropagation();setDragOverKey(`macro:${macro.id}`);}) : undefined}
                    onDrop={organizza ? (e=>{e.stopPropagation();handleDrop('macro',macro.id,materia);}) : undefined}
                    onDragEnd={stopDrag}
                    style={{
                      marginBottom:8,
                      border:`1.5px solid ${isDMacro?C.primary:C.border}`,
                      borderRadius:10,overflow:"hidden",
                      background:isDMacro?"#dde3ff":undefined,
                      transition:"background .12s,border .12s",
                    }}>
                    <div
                      style={{ display:"flex",alignItems:"center",gap:8,padding:"12px 16px",background:isDMacro?"#dde3ff":C.macroRow,cursor:organizza?"grab":"pointer" }}
                      onClick={()=>toggleMacro(macro.id)}>
                      {organizza && <span style={{ color:"#9ca3af",fontSize:18,lineHeight:1,userSelect:"none",cursor:"grab",flexShrink:0 }}>⠿</span>}
                      <span style={{ fontSize:15,color:C.primary }}>{isOpen?"▼":"▶"}</span>
                      <span style={{ fontWeight:600,color:C.text,flex:1 }}>{macro.nome}</span>
                      <span style={{ fontSize:12,color:C.sub }}>{argFigli.length} arg · {totLezioni} lez</span>
                      {isAdmin && !organizza && (
                        <div style={{ display:"flex",gap:4 }} onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>setModalMacro(macro)} style={btnXS}>✏️</button>
                          <button onClick={()=>deleteMacro(macro.id)} style={{...btnXS,color:C.red}}>🗑</button>
                        </div>
                      )}
                    </div>

                    {isOpen && (
                      <div style={{ padding:"8px 12px 12px" }}>
                        {argFigli.map(arg=>{
                          const isArgOpen = openArg.has(arg.id);
                          const lezArg = lezioni.filter(l=>l.argomentoId===arg.id).sort((a,b)=>(a.ordine||0)-(b.ordine||0)||a.titolo.localeCompare(b.titolo));
                          const isDArg = dragOverKey===`arg:${arg.id}` && drag?.groupKey===String(macro.id);
                          return (
                            <div key={arg.id}
                              draggable={organizza}
                              onDragStart={organizza ? ()=>setDrag({type:'arg',id:arg.id,groupKey:String(macro.id)}) : undefined}
                              onDragOver={organizza ? (e=>{if(drag?.type!=='arg')return;e.preventDefault();e.stopPropagation();setDragOverKey(`arg:${arg.id}`);}) : undefined}
                              onDrop={organizza ? (e=>{e.stopPropagation();handleDrop('arg',arg.id,String(macro.id));}) : undefined}
                              onDragEnd={stopDrag}
                              style={{
                                marginBottom:6,
                                border:`1.5px solid ${isDArg?C.primary:C.border}`,
                                borderRadius:8,overflow:"hidden",
                                background:isDArg?"#dde3ff":undefined,
                                transition:"background .12s,border .12s",
                              }}>
                              <div
                                style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:isDArg?"#dde3ff":C.argRow,cursor:organizza?"grab":"pointer" }}
                                onClick={()=>toggleArg(arg.id)}>
                                {organizza && <span style={{ color:"#9ca3af",fontSize:16,lineHeight:1,userSelect:"none",cursor:"grab",flexShrink:0 }}>⠿</span>}
                                <span style={{ fontSize:12,color:C.sub }}>{isArgOpen?"▼":"▶"}</span>
                                <span style={{ fontWeight:500,color:C.text,flex:1,fontSize:14 }}>{arg.nome}</span>
                                <span style={{ fontSize:11,color:C.sub }}>{lezArg.length} lezioni</span>
                                {isAdmin && !organizza && (
                                  <div style={{ display:"flex",gap:4 }} onClick={e=>e.stopPropagation()}>
                                    <button title="Promuovi a macro-argomento" onClick={()=>promuoviArgomento(arg)} style={btnXS}>⬆️</button>
                                    <button onClick={()=>setModalArgomento(arg)} style={btnXS}>✏️</button>
                                    <button onClick={()=>deleteArgomento(arg.id)} style={{...btnXS,color:C.red}}>🗑</button>
                                  </div>
                                )}
                              </div>
                              {isArgOpen && (
                                <div style={{ padding:"6px 14px 10px" }}>
                                  {lezArg.length===0
                                    ? <p style={{ color:C.sub,fontSize:13,margin:"6px 0" }}>Nessuna lezione</p>
                                    : lezArg.map(l=>(
                                      <LezioneRow key={l.id} l={l} isAdmin={isAdmin}
                                        onEdit={()=>setModalLezione(l)}
                                        onAssegna={()=>setModalAssegna(l)}
                                        onDelete={()=>deleteLezione(l.id)}
                                        organizza={organizza}
                                        onDragStart={()=>setDrag({type:'lezione',id:l.id,groupKey:`arg:${arg.id}`})}
                                        onDragOver={drag?.type==='lezione'?(e=>{e.preventDefault();e.stopPropagation();setDragOverKey(`lezione:${l.id}`);}):(e=>{})}
                                        onDragEnd={stopDrag}
                                        onDrop={(e)=>{e.stopPropagation();handleDrop('lezione',l.id,`arg:${arg.id}`);}}
                                        isDragTarget={dragOverKey===`lezione:${l.id}`&&drag?.groupKey===`arg:${arg.id}`}/>
                                    ))
                                  }
                                  {isAdmin && !organizza && (
                                    <button onClick={()=>setModalLezione({argomentoId:arg.id,macroArgomentoId:macro.id,materia})}
                                      style={{marginTop:6,...btnXS,color:C.primary}}>+ lezione</button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {lezDirette.map(l=>(
                          <LezioneRow key={l.id} l={l} isAdmin={isAdmin}
                            onEdit={()=>setModalLezione(l)}
                            onAssegna={()=>setModalAssegna(l)}
                            onDelete={()=>deleteLezione(l.id)}
                            organizza={organizza}
                            onDragStart={()=>setDrag({type:'lezione',id:l.id,groupKey:`macro:${macro.id}`})}
                            onDragOver={drag?.type==='lezione'?(e=>{e.preventDefault();e.stopPropagation();setDragOverKey(`lezione:${l.id}`);}):(e=>{})}
                            onDragEnd={stopDrag}
                            onDrop={(e)=>{e.stopPropagation();handleDrop('lezione',l.id,`macro:${macro.id}`);}}
                            isDragTarget={dragOverKey===`lezione:${l.id}`&&drag?.groupKey===`macro:${macro.id}`}/>
                        ))}

                        {isAdmin && !organizza && (
                          <div style={{ display:"flex",gap:8,marginTop:8 }}>
                            <button onClick={()=>setModalArgomento({macroArgomentoId:macro.id})} style={{...btnXS,color:C.primary}}>+ argomento</button>
                            <button onClick={()=>setModalLezione({macroArgomentoId:macro.id,materia})} style={{...btnXS,color:C.primary}}>+ lezione diretta</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Lezioni non classificate */}
        {lezioniNonClass.length>0 && (
          <div style={{ marginBottom:24 }}>
            {isAdmin
              ? <h2 style={{ fontSize:16,color:C.yellow,fontWeight:700,margin:"0 0 10px" }}>⚠️ Lezioni non classificate</h2>
              : <h2 style={{ fontSize:16,color:C.primary,fontWeight:700,margin:"0 0 10px" }}>Le tue lezioni</h2>
            }
            {lezioniNonClass.map(l=>(
              <LezioneRow key={l.id} l={l} isAdmin={isAdmin}
                onEdit={()=>setModalLezione(l)}
                onAssegna={()=>setModalAssegna(l)}
                onDelete={()=>deleteLezione(l.id)}/>
            ))}
          </div>
        )}

        {macroArgomenti.length===0 && lezioni.length===0 && (
          <div style={{ textAlign:"center",padding:60,color:C.sub }}>
            <p style={{ fontSize:18,margin:"0 0 8px" }}>Nessun contenuto ancora</p>
            {isAdmin && <p style={{ fontSize:14 }}>Inizia creando un macro-argomento</p>}
          </div>
        )}
      </div>

      {modalLezione!==null && (
        <LezioneModal lezione={modalLezione} argomenti={argomenti} macroArgomenti={macroArgomenti}
          onClose={()=>setModalLezione(null)} onSaved={loadAll}/>
      )}
      {modalMacro!==null && (
        <MacroModal macro={modalMacro} onClose={()=>setModalMacro(null)} onSaved={loadAll}/>
      )}
      {modalArgomento!==null && (
        <ArgomentoModal argomento={modalArgomento} macroArgomenti={macroArgomenti}
          onClose={()=>setModalArgomento(null)} onSaved={loadAll}/>
      )}
      {modalAssegna!==null && (
        <AssegnaModal lezione={modalAssegna} clienti={clienti}
          onClose={()=>setModalAssegna(null)} onSaved={loadAll}/>
      )}
      </div>
    </div>
  );
}

// Stili
const lbl = { display:"block",fontSize:13,color:"#374151",marginBottom:4,marginTop:12 };
const inp = { width:"100%",padding:"8px 10px",borderRadius:7,border:"1px solid #d1d5db",fontSize:14,boxSizing:"border-box" };
const btnPri = { background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontSize:14,fontWeight:600 };
const btnSec = { background:"#fff",color:"#374151",border:"1px solid #d1d5db",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:14 };
const btnXS  = { background:"transparent",border:"none",cursor:"pointer",fontSize:15,padding:"2px 4px",borderRadius:4 };

export default function LezioniPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <LezioniPageInner />
    </Suspense>
  );
}
