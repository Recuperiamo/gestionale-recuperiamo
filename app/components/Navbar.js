"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession } from "../lib/auth/hooks";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  if (status === "loading") return null;

  const role = session?.user?.role ? String(session.user.role).toLowerCase() : undefined;

  const isStaff = role === "admin" || role === "operatore";
  const isAdmin = role === "admin";

  // Staff (admin/operatore) base links
  const navLinksStaffBase = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/clienti", label: "Clienti" },
    { href: "/pacchetti", label: "Pacchetti" },
    { href: "/attivita", label: "Attività" },
    { href: "/pacchetti-lezioni", label: "Lezioni & Pacchetti" },
    { href: "/calendario", label: "Calendario" },
    { href: "/lavagna", label: "Lavagna" },
    { href: "/aule", label: "Aule" },
    { href: "/richieste", label: "Richieste" }
  ];

  // Admin-only links
  const adminOnlyLinks = [
    { href: "/storico", label: "Storico" },
    { href: "/admin/password-resets", label: "Reset Password" }
  ];

  // Client links (niente "Storico")
  const navLinksCliente = [
    { href: "/profilo", label: "Profilo" },
    { href: "/pacchetti-lezioni", label: "Lezioni & Pacchetti" },
    { href: "/lavagna", label: "Lavagna" },
    { href: "/aula", label: "Aula" },
    { href: "/richieste", label: "Richieste" }
  ];

  // Costruzione finale dei link: "Storico" + "Reset Password" SOLO per admin
  const links = isStaff ? [...navLinksStaffBase, ...(isAdmin ? adminOnlyLinks : [])] : navLinksCliente;

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard";
    if (href === "/aula") return pathname === "/aula" || pathname?.startsWith("/aula/");
    return pathname === href;
  };

  // Chiudi menu quando si clicca fuori
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        {links.map((l) => (
          <Link key={l.href} href={l.href} style={linkStyle(isActive(l.href))}>
            {l.label}
          </Link>
        ))}
      </div>

      {session && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }} ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              background: "transparent",
              color: "#fff",
              border: "1.5px solid #fff",
              borderRadius: 8,
              padding: "8px 14px",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            <span>{session.user?.name || "Utente"}</span>
            <span style={{ fontSize: 12 }}>▼</span>
          </button>

          {showUserMenu && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 8,
                background: "#fff",
                border: "1.5px solid #dbe4f1",
                borderRadius: 10,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                minWidth: 220,
                zIndex: 1000,
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #e8ecf3",
                  background: "#f5f8ff"
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, color: "#20489a" }}>
                  {session.user?.name || "Utente"}
                </div>
                <div style={{ fontSize: 12, color: "#4268b3", marginTop: 2 }}>
                  {session.user?.email}
                </div>
              </div>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  router.push("/settings");
                }}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  padding: "12px 16px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#20489a",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "background 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#f5f8ff"}
                onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
              >
                <span>⚙️</span>
                <span>Accesso e Sicurezza</span>
              </button>

              <div style={{ borderTop: "1px solid #e8ecf3" }}>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    signOut({ callbackUrl: "/signin" });
                  }}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    padding: "12px 16px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#d32f2f",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "background 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#ffebee"}
                  onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span>🚪</span>
                  <span>Esci</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}