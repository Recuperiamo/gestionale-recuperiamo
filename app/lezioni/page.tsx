// @ts-nocheck
"use client";
import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// ── Materie con ordine fisso ──────────────────────────────────────────────────
const MATERIE = [
  "Matematica","Fisica","Chimica","Biologia","Informatica",
  "Italiano","Latino","Storia","Filosofia","Inglese","Scienze","Generale"
];

// ── Anni ─────────────────────────────────────────────────────────────────────
const ANNI = ["I","II","III","IV","V"];

// ── Colori ───────────────────────────────────────────────────────────────────
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

  const filteredMacro = macroArgomenti.filter(m=>m.materia===materia);
  const filteredArg = argomenti.filter(a=>
    !macroArgomentoId || a.macroArgomentoId===Number(macroArgomentoId)
  );

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

        <label style={lbl}>Macro-argomento</label>
        <select value={macroArgomentoId} onChange={e=>{setMacroArgomentoId(e.target.value);setArgomentoId("");}} style={inp}>
          <option value="">— nessuno —</option>
          {filteredMacro.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>

        <label style={lbl}>Argomento (livello 2)</label>
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
function LezioneRow({ l, isAdmin, onEdit, onAssegna, onDelete }) {
  const sezioni = [l.mappaHtml&&"Mappa",l.teoriaHtml&&"Teoria",l.eserciziHtml&&"Esercizi"].filter(Boolean);
  return (
    <div style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:7,background:C.card,marginBottom:4,border:`1px solid ${C.border}` }}>
      <Link href={`/lezioni/${l.id}`} style={{ flex:1,textDecoration:"none",color:C.text,fontSize:14,fontWeight:500 }}>
        {l.titolo}
        {l.anno && <span style={{ marginLeft:8,fontSize:11,background:C.light,color:C.primary,borderRadius:4,padding:"1px 6px" }}>{l.anno}</span>}
      </Link>
      {sezioni.map(s=><span key={s} style={{ fontSize:11,background:"#f0fdf4",color:C.green,borderRadius:4,padding:"1px 6px" }}>{s}</span>)}
      {isAdmin && (
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

  const isAdmin = session?.user?.role==="admin"||session?.user?.role==="operatore";

  useEffect(()=>{
    if (status==="unauthenticated"){router.push("/login");return;}
    if (status!=="authenticated") return;
    loadAll();
  },[status]);

  useEffect(()=>{
    const macroNome = searchParams.get("macro");
    const argNome = searchParams.get("arg");
    if (macroNome && macroArgomenti.length) {
      const m = macroArgomenti.find(m=>m.nome===macroNome);
      if (m) setOpenMacro(s=>new Set([...s,m.id]));
    }
    if (argNome && argomenti.length) {
      const a = argomenti.find(a=>a.nome===argNome);
      if (a) setOpenArg(s=>new Set([...s,a.id]));
    }
  },[searchParams,macroArgomenti,argomenti]);

  async function loadAll() {
    setLoading(true);
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
    setLoading(false);
  }

  function toggleMacro(id){setOpenMacro(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});}
  function toggleArg(id){setOpenArg(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});}

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

  const materieConMacro = MATERIE.filter(m=>macroArgomenti.some(ma=>ma.materia===m));
  const lezioniNonClass = lezioni.filter(l=>!l.argomentoId&&!l.macroArgomentoId);

  if (status==="loading"||loading) return <div style={{padding:40,color:C.sub}}>Carico...</div>;

  return (
    <div style={{ minHeight:"100vh",background:C.bg,padding:"28px 16px" }}>
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
              <button onClick={()=>setModalMacro({})} style={btnSec}>+ Macro-arg.</button>
              <button onClick={()=>setModalArgomento({})} style={btnSec}>+ Argomento</button>
              <button onClick={()=>setModalLezione({})} style={btnPri}>+ Nuova lezione</button>
            </>}
          </div>
        </div>

        {/* Gerarchia per materia */}
        {materieConMacro.map(materia=>{
          const macroList = macroArgomenti.filter(m=>m.materia===materia).sort((a,b)=>a.ordine-b.ordine||a.nome.localeCompare(b.nome));
          return (
            <div key={materia} style={{ marginBottom:28 }}>
              <h2 style={{ fontSize:17,color:C.primary,fontWeight:700,margin:"0 0 10px",padding:"6px 0",borderBottom:`2px solid ${C.light}` }}>{materia}</h2>
              {macroList.map(macro=>{
                const isOpen=openMacro.has(macro.id);
                const argFigli=argomenti.filter(a=>a.macroArgomentoId===macro.id).sort((a,b)=>a.ordine-b.ordine||a.nome.localeCompare(b.nome));
                const lezDirette=lezioni.filter(l=>l.macroArgomentoId===macro.id&&!l.argomentoId);
                const totLezioni=lezDirette.length+argFigli.reduce((s,a)=>s+lezioni.filter(l=>l.argomentoId===a.id).length,0);
                return (
                  <div key={macro.id} style={{ marginBottom:8,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,padding:"12px 16px",background:C.macroRow,cursor:"pointer" }}
                      onClick={()=>toggleMacro(macro.id)}>
                      <span style={{ fontSize:15,color:C.primary }}>{isOpen?"▼":"▶"}</span>
                      <span style={{ fontWeight:600,color:C.text,flex:1 }}>{macro.nome}</span>
                      <span style={{ fontSize:12,color:C.sub }}>{argFigli.length} arg · {totLezioni} lez</span>
                      {isAdmin && (
                        <div style={{ display:"flex",gap:4 }} onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>setModalMacro(macro)} style={btnXS}>✏️</button>
                          <button onClick={()=>deleteMacro(macro.id)} style={{...btnXS,color:C.red}}>🗑</button>
                        </div>
                      )}
                    </div>

                    {isOpen && (
                      <div style={{ padding:"8px 12px 12px" }}>
                        {argFigli.map(arg=>{
                          const isArgOpen=openArg.has(arg.id);
                          const lezArg=lezioni.filter(l=>l.argomentoId===arg.id).sort((a,b)=>a.titolo.localeCompare(b.titolo));
                          return (
                            <div key={arg.id} style={{ marginBottom:6,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden" }}>
                              <div style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:C.argRow,cursor:"pointer" }}
                                onClick={()=>toggleArg(arg.id)}>
                                <span style={{ fontSize:12,color:C.sub }}>{isArgOpen?"▼":"▶"}</span>
                                <span style={{ fontWeight:500,color:C.text,flex:1,fontSize:14 }}>{arg.nome}</span>
                                <span style={{ fontSize:11,color:C.sub }}>{lezArg.length} lezioni</span>
                                {isAdmin && (
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
                                        onDelete={()=>deleteLezione(l.id)}/>
                                    ))
                                  }
                                  {isAdmin && (
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
                            onDelete={()=>deleteLezione(l.id)}/>
                        ))}

                        {isAdmin && (
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

        {/* Lezioni non classificate — admin vede warning, studente vede semplicemente le sue lezioni */}
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
    <Suspense fallback={<div style={{ padding:40 }}>Carico...</div>}>
      <LezioniPageInner />
    </Suspense>
  );
}
