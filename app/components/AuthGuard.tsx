// @ts-nocheck
import React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BrandSpinner } from "./Spinner";

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
    return <BrandSpinner />;
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
