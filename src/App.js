// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import { getAuth, onAuthStateChanged, isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import LoginPage from './LoginPage';
import AdminDashboard from './AdminDashboard'; // Creeremo questo file
import ClientPortal from './ClientPortal'; // Creeremo questo file

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const auth = getAuth();

    // Gestisce il ritorno dal link di accesso via email
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Per favore, inserisci la tua email per la conferma');
      }
      signInWithEmailLink(auth, email, window.location.href)
        .then((result) => {
          window.localStorage.removeItem('emailForSignIn');
          // setUser verrà impostato dal listener onAuthStateChanged
        })
        .catch((error) => {
          console.error("Errore nel login con il link:", error);
          setLoading(false);
        });
    }

    // Listener per lo stato di autenticazione
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Qui potresti avere una logica per distinguere admin e clienti,
        // per ora assumiamo che un'email specifica sia l'admin.
        // SOSTITUISCI CON LA TUA EMAIL DA ADMIN!
        if (currentUser.email === 'r3cuperiamo@gmail.com') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Caricamento...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return isAdmin ? <AdminDashboard /> : <ClientPortal user={user} />;
}

export default App;