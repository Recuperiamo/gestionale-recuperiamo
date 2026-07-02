'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FullPageSpinner } from '../../components/Spinner';

interface PasswordResetRequest {
  id: number;
  userId: number;
  status: string;
  createdAt: string;
  user: {
    id: number;
    email: string;
    name: string | null;
  };
}

export default function AdminPasswordResetsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPendingRequests();
    }
  }, [status]);

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch('/api/password-reset/pending');
      if (!response.ok) {
        throw new Error('Errore nel caricamento');
      }
      const data = await response.json();
      setRequests(data.requests);
    } catch (err) {
      setError('Errore nel caricamento delle richieste');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (requestId: number, action: 'approve' | 'reject') => {
    setProcessingId(requestId);
    setError('');

    try {
      const response = await fetch('/api/password-reset/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });

      const data = await response.json();

      if (response.ok) {
        // Rimuovi la richiesta dalla lista
        setRequests((prev) => prev.filter((req) => req.id !== requestId));
        
        if (action === 'approve') {
          alert(`✅ ${data.message}\n\nPassword temporanea: ${data.tempPassword}\n\nComunica questa password all'utente ${data.email}`);
        } else {
          alert(`❌ Richiesta rifiutata`);
        }
      } else {
        setError(data.error || 'Errore nella revisione');
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setProcessingId(null);
    }
  };

  if (status === 'loading' || loading) return <FullPageSpinner text="Caricamento..." />;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Richieste di Reset Password
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Gestisci le richieste di reset password degli utenti
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {requests.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
            Nessuna richiesta in attesa
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {requests.map((request) => (
                <li key={request.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {request.user.name || request.user.email}
                        </p>
                        {request.user.name && (
                          <p className="ml-2 text-sm text-gray-500">
                            ({request.user.email})
                          </p>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Richiesta inviata il {new Date(request.createdAt).toLocaleString('it-IT')}
                      </p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleReview(request.id, 'approve')}
                        disabled={processingId === request.id}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === request.id ? 'Elaborazione...' : 'Approva'}
                      </button>
                      <button
                        onClick={() => handleReview(request.id, 'reject')}
                        disabled={processingId === request.id}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === request.id ? 'Elaborazione...' : 'Rifiuta'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
