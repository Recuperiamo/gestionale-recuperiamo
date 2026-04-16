// @ts-nocheck
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Navbar from "../components/Navbar";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [repairLoading, setRepairLoading] = useState(false);
  const [repairResult, setRepairResult] = useState(null);

  const isAdmin = ["admin", "operatore"].includes(session?.user?.role);

  const handleRepairLavagne = async () => {
    if (!window.confirm("Avvia la correzione retroattiva di titoli e clienteId sulle lavagne?")) return;
    setRepairLoading(true);
    setRepairResult(null);
    try {
      const res = await fetch("/api/lavagna/repair", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setRepairResult({ ok: true, ...data });
      } else {
        setRepairResult({ ok: false, error: data.error || "Errore sconosciuto" });
      }
    } catch {
      setRepairResult({ ok: false, error: "Errore di rete" });
    } finally {
      setRepairLoading(false);
    }
  };

  if (status === "loading") return null;
  if (!session) {
    router.replace("/signin");
    return null;
  }

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Le nuove password non coincidono");
      return;
    }

    if (newPassword.length < 8) {
      setError("La nuova password deve essere di almeno 8 caratteri");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Password cambiata con successo!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(data.error || "Errore nel cambio password");
      }
    } catch (err) {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#20489a" }}>
      <Navbar />
      <main
        style={{
          maxWidth: 520,
          margin: "60px auto 0 auto",
          background: "#fff",
          borderRadius: 18,
          padding: "38px 34px 34px 34px",
          boxShadow: "0 4px 20px 0 rgba(32,72,154,0.07)",
          color: "#20489a",
        }}
      >
        <h2 style={{ fontWeight: 700, fontSize: 26, marginBottom: 8, textAlign: "center" }}>
          ⚙️ Accesso e Sicurezza
        </h2>
        <p style={{ fontSize: 13, color: "#4268b3", textAlign: "center", marginBottom: 24 }}>
          Gestisci i dati del tuo account
        </p>
        
        <div style={{ marginBottom: 30, padding: 16, background: "#f5f8ff", borderRadius: 10 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: "#20489a" }}>
            📧 Informazioni Account
          </h3>
          <div style={{ fontSize: 14, marginBottom: 6 }}>
            <span style={{ fontWeight: 600 }}>Nome:</span> {session.user?.name || "—"}
          </div>
          <div style={{ fontSize: 14 }}>
            <span style={{ fontWeight: 600 }}>Email:</span> {session.user?.email}
          </div>
        </div>

        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
            🔒 Cambia Password
          </h3>

          <div>
            <label style={labelStyle}>Password Attuale</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={inputStyle}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label style={labelStyle}>Nuova Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
              required
              disabled={loading}
              placeholder="Minimo 8 caratteri"
            />
          </div>

          <div>
            <label style={labelStyle}>Conferma Nuova Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div style={errorStyle}>{error}</div>
          )}

          {message && (
            <div style={successStyle}>{message}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={loading ? btnDisabledStyle : btnStyle}
          >
            {loading ? "Aggiornamento..." : "Cambia Password"}
          </button>
        </form>

        {isAdmin && (
          <div style={{ marginTop: 36, paddingTop: 24, borderTop: "1px solid #e3eefe" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: "#20489a" }}>
              Manutenzione Lavagne
            </h3>
            <p style={{ fontSize: 13, color: "#4268b3", marginBottom: 14 }}>
              Corregge retroattivamente tutte le lavagne: rigenera i titoli con il fuso orario Europe/Rome
              e ripara i <code>clienteId</code> mancanti (visibilità studenti).
            </p>
            <button
              onClick={handleRepairLavagne}
              disabled={repairLoading}
              style={repairLoading ? btnDisabledStyle : { ...btnStyle, background: "#f59e0b" }}
            >
              {repairLoading ? "Correzione in corso..." : "Correggi lavagne"}
            </button>
            {repairResult && (
              <div style={{ marginTop: 12, ...(repairResult.ok ? successStyle : errorStyle) }}>
                {repairResult.ok ? (
                  <>
                    Correzione completata su <strong>{repairResult.totale}</strong> lavagne:
                    titoli aggiornati <strong>{repairResult.fixedTitoli}</strong>,
                    clienteId ripristinati <strong>{repairResult.fixedClienteId}</strong>
                    {repairResult.errors > 0 && `, errori: ${repairResult.errors}`}.
                  </>
                ) : (
                  <>Errore: {repairResult.error}</>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: ".4px",
  display: "block",
  marginBottom: 4,
};

const inputStyle = {
  border: "1.5px solid #4268b3",
  borderRadius: 8,
  padding: "9px 11px",
  fontSize: 14,
  color: "#20489a",
  width: "100%",
  boxSizing: "border-box",
};

const btnStyle = {
  background: "#1cb0f6",
  color: "#fff",
  border: "none",
  fontWeight: 700,
  padding: "10px 20px",
  fontSize: 15,
  borderRadius: 10,
  cursor: "pointer",
  marginTop: 6,
};

const btnDisabledStyle = {
  ...btnStyle,
  background: "#9dcfe7",
  cursor: "wait",
};

const errorStyle = {
  background: "#F8D7DA",
  border: "1px solid #E58B94",
  color: "#721C24",
  padding: "8px 10px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
};

const successStyle = {
  background: "#D4EDDA",
  border: "1px solid #C3E6CB",
  color: "#155724",
  padding: "8px 10px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
};

