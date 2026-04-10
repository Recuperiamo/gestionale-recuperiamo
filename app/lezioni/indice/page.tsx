// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";

const C = {
  bg:"#f0f4ff", card:"#fff", primary:"#4f46e5", light:"#e0e7ff",
  text:"#1e1b4b", sub:"#6b7280", border:"#e5e7eb",
};

function LezioneList({ lezioni }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
      {lezioni.map(l=>(
        <Link key={l.id} href={`/lezioni/${l.id}`} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:7,background:C.card,border:`1px solid ${C.border}`,textDecoration:"none",color:C.text,fontSize:14,fontWeight:500 }}>
          <span style={{ flex:1 }}>{l.titolo}</span>
          {l.anno && <span style={{ fontSize:11,background:C.light,color:C.primary,borderRadius:4,padding:"1px 6px" }}>{l.anno}</span>}
          {l.materia && <span style={{ fontSize:11,color:C.sub }}>{l.materia}</span>}
        </Link>
      ))}
    </div>
  );
}

export default function IndiceLezioniPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [macroArgomenti, setMacroArgomenti] = useState([]);
  const [argomenti, setArgomenti] = useState([]);
  const [lezioni, setLezioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const isAdmin = session?.user?.role==="admin"||session?.user?.role==="operatore";

  useEffect(()=>{
    if (status==="unauthenticated"){router.push("/login");return;}
    if (status!=="authenticated") return;
    Promise.all([
      fetch("/api/macro-argomenti").then(r=>r.json()),
      fetch("/api/argomenti").then(r=>r.json()),
      fetch("/api/lezioni").then(r=>r.json()),
    ]).then(([rMacro,rArg,rLez])=>{
      setMacroArgomenti(Array.isArray(rMacro)?rMacro:[]);
      setArgomenti(Array.isArray(rArg)?rArg:[]);
      setLezioni(Array.isArray(rLez)?rLez:[]);
      setLoading(false);
    });
  },[status]);

  if (status==="loading"||loading) return <div style={{padding:40,color:C.sub}}>Carico...</div>;

  const q = search.trim().toLowerCase();
  const lezFiltrate = q ? lezioni.filter(l=>l.titolo.toLowerCase().includes(q)) : lezioni;

  const macroConLezioni = macroArgomenti.filter(macro=>{
    const argIds = argomenti.filter(a=>a.macroArgomentoId===macro.id).map(a=>a.id);
    return lezFiltrate.some(l=>l.macroArgomentoId===macro.id||argIds.includes(l.argomentoId));
  });

  const lezioniNonClass = lezFiltrate.filter(l=>!l.argomentoId&&!l.macroArgomentoId);

  return (
    <div style={{ minHeight:"100vh",background:C.bg }}>
      <Navbar />
      <div style={{ padding:"28px 16px" }}>
      <div style={{ maxWidth:860,margin:"0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
            <Link href="/lezioni" style={{ color:C.primary,fontWeight:600,textDecoration:"none",fontSize:14 }}>← Lezioni</Link>
            <span style={{ color:C.border }}>/</span>
            <span style={{ color:C.text,fontSize:14 }}>Indice disciplinare</span>
          </div>
          <h1 style={{ margin:0,fontSize:24,color:C.text }}>Indice disciplinare</h1>
          <p style={{ margin:"4px 0 0",color:C.sub,fontSize:13 }}>
            {lezioni.length} lezioni · {macroArgomenti.length} macro-argomenti
          </p>
        </div>

        {/* Ricerca */}
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Cerca lezione..."
          style={{ width:"100%",maxWidth:400,padding:"9px 14px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:14,boxSizing:"border-box",background:C.card,marginBottom:24,display:"block" }}
        />

        {/* Indice per macro-argomento */}
        {macroConLezioni.map(macro=>{
          const argFigli = argomenti.filter(a=>a.macroArgomentoId===macro.id).sort((a,b)=>a.ordine-b.ordine||a.nome.localeCompare(b.nome));
          const lezDirette = lezFiltrate.filter(l=>l.macroArgomentoId===macro.id&&!l.argomentoId);
          const argConLezioni = argFigli.filter(a=>lezFiltrate.some(l=>l.argomentoId===a.id));

          if (lezDirette.length===0&&argConLezioni.length===0) return null;

          return (
            <div key={macro.id} style={{ marginBottom:28 }}>
              <div style={{ display:"flex",alignItems:"baseline",gap:12,marginBottom:10,paddingBottom:6,borderBottom:`2px solid ${C.light}` }}>
                <h2 style={{ margin:0,fontSize:18,color:C.primary,fontWeight:800 }}>{macro.nome}</h2>
                <span style={{ fontSize:12,color:C.sub }}>{macro.materia}</span>
                <Link href={"/lezioni?macro="+encodeURIComponent(macro.nome)} style={{ marginLeft:"auto",fontSize:12,color:C.primary,textDecoration:"none",fontWeight:600 }}>
                  Apri struttura →
                </Link>
              </div>

              {lezDirette.length>0 && <div style={{ marginBottom:10 }}><LezioneList lezioni={lezDirette}/></div>}

              {argConLezioni.map(arg=>{
                const lezArg = lezFiltrate.filter(l=>l.argomentoId===arg.id).sort((a,b)=>a.titolo.localeCompare(b.titolo));
                return (
                  <div key={arg.id} style={{ marginBottom:10,paddingLeft:16,borderLeft:`3px solid ${C.light}` }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:5 }}>
                      <span style={{ fontWeight:600,color:C.text,fontSize:14 }}>{arg.nome}</span>
                      <span style={{ fontSize:11,color:C.sub }}>{lezArg.length} lezioni</span>
                    </div>
                    <LezioneList lezioni={lezArg}/>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Non classificate (solo admin) */}
        {isAdmin && lezioniNonClass.length>0 && (
          <div style={{ marginBottom:24 }}>
            <h2 style={{ fontSize:16,color:"#ca8a04",fontWeight:700,margin:"0 0 10px" }}>Non classificate</h2>
            <LezioneList lezioni={lezioniNonClass}/>
          </div>
        )}

        {macroConLezioni.length===0&&lezioniNonClass.length===0 && (
          <div style={{ textAlign:"center",padding:60,color:C.sub }}>
            {q ? `Nessuna lezione corrisponde a "${search}"` : "Nessun contenuto ancora"}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
