// @ts-nocheck
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const menuRef = useRef(null);

  const role = session?.user?.role ? String(session.user.role).toLowerCase() : undefined;
  const isStaff = role === "admin" || role === "operatore";
  const isAdmin = role === "admin";

  const navLinksStaffBase = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/clienti", label: "Clienti" },
    { href: "/pacchetti", label: "Pacchetti" },
    { href: "/attivita", label: "Attività" },
    { href: "/pacchetti-lezioni", label: "Lezioni & Pacchetti" },
    { href: "/calendario", label: "Calendario" },
    { href: "/lavagna-v2", label: "Lavagna" },
    { href: "/aule", label: "Aule" },
    { href: "/lezioni", label: "Lezioni" },
    { href: "/richieste", label: "Richieste" }
  ];

  const adminOnlyLinks = [
    { href: "/storico", label: "Storico" },
    { href: "/admin/password-resets", label: "Reset Password" }
  ];

  const lavagnaV2Abilitata = session?.user?.lavagnaV2Abilitata;

  const navLinksCliente = [
    { href: "/profilo", label: "Profilo" },
    { href: "/pacchetti-lezioni", label: "Lezioni & Pacchetti" },
    ...(lavagnaV2Abilitata ? [{ href: "/lavagna-v2", label: "Lavagna" }] : []),
    { href: "/aula", label: "Aula" },
    { href: "/lezioni", label: "Lezioni" },
    { href: "/richieste", label: "Richieste" }
  ];

  const links = isStaff ? [...navLinksStaffBase, ...(isAdmin ? adminOnlyLinks : [])] : navLinksCliente;

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard";
    if (href === "/aula") return pathname === "/aula" || pathname?.startsWith("/aula/");
    if (href === "/lavagna-v2") return pathname === "/lavagna-v2" || pathname?.startsWith("/lavagna-v2/");
    return pathname === href;
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Chiudi mobile menu al cambio pagina
  useEffect(() => { setShowMobileMenu(false); }, [pathname]);

  if (status === "loading") return null;

  function linkStyle(active) {
    return {
      textDecoration: "none",
      color: active ? "#fff" : "#c8d8f0",
      background: active ? "rgba(28,176,246,0.35)" : "transparent",
      border: "none",
      borderRadius: 6,
      padding: "7px 13px",
      fontWeight: 600,
      fontSize: 13,
      transition: "all 0.15s",
      whiteSpace: "nowrap",
    };
  }

  function mobileLinkStyle(active) {
    return {
      textDecoration: "none",
      color: "#fff",
      background: active ? "rgba(28,176,246,0.35)" : "transparent",
      borderRadius: 8,
      padding: "13px 18px",
      fontWeight: active ? 700 : 500,
      fontSize: 15,
      display: "block",
      borderLeft: active ? "3px solid #1cb0f6" : "3px solid transparent",
      transition: "background 0.15s",
    };
  }

  return (
    <>
      <style>{`
        .nb-links { display: flex; flex: 1; gap: 6px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; align-items: center; }
        .nb-links::-webkit-scrollbar { display: none; }
        .nb-hamburger { display: none !important; }
        @media (max-width: 767px) {
          .nb-links { display: none !important; }
          .nb-hamburger { display: flex !important; }
        }
      `}</style>

      <nav style={{
        background: "#20489a",
        padding: "0 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1.5px solid #1a3a7a",
        minHeight: 56,
        position: "relative",
        zIndex: 200,
      }}>
        {/* Desktop links */}
        <div className="nb-links">
          {links.map((l) => (
            <Link key={l.href} href={l.href} style={linkStyle(isActive(l.href))}>
              {l.label}
              {l.beta && (
                <span style={{
                  marginLeft: 4, fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                  background: '#f59e0b', color: '#fff', borderRadius: 4,
                  padding: '1px 4px', verticalAlign: 'middle', lineHeight: 1.5,
                }}>BETA</span>
              )}
            </Link>
          ))}
        </div>

        {/* Mobile: hamburger button */}
        <button
          className="nb-hamburger"
          onClick={() => setShowMobileMenu(v => !v)}
          style={{
            background: "transparent",
            border: "1.5px solid rgba(255,255,255,0.5)",
            color: "#fff",
            borderRadius: 8,
            padding: "7px 12px",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
            alignItems: "center",
          }}
          aria-label="Menu"
        >
          {showMobileMenu ? "✕" : "☰"}
        </button>

        {/* User menu (sempre visibile) */}
        {session && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }} ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                background: "transparent",
                color: "#fff",
                border: "1.5px solid rgba(255,255,255,0.5)",
                borderRadius: 8,
                padding: "7px 12px",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              <span>{session.user?.name || "Utente"}</span>
              <span style={{ fontSize: 10 }}>▼</span>
            </button>

            {showUserMenu && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                background: "#fff",
                border: "1.5px solid #dbe4f1",
                borderRadius: 10,
                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                minWidth: 220,
                zIndex: 1000,
                overflow: "hidden",
              }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #e8ecf3", background: "#f5f8ff" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#20489a" }}>{session.user?.name || "Utente"}</div>
                  <div style={{ fontSize: 12, color: "#4268b3", marginTop: 2 }}>{session.user?.email}</div>
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); router.push("/settings"); }}
                  style={{ width: "100%", background: "transparent", border: "none", padding: "12px 16px", textAlign: "left", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#20489a", display: "flex", alignItems: "center", gap: 10 }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#f5f8ff"}
                  onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span>⚙️</span><span>Accesso e Sicurezza</span>
                </button>
                <div style={{ borderTop: "1px solid #e8ecf3" }}>
                  <button
                    onClick={() => { setShowUserMenu(false); signOut({ callbackUrl: "/signin" }); }}
                    style={{ width: "100%", background: "transparent", border: "none", padding: "12px 16px", textAlign: "left", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#d32f2f", display: "flex", alignItems: "center", gap: 10 }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#ffebee"}
                    onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <span>🚪</span><span>Esci</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Mobile dropdown menu (sotto la navbar) */}
      {showMobileMenu && (
        <div style={{
          position: "fixed",
          top: 56,
          left: 0,
          right: 0,
          bottom: 0,
          background: "#20489a",
          zIndex: 199,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          padding: "8px 0 24px",
          borderTop: "1px solid rgba(255,255,255,0.15)",
        }}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} style={mobileLinkStyle(isActive(l.href))} onClick={() => setShowMobileMenu(false)}>
              {l.label}
              {l.beta && (
                <span style={{
                  marginLeft: 6, fontSize: 9, fontWeight: 700,
                  background: '#f59e0b', color: '#fff', borderRadius: 4,
                  padding: '1px 4px', verticalAlign: 'middle',
                }}>BETA</span>
              )}
            </Link>
          ))}
          <div style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "12px 18px" }} />
          {session && (
            <>
              <button
                onClick={() => { setShowMobileMenu(false); router.push("/settings"); }}
                style={{ ...mobileLinkStyle(false), background: "transparent", border: "none", cursor: "pointer", textAlign: "left", width: "100%" }}
              >
                ⚙️ Impostazioni
              </button>
              <button
                onClick={() => { setShowMobileMenu(false); signOut({ callbackUrl: "/signin" }); }}
                style={{ ...mobileLinkStyle(false), background: "transparent", border: "none", cursor: "pointer", textAlign: "left", width: "100%", color: "#ff8080" }}
              >
                🚪 Esci
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
