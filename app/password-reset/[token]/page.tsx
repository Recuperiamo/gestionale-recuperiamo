'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';

export default function CompletePasswordResetPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Le password non coincidono');
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('La password deve essere di almeno 8 caratteri');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/password-reset/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resolvedParams.token, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setTimeout(() => {
          router.push('/signin');
        }, 2000);
      } else {
        setError(data.error || 'Errore nel reset della password');
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Imposta Nuova Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            La tua richiesta è stata approvata. Inserisci la nuova password.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-3">
            <div>
              <label htmlFor="newPassword" className="sr-only">
                Nuova Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Nuova Password (min. 8 caratteri)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Conferma Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Conferma Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {message && (
            <div className="rounded-md bg-green-50 p-4">
              <p className="text-sm text-green-800">{message}</p>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Aggiornamento in corso...' : 'Aggiorna Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
