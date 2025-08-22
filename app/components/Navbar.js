"use client";

import React from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  return (
    <nav style={{
      background: "#fff",
      padding: "10px 32px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1.5px solid #dbe4f1",
    }}>
      <div style={{ fontWeight: 700, fontSize: 22, color: "#20489a" }}>
        <Link href="/" style={{ textDecoration: "none", color: "#20489a" }}>
          Gestione Clienti
        </Link>
      </div>
      {session && (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            {session.user?.name || "Utente"}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/signin" })}
            style={{
              background: "#1cb0f6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 18px",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer"
            }}
          >
            Esci
          </button>
        </div>
      )}
    </nav>
  );
}
