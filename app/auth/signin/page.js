"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });
    if (res.error) {
      setError("Credenziali non valide o utente senza ruolo.");
    } else {
      window.location.href = "/";
    }
  };

  return (
    <main style={{ maxWidth: 400, margin: "auto", padding: 20 }}>
      <h2>Accedi</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Email<br/>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <br /><br />
        <label>
          Password<br/>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </label>
        <br /><br />
        <button type="submit">Login</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </main>
  );
}