"use client";

import React from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  if (status === "loading") return null;

  const role = session?.user?.role;

  // Admin / Operatore
  const navLinksAdmin = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/clienti", label: "Clienti" },
    { href: "/pacchetti", label: "Pacchetti" },
    { href: "/attivita", label: "Attività" },
    { href: "/pacchetti-lezioni", label: "Lezioni & Pacchetti" },
    { href: "/calendario", label: "Calendario" },
    { href: "/lavagna", label: "Lavagna" },
    { href: "/materiale", label: "Materiale" },
    { href: "/storico", label: "Storico" }
  ];

  // Cliente
  const navLinksCliente = [
    { href: "/profilo", label: "Profilo" },
    { href: "/pacchetti-lezioni", label: "Lezioni & Pacchetti" },
    { href: "/lavagna", label: "Lavagna" },
    { href: "/materiale", label: "Materiale" },
    { href: "/storico", label: "Storico" }
  ];

  const links = (role === "admin" || role === "operatore") ? navLinksAdmin : navLinksCliente;

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard";
    return pathname === href;
  };

  function linkStyle(active) {
    return {
      textDecoration: "none",
      color: active ? "#fff" : "#20489a",
      background: active ? "#1cb0f6" : "#fff",
      border: "none",
      borderRadius: 6,
      padding: "8px 16px",
      fontWeight: 600,
      fontSize: 14,
      transition: "all 0.2s",
      boxShadow: active ? "0 2px 8px #1cb0f640" : "none"
    };
  }

  return (
    <nav
      style={{
        background: "#20489a",
        padding: "12px 28px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1.5px solid #dbe4f1",
        minHeight: 60,
        flexWrap: "wrap",
        gap: 16
      }}
    >
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {links.map(l => (
          <Link key={l.href} href={l.href} style={linkStyle(isActive(l.href))}>
            {l.label}
          </Link>
        ))}
      </div>

      {session && (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>
            {session.user?.name || "Utente"}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/signin" })}
            style={{
              background: "#1cb0f6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontWeight: 600,
              fontSize: 14,
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