// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { FullPageSpinner } from "../../components/Spinner";

const REGIMI = [
  { cod: "RF19", label: "RF19 — Regime Forfettario (ex L. 190/2014)" },
  { cod: "RF01", label: "RF01 — Ordinario" },
  { cod: "RF02", label: "RF02 — Contribuenti minimi" },
  { cod: "RF04", label: "RF04 — Agricoltura" },
  { cod: "RF17", label: "RF17 — Vendita immobili" },
  { cod: "RF18", label: "RF18 — Altro" },
];

const C = {
  bg: "#f0f4ff", card: "#fff", primary: "#20489a", text: "#1e293b", sub: "#6b7280", border: "#e5e7eb",
  green: "#15803d", red: "#b91c1c",
};

export default function ConfigFiskalePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadErr, setLoadErr] = useState("");

  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "operatore";

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated" || !isAdmin) return;
    fetch("/api/config-fiscale")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setCfg)
      .catch(e => setLoadErr(e.message || "Errore caricamento"));
  }, [status]);

  function update(field, val) { setCfg(prev => ({ ...prev, [field]: val })); setSaved(false); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/config-fiscale", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    setSaving(false);
  }

  if (loadErr) return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <Navbar />
      <div style={{ maxWidth: 500, margin: "80px auto", textAlign: "center", color: "#b91c1c", fontSize: 15 }}>
        <p style={{ fontSize: 22 }}>⚠️</p>
        <p><strong>Errore di caricamento:</strong> {loadErr}</p>
        <p style={{ color: "#6b7280", fontSize: 13, marginTop: 8 }}>Prova a riavviare il server. Se il problema persiste controlla la console.</p>
        <button onClick={() => { setLoadErr(""); window.location.reload(); }}
          style={{ marginTop: 16, padding: "8px 20px", background: "#20489a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
          Ricarica
        </button>
      </div>
    </div>
  );
  if (status === "loading" || !cfg) return <FullPageSpinner text="Carico configurazione…" />;
  if (!isAdmin) return <div style={{ padding: 40, textAlign: "center" }}>Accesso non autorizzato</div>;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <Navbar />
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "28px 16px" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <Link href="/fatture" style={{ color: C.sub, textDecoration: "none", fontSize: 14 }}>← Fatture</Link>
          <span style={{ color: C.sub }}>|</span>
          <h1 style={{ margin: 0, fontSize: 22, color: C.text }}>Dati Fiscali Emittente</h1>
        </div>

        <form onSubmit={handleSave}>
          {/* Identità */}
          <Section title="Identità">
            <Grid>
              <Field label="Nome *" value={cfg.nome} onChange={v => update("nome", v)} placeholder="Mario" />
              <Field label="Cognome" value={cfg.cognome} onChange={v => update("cognome", v)} placeholder="Rossi" />
              <Field label="Partita IVA *" value={cfg.partitaIva} onChange={v => update("partitaIva", v)} placeholder="12345678901" maxLength={11} />
              <Field label="Codice Fiscale *" value={cfg.codiceFiscale} onChange={v => update("codiceFiscale", v.toUpperCase())} placeholder="RSSMRO80A01H501U" maxLength={16} />
            </Grid>
            <div>
              <label style={lbl}>Regime fiscale</label>
              <select value={cfg.regimeFiscale} onChange={e => update("regimeFiscale", e.target.value)} style={inp}>
                {REGIMI.map(r => <option key={r.cod} value={r.cod}>{r.label}</option>)}
              </select>
            </div>
            <Field label="Codice ATECO (opzionale)" value={cfg.codiceAteco} onChange={v => update("codiceAteco", v)} placeholder="es. 85.20" />
          </Section>

          {/* Sede */}
          <Section title="Sede / Indirizzo">
            <Field label="Indirizzo *" value={cfg.indirizzo} onChange={v => update("indirizzo", v)} placeholder="Via Roma 1" full />
            <Grid>
              <Field label="CAP *" value={cfg.cap} onChange={v => update("cap", v)} placeholder="00100" maxLength={5} />
              <Field label="Comune *" value={cfg.comune} onChange={v => update("comune", v)} placeholder="Roma" />
              <Field label="Provincia" value={cfg.provincia} onChange={v => update("provincia", v.toUpperCase())} placeholder="RM" maxLength={2} />
              <Field label="Paese" value={cfg.paese} onChange={v => update("paese", v.toUpperCase())} placeholder="IT" maxLength={2} />
            </Grid>
          </Section>

          {/* Contatti */}
          <Section title="Contatti">
            <Grid>
              <Field label="Email" value={cfg.email} onChange={v => update("email", v)} placeholder="info@studio.it" type="email" />
              <Field label="PEC" value={cfg.pec} onChange={v => update("pec", v)} placeholder="studio@pec.it" />
              <Field label="Telefono" value={cfg.telefono} onChange={v => update("telefono", v)} placeholder="+39 06 1234567" />
            </Grid>
          </Section>

          {/* Dati bancari */}
          <Section title="Dati Bancari">
            <Grid>
              <Field label="IBAN" value={cfg.iban} onChange={v => update("iban", v.toUpperCase().replace(/\s/g, ""))} placeholder="IT60X0542811101000000123456" />
              <Field label="Banca" value={cfg.banca} onChange={v => update("banca", v)} placeholder="Banca Sella" />
            </Grid>
          </Section>

          {/* Anteprima SDI */}
          <div style={{ background: "#f8faff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: C.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Anteprima XML — Trasmittente</div>
            <code style={{ fontSize: 11, color: "#374151", display: "block", lineHeight: 1.7 }}>
              &lt;IdPaese&gt;IT&lt;/IdPaese&gt; &lt;IdCodice&gt;<strong>{cfg.partitaIva || "—"}</strong>&lt;/IdCodice&gt;<br/>
              &lt;RegimeFiscale&gt;<strong>{cfg.regimeFiscale}</strong>&lt;/RegimeFiscale&gt;
            </code>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            {saved && <span style={{ alignSelf: "center", color: C.green, fontWeight: 600, fontSize: 14 }}>✓ Salvato</span>}
            <button type="submit" disabled={saving} style={btnPri}>
              {saving ? "Salvo…" : "Salva configurazione"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "18px 20px", marginBottom: 18 }}>
      <h2 style={{ margin: "0 0 14px", fontSize: 14, color: "#20489a", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{title}</h2>
      {children}
    </div>
  );
}

function Grid({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>{children}</div>;
}

function Field({ label, value, onChange, placeholder, type = "text", maxLength = undefined, full = false }) {
  return (
    <div style={full ? { gridColumn: "1/-1" } : {}}>
      <label style={lbl}>{label}</label>
      <input
        type={type} value={value ?? ""} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} maxLength={maxLength}
        style={inp}
      />
    </div>
  );
}

const lbl = { display: "block", fontSize: 13, color: "#374151", marginBottom: 4, marginTop: 10 } as const;
const inp = { width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" } as const;
const btnPri = { background: "#20489a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", cursor: "pointer", fontSize: 14, fontWeight: 600 } as const;
