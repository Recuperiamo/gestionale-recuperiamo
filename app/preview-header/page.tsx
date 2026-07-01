// @ts-nocheck
"use client";
import Navbar from "../components/Navbar";

// Dati fittizi per il preview
const STATS = [
  { label: "Totali", val: 124, bg: "#eff6ff", color: "#1d4ed8" },
  { label: "Saldati", val: 98, bg: "#d1fae5", color: "#065f46" },
  { label: "Non saldati", val: 22, bg: "#fee2e2", color: "#991b1b" },
  { label: "In scadenza", val: 8, bg: "#fef3c7", color: "#92400e" },
];

const FILTRI = ["Tutti", "✓ Saldati", "✗ Non saldati", "⚠ Esauriti", "⏰ In scadenza"];

function FiltriBar() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      {FILTRI.map((f, i) => (
        <button key={f} style={{
          padding: "6px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
          background: i === 0 ? "#20489a" : "#f1f5f9", color: i === 0 ? "#fff" : "#475569",
        }}>{f}</button>
      ))}
    </div>
  );
}

function SearchSort() {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 15 }}>🔍</span>
        <input placeholder="Cerca per nome o cliente..." style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 36px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", background: "#f8fafc", outline: "none" }} />
      </div>
      <select style={{ border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 14, fontFamily: "inherit", background: "#f8fafc", color: "#374151", minWidth: 150 }}>
        <option>Nome A → Z</option>
        <option>Nome Z → A</option>
        <option>Data recente</option>
      </select>
    </div>
  );
}

// ── VARIANTE A ─────────────────────────────────────────────────────────────────
function VariantA() {
  return (
    <div>
      {/* Fascia colorata */}
      <div style={{ background: "linear-gradient(135deg, #20489a 0%, #1d3c82 100%)", borderRadius: "16px 16px 0 0", padding: "clamp(18px,2.5vw,28px) clamp(20px,3vw,36px)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ width: 46, height: 46, background: "rgba(255,255,255,0.18)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📦</div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, color: "#fff", fontSize: "clamp(18px,2vw,26px)", fontWeight: 800, lineHeight: 1.2 }}>Gestione Pacchetti</h1>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.7)", fontSize: 13 }}>124 pacchetti · 8 in scadenza · 4 esauriti</p>
        </div>
        <button style={{ background: "#1cb0f6", color: "#fff", border: "none", borderRadius: 10, padding: "10px 22px", fontWeight: 700, fontSize: 14, cursor: "pointer", flexShrink: 0 }}>+ Nuovo</button>
      </div>

      {/* Card filtri + ricerca */}
      <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 16px 16px", padding: "clamp(14px,2vw,24px) clamp(20px,3vw,36px)", display: "flex", flexDirection: "column", gap: 14 }}>
        <SearchSort />
        <FiltriBar />
      </div>
    </div>
  );
}

// ── VARIANTE B ─────────────────────────────────────────────────────────────────
function VariantB() {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 12px rgba(32,72,154,0.06)" }}>
      {/* Header con stat chips */}
      <div style={{ padding: "clamp(18px,2.5vw,28px) clamp(20px,3vw,36px)", borderLeft: "5px solid #20489a", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <h1 style={{ margin: 0, color: "#20489a", fontSize: "clamp(18px,2vw,26px)", fontWeight: 800 }}>Gestione Pacchetti</h1>
          <button style={{ background: "#20489a", color: "#fff", border: "none", borderRadius: 10, padding: "10px 22px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>+ Nuovo</button>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {STATS.map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "8px 16px", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 70 }}>
              <span style={{ fontSize: "clamp(18px,1.8vw,24px)", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</span>
              <span style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Divisore */}
      <div style={{ height: 1, background: "#f1f5f9" }} />

      {/* Filtri */}
      <div style={{ padding: "clamp(14px,2vw,22px) clamp(20px,3vw,36px)", display: "flex", flexDirection: "column", gap: 12 }}>
        <SearchSort />
        <FiltriBar />
      </div>
    </div>
  );
}

// ── VARIANTE C ─────────────────────────────────────────────────────────────────
function VariantC() {
  return (
    <div>
      {/* Titolo sul background */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, color: "#1e1b4b", fontSize: "clamp(20px,2.2vw,30px)", fontWeight: 900, letterSpacing: "-0.5px" }}>Gestione Pacchetti</h1>
          <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 14 }}>124 pacchetti totali</p>
        </div>
        <button style={{ background: "#20489a", color: "#fff", border: "none", borderRadius: 10, padding: "10px 22px", fontWeight: 700, fontSize: 14, cursor: "pointer", flexShrink: 0 }}>+ Nuovo</button>
      </div>

      {/* Card filtri pulita */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #e2e8f0", boxShadow: "0 1px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        <div style={{ padding: "clamp(14px,2vw,22px) clamp(20px,3vw,36px)", display: "flex", flexDirection: "column", gap: 12 }}>
          <SearchSort />
          <FiltriBar />
        </div>
      </div>
    </div>
  );
}

// ── Pagina ─────────────────────────────────────────────────────────────────────
export default function PreviewHeaderPage() {
  const pageStyle = { minHeight: "100vh", background: "#f0f4ff" };
  const wrap = { maxWidth: "min(900px, 92vw)", margin: "0 auto", padding: "clamp(20px,3vw,40px) clamp(12px,3vw,32px)" };
  const label = (letter: string, title: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#20489a", color: "#fff", fontWeight: 900, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{letter}</div>
      <span style={{ fontWeight: 700, fontSize: 17, color: "#20489a" }}>{title}</span>
    </div>
  );
  const sep = { height: 2, background: "#e2e8f0", margin: "clamp(28px,4vw,48px) 0" };

  return (
    <div style={pageStyle}>
      <Navbar />
      <div style={wrap}>
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(14px,1.5vw,18px)", color: "#64748b", fontWeight: 500 }}>Confronto stili intestazione — scegli il tuo preferito</h2>
        </div>

        {label("A", "Header a fascia colorata")}
        <VariantA />

        <div style={sep} />

        {label("B", "Card unica con bordo e statistiche")}
        <VariantB />

        <div style={sep} />

        {label("C", "Titolo libero + card filtri pulita")}
        <VariantC />

        <div style={{ marginTop: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          Questa pagina è temporanea — comunica la variante preferita e verrà applicata a tutto il sito.
        </div>
      </div>
    </div>
  );
}
