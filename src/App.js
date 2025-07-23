import React, { useState, useEffect } from 'react';
import './App.css';
import { getAuth, onAuthStateChanged, isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import LoginPage from './LoginPage';
import AdminDashboard from './AdminDashboard';
import ClientPortal from './ClientPortal';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Per favore, inserisci la tua email per la conferma');
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => window.localStorage.removeItem('emailForSignIn'))
          .catch(console.error)
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        if (currentUser.email === 'r3cuperiamo@gmail.com') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
        setUser(currentUser);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="loading-screen">Caricamento...</div>;
  }

  return (
    <>
      <style>{`
        body { margin: 0; background-color: #1e1e1e; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        .App { max-width: 1000px; margin: 20px auto; padding: 20px; }
        h1, h2, h3 { color: #00aaff; border-bottom: 1px solid #00aaff; padding-bottom: 8px; margin-top: 20px; }
        button { background-color: #00aaff; border: none; padding: 10px 15px; margin: 5px; border-radius: 5px; cursor: pointer; color: white; font-weight: bold; transition: background-color 0.2s; }
        button:hover { background-color: #0088cc; }
        button:disabled { background-color: #555; cursor: not-allowed; }
        button.delete-btn { background-color: #d32f2f; }
        button.delete-btn:hover { background-color: #b71c1c; }
        input, select { padding: 10px; margin: 5px; border-radius: 5px; border: 1px solid #555; background-color: #333; color: white; }
        ul { list-style-type: none; padding: 0; }
        .add-client-form, .edit-client-form, .add-package-form, .edit-package-form, .booking-form { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 15px; border-radius: 8px; background-color: #2a2a2a; margin-top: 15px; }
        .client-list > ul > li { background-color: #2c2c2c; border: 1px solid #444; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .client-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .client-header span { font-size: 1.8em; font-weight: bold; color: #00aaff; }
        .package-item { border: 1px solid #444; padding: 15px; border-radius: 6px; margin-top: 15px; background-color: #333; }
        .package-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; align-items: center; margin-bottom: 10px; }
        .package-details span { background-color: #3e3e3e; padding: 8px; border-radius: 4px; }
        .booking-list { margin-top: 15px; }
        .booking-item { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid #444; }
        .warning-message { background-color: #8d4b00; padding: 10px; border-radius: 4px; width: 100%; text-align: center; margin: 10px 0; }
        .days-selector { display: flex; flex-direction: column; gap: 10px; padding: 5px; }
        .days-selector label { display: flex; align-items: center; gap: 8px; }
        .days-selector .time-inputs { margin-left: 25px; }
        .login-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; }
        .login-forms { display: flex; gap: 40px; }
        .login-form { display: flex; flex-direction: column; gap: 10px; padding: 20px; background-color: #2c2c2c; border-radius: 8px; }
        .message { color: #4caf50; font-weight: bold; } .error { color: #f44336; font-weight: bold; }
        .dashboard-summary, .request-manager { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .summary-box, .request-manager ul { background-color: #2c2c2c; padding: 20px; border-radius: 8px; }
        .request-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #444; }
        .notification-banner { padding: 15px; background-color: #005f88; color: white; text-align: center; border-radius: 8px; margin-bottom: 20px; }
      `}</style>
      {!user ? <LoginPage /> : (isAdmin ? <AdminDashboard /> : <ClientPortal user={user} />)}
    </>
  );
}

export default App;