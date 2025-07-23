// src/LoginPage.js
import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

function LoginPage() {
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  
  const [isRegistering, setIsRegistering] = useState(false); // Stato per mostrare/nascondere form
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const auth = getAuth();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    } catch (err) {
      setError("Credenziali admin errate.");
    }
  };

  const handleClientAuth = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (isRegistering) {
      // Logica di Registrazione
      try {
        await createUserWithEmailAndPassword(auth, clientEmail, clientPassword);
        setMessage('Registrazione completata! Ora puoi accedere.');
        setIsRegistering(false); // Torna al form di login
      } catch (err) {
        setError("Errore in registrazione. L'email potrebbe essere già in uso.");
      }
    } else {
      // Logica di Login
      try {
        await signInWithEmailAndPassword(auth, clientEmail, clientPassword);
      } catch (err) {
        setError("Email o password non corrette.");
      }
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

        <form onSubmit={handleClientAuth} className="login-form">
          <h2>Area Clienti</h2>
          <p>{isRegistering ? 'Crea il tuo account per visualizzare i pacchetti.' : 'Accedi alla tua area personale.'}</p>
          <input 
            type="email" 
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="La tua email"
            required
          />
          <input 
            type="password"
            value={clientPassword}
            onChange={(e) => setClientPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <button type="submit">{isRegistering ? 'Registrati' : 'Accedi'}</button>
          <button type="button" onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;