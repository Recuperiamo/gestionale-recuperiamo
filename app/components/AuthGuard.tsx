// @ts-nocheck
import React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * AuthGuard – Protegge l'accesso alle pagine admin e/o solo admin.
 * Props:
 *   - requireAdmin (boolean): se true, accetta solo utenti admin; se non admin → redirect a /profilo.
 *   - children: può essere un ReactNode o una funzione (session) => ReactNode.
 * 
 * USO: Wrappare il contenuto della pagina protetta, subito all'inizio.
 * 
 * Esempio:
 *   <AuthGuard requireAdmin>
 *     {session => (
 *       <Navbar />
 *       ...contenuto pagina...
 *     )}
 *   </AuthGuard>
 */
export default function AuthGuard({ requireAdmin = false, children }) {
  const { data: session, status } = useSession({ required: true });
  const router = useRouter();

  if (status === "loading") {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%)',
        gap: 24,
      }}>
        {/* Pencil icon */}
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ animation: 'rb-rock 1.6s ease-in-out infinite' }}>
          <rect x="18" y="6" width="16" height="30" rx="4" fill="#1cb0f6"/>
          <rect x="21" y="8" width="10" height="6" rx="2" fill="#fff" opacity="0.5"/>
          <polygon points="18,36 34,36 26,48" fill="#fbbf24"/>
          <rect x="23" y="36" width="6" height="8" fill="#f59e0b"/>
          <line x1="26" y1="44" x2="26" y2="48" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        {/* Bouncing dots */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i === 0 ? '#1cb0f6' : i === 1 ? '#58cc02' : '#ff9600',
              animation: `rb-bounce 1.2s ease-in-out ${i * 0.18}s infinite`,
            }} />
          ))}
        </div>
        <div style={{ color: '#1e3a5f', fontWeight: 700, fontSize: 15, letterSpacing: '0.06em' }}>
          Recuperiamo
        </div>
        <style>{`
          @keyframes rb-bounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
            40% { transform: translateY(-14px); opacity: 1; }
          }
          @keyframes rb-rock {
            0%, 100% { transform: rotate(-8deg); }
            50% { transform: rotate(8deg); }
          }
        `}</style>
      </div>
    );
  }

  // Se non autenticato, NextAuth gestisce già il redirect a /signin
  if (!session) return null;

  // Se serve admin e non lo è, redirect a /profilo
  if (requireAdmin && session.user?.role !== "admin") {
    if (typeof window !== "undefined") {
      router.replace("/profilo");
    }
    return null;
  }

  // Supporta children come funzione o come ReactNode
  if (typeof children === "function") {
    return children(session);
  }
  return children;
}
