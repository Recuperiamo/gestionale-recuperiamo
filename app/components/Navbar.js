"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  return (
    <nav style={{
      background: "#fff",
      padding: "10px 32px",
      borderBottom: "1.5px solid #dbe4f1",
      display: "flex",
      justifyContent: "space-between"
    }}>
      <div>
        {/* Solo admin vede il link Dashboard */}
        {session?.user?.role === "admin" && (
          <Link href="/" style={{ marginRight: 16, fontWeight: 600 }}>Dashboard</Link>
        )}
        {/* Tutti gli utenti autenticati vedono Profilo */}
        {session?.user && (
          <Link href="/profilo" style={{ fontWeight: 600 }}>Profilo</Link>
        )}
      </div>
      <div>
        {session?.user && (
          <button onClick={() => signOut()} style={{
            background: "#1cb0f6",
            color: "#fff",
            border: "none",
            borderRadius: 7,
            padding: "8px 20px",
            fontWeight: 700,
            cursor: "pointer"
          }}>
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}