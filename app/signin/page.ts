// @ts-nocheck
"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import RegisterClientModal from "../components/auth/RegisterClientModal";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password
      });
      if (res?.error) {
        setErr("Credenziali non valide");
      } else {
        // Redirect dopo login
        window.location.href = "/profilo";
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={wrapper}>
      <div style={card}>
        <h1 style={title}>Accedi</h1>
        <form onSubmit={submit} style={form}>
          <label style={lbl}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            style={inp}
            required
          />
          <label style={lbl}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            style={inp}
            required
          />
          {err && <div style={errorBox}>{err}</div>}
          <button
            type="submit"
            disabled={loading}
            style={loading ? btnDisabled : btnPrimary}
          >
            {loading ? "Attendere..." : "Login"}
          </button>
          <div style={{ textAlign:"center", marginTop:8 }}>
            <a
              href="/password-reset"
              style={forgotLink}
            >
              Password dimenticata?
            </a>
          </div>
        </form>
        <div style={{ marginTop:20, fontSize:13, textAlign:"center" }}>
          Non hai ancora un account?{" "}
          <button
            onClick={()=>setShowRegister(true)}
            style={linkBtn}
            type="button"
          >
            Registrati
          </button>
        </div>
      </div>

      <RegisterClientModal
        open={showRegister}
        onClose={()=>setShowRegister(false)}
        onSuccess={()=> {
          setShowRegister(false);
          // opzionale: window.location.href = '/profilo';
        }}
      />
    </div>
  );
}

/* === Styles (semplificati) === */
const wrapper = {
  minHeight:"100vh",
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  background:"#f5f8ff",
  fontFamily:"'Inter','Segoe UI',Arial,sans-serif",
  padding:"20px"
};
const card = {
  background:"#fff",
  padding:"38px 36px 34px",
  borderRadius:18,
  width:"min(420px,100%)",
  boxShadow:"0 6px 28px rgba(32,72,154,0.18)",
  color:"#20489a"
};
const title = { margin:"0 0 18px", fontSize:30, fontWeight:800, textAlign:"center" };
const form = { display:"flex", flexDirection:"column", gap:14 };
const lbl = { fontSize:12, fontWeight:600, letterSpacing:".4px" };
const inp = {
  border:"1.5px solid #4268b3",
  borderRadius:8,
  padding:"9px 11px",
  fontSize:14,
  color:"#20489a"
};
const btnPrimary = {
  background:"#1cb0f6",
  color:"#fff",
  border:"none",
  fontWeight:700,
  padding:"10px 20px",
  fontSize:15,
  borderRadius:10,
  cursor:"pointer",
  marginTop:6
};
const btnDisabled = { ...btnPrimary, background:"#9dcfe7", cursor:"wait" };
const errorBox = {
  background:"#F8D7DA",
  border:"1px solid #E58B94",
  color:"#721C24",
  padding:"8px 10px",
  borderRadius:8,
  fontSize:13,
  fontWeight:600
};
const linkBtn = {
  background:"none",
  color:"#1cb0f6",
  border:"none",
  cursor:"pointer",
  fontWeight:700,
  textDecoration:"underline",
  padding:0
};
const forgotLink = {
  color:"#1cb0f6",
  fontSize:13,
  textDecoration:"none",
  fontWeight:600
};