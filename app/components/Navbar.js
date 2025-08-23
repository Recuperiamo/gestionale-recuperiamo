"use client";

import React from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading") return null;

  // Mappa route/pagine principali (incluso Storico)
  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/clienti", label: "Gestione Clienti" },
    { href: "/pacchetti", label: "Pacchetti" },
    { href: "/attivita", label: "Gestione Attività" },
    { href: "/storico", label: "Storico" }, // <--- AGGIUNTO LINK STORICO
  ];

  // Funzione per check pagina attiva
  const isActive = (href) => {
    // Per la home, match sia "/" che "/dashboard"
    if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard";
    return pathname === href;
  };

  return (
    <nav
      style={{
        background: "#20489a",
        padding: "12px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1.5px solid #dbe4f1",
        minHeight: 60,
      }}
    >
      {/* Sezione navigazione principale */}
      <div style={{ display: "flex", gap: "12px" }}>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              textDecoration: "none",
              color: isActive(link.href) ? "#fff" : "#20489a",
              background: isActive(link.href) ? "#1cb0f6" : "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 18px",
              fontWeight: 600,
              fontSize: 15,
              transition: "all 0.2s",
              boxShadow: isActive(link.href) ? "0 2px 8px #1cb0f640" : "none"
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>
      {/* Sezione utente/profilo/uscita */}
      {session && (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: "#fff" }}>
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