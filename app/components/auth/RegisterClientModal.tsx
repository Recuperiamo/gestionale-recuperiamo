// @ts-nocheck
"use client";
import React, { useState } from "react";
import { signIn } from "next-auth/react";

const initialState = {
  email: "",
  password: "",
  passwordConfirm: "",
  privacy: false
};

export default function RegisterClientModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);

  if (!open) return null;

  function update(k, v) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setDone(false);
    try {
      if (!form.privacy) {
        setErr("Devi accettare l'informativa/privacy.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          passwordConfirm: form.passwordConfirm
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error || ("Errore " + res.status));
      } else {
        setDone(true);
        // Auto login
        const loginRes = await signIn("credentials", {
          redirect: false,
          email: form.email,
          password: form.password
        });
        if (loginRes?.error) {
          setErr("Registrato ma login automatico fallito: " + loginRes.error);
        } else {
          onSuccess && onSuccess(json);
          // Reset form per sicurezza
          setForm(initialState);
          // Puoi fare redirect manuale se vuoi
          // window.location.href = "/profilo"; // opzionale
        }
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    form.email.trim() &&
    form.password.length >= 10 &&
    form.password === form.passwordConfirm &&
    form.privacy &&
    !loading;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <h2 style={title}>Registrazione Cliente</h2>
        <p style={desc}>
          Inserisci l'email comunicata all'amministratore. La registrazione è possibile solo
          se il tuo profilo Cliente è già stato creato dall'amministratore.
        </p>

        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={field}>
            <label style={label}>Email</label>
            <input
              type="email"
              style={input}
              value={form.email}
              onChange={e => update("email", e.target.value)}
              required
            />
          </div>
          <div style={field}>
            <label style={label}>Password (min 10, Maiuscola, minuscola, numero)</label>
            <input
              type="password"
              style={input}
              value={form.password}
              onChange={e => update("password", e.target.value)}
              required
            />
          </div>
          <div style={field}>
            <label style={label}>Conferma Password</label>
            <input
              type="password"
              style={input}
              value={form.passwordConfirm}
              onChange={e => update("passwordConfirm", e.target.value)}
              required
            />
          </div>

            <label style={{ ...checkboxRow }}>
              <input
                type="checkbox"
                checked={form.privacy}
                onChange={e => update("privacy", e.target.checked)}
              />{" "}
              <span style={{ fontSize:13 }}>
                Dichiaro di aver letto l'informativa privacy e accetto il trattamento dei dati.
              </span>
            </label>

          {err && <div style={errorBox}>{err}</div>}
          {done && !err && (
            <div style={okBox}>
              Registrazione completata. Accesso effettuato.
            </div>
          )}

          <div style={actions}>
            <button type="button" onClick={onClose} style={btnGhost} disabled={loading}>
              Chiudi
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              style={canSubmit ? btnPrimary : btnDisabled}
            >
              {loading ? "Invio..." : "Registrati"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ==== Styles ==== */
const overlay = {
  position:"fixed",
  inset:0,
  background:"rgba(32,72,154,0.38)",
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  zIndex:200
};
const modal = {
  background:"#fff",
  borderRadius:16,
  padding:"30px 30px 28px",
  width:"min(480px,92vw)",
  boxShadow:"0 6px 28px rgba(32,72,154,0.25)",
  fontFamily:"'Inter','Segoe UI',Arial,sans-serif",
  color:"#20489a"
};
const title = { margin:"0 0 10px", fontSize:24, fontWeight:800, letterSpacing:".5px" };
const desc = { margin:"0 0 18px", fontSize:14, lineHeight:1.45 };
const field = { display:"flex", flexDirection:"column", gap:6 };
const label = { fontSize:12, fontWeight:600, letterSpacing:".4px" };
const input = {
  border:"1.5px solid #4268b3",
  borderRadius:8,
  padding:"8px 10px",
  fontSize:14,
  color:"#20489a",
  background:"#fff"
};
const checkboxRow = {
  display:"flex",
  alignItems:"center",
  gap:8,
  cursor:"pointer",
  userSelect:"none",
  marginTop:4
};
const errorBox = {
  background:"#F8D7DA",
  border:"1px solid #E58B94",
  color:"#721C24",
  padding:"10px 12px",
  borderRadius:10,
  fontSize:13,
  fontWeight:600
};
const okBox = {
  background:"#E7FBF1",
  border:"1px solid #86D7B5",
  color:"#0f6d3c",
  padding:"10px 12px",
  borderRadius:10,
  fontSize:13,
  fontWeight:600
};
const actions = { display:"flex", justifyContent:"flex-end", gap:14, marginTop:4 };
const btnPrimary = {
  background:"#1cb0f6",
  color:"#fff",
  border:"none",
  fontWeight:700,
  padding:"9px 18px",
  fontSize:14,
  borderRadius:10,
  cursor:"pointer"
};
const btnDisabled = { ...btnPrimary, background:"#9dcfe7", cursor:"not-allowed" };
const btnGhost = {
  background:"#e3eefe",
  color:"#20489a",
  border:"none",
  fontWeight:600,
  padding:"9px 18px",
  fontSize:14,
  borderRadius:10,
  cursor:"pointer"
};