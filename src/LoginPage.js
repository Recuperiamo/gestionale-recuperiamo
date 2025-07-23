// src/LoginPage.js
import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, sendSignInLinkToEmail } from "firebase/auth";

const actionCodeSettings = {
  url: window.location.href, // La pagina a cui tornare dopo il login
  handleCodeInApp: true,
};

function LoginPage() {
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const auth = getAuth();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      // Il login va a buon fine, l'app principale se ne accorgerà
    } catch (err) {
      setError("Credenziali admin errate.");
    }
  };

  const handleClientLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await sendSignInLinkToEmail(auth, clientEmail, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', clientEmail); // Salva l'email per dopo
      setMessage(`Link di accesso inviato a ${clientEmail}. Controlla la tua posta!`);
    } catch (err) {
      setError("Impossibile inviare il link. Controlla l'email.");
    }
  };

  return (
    <div className="login-container">
      <h1>Accesso Gestionale</h1>
      {message && <p className="message">{message}</p>}
      {error && <p className="error">{error}</p>}
      
      <div className="login-forms">
        <form onSubmit={handleAdminLogin} className="login-form">
          <h2>Accesso Admin</h2>
          <input 
            type="email" 
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="Email Admin"
            required
          />
          <input 
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <button type="submit">Entra come Admin</button>
        </form>

        <form onSubmit={handleClientLogin} className="login-form">
          <h2>Accesso Clienti</h2>
          <p>Inserisci la tua email per ricevere un link di accesso.</p>
          <input 
            type="email" 
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="La tua email"
            required
          />
          <button type="submit">Invia Link di Accesso</button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;