// @ts-nocheck
"use client";
import React, { useState, useRef, useEffect } from "react";
import { useSession } from "../lib/auth/hooks";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// ── Struttura navigazione staff ───────────────────────────────────────────────
const NAV_GROUPS = [
  {
    id: "dashboard", label: "Dashboard",
    href: "/dashboard", single: true,
  },
  {
    id: "studenti", label: "Studenti",
    links: [
      { href: "/clienti",    label: "Clienti" },
      { href: "/pacchetti",  label: "Pacchetti" },
      { href: "/attivita",   label: "Attività" },
      { href: "/aule",       label: "Aule" },
    ],
  },
  {
    id: "didattica", label: "Didattica",
    links: [
      { href: "/pacchetti-lezioni", label: "Lezioni & Pacchetti" },
      { href: "/lezioni",           label: "Lezioni" },
      { href: "/quiz",              label: "Test" },
      { href: "/lavagna",           label: "Lavagna" },
      { href: "/calendario",        label: "Calendario" },
    ],
  },
  {
    id: "gestione", label: "Gestione",
    links: [{ href: "/richieste", label: "Richieste" }],
    adminLinks: [
      { href: "/storico",               label: "Storico" },
      { href: "/admin/password-resets", label: "Reset Password" },
    ],
  },
];

const NAV_CLIENTE = [
  { href: "/profilo",           label: "Profilo" },
  { href: "/pacchetti-lezioni", label: "Lezioni & Pacchetti" },
  { href: "/lavagna",           label: "Lavagna" },
  { href: "/aula",              label: "Aula" },
  { href: "/lezioni",           label: "Lezioni" },
  { href: "/richieste",         label: "Richieste" },
];

// ── Dropdown singolo gruppo ───────────────────────────────────────────────────
function GroupDropdown({ group, isAdmin, isActiveFn, open, onToggle }) {
  const allLinks = [...(group.links || []), ...(isAdmin ? (group.adminLinks || []) : [])];
  const active = allLinks.some(l => isActiveFn(l.href));

  return (
    <div style={{ position: "relative", flex: 1, display: "flex" }}>
      <button
        onClick={onToggle}
        style={{
          background: active || open ? "rgba(28,176,246,0.3)" : "transparent",
          border: "none",
          color: active || open ? "#fff" : "#c8d8f0",
          fontWeight: 700,
          fontSize: "clamp(14px, 1.4vw, 19px)",
          cursor: "pointer",
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          whiteSpace: "nowrap",
          transition: "all 0.15s",
          letterSpacing: "0.1px",
        }}
      >
        {group.label}
        <span style={{
          fontSize: 9, display: "inline-block",
          transition: "transform 0.2s",
          transform: open ? "rotate(180deg)" : "none",
          opacity: 0.8,
        }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 10px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(32,72,154,0.18)",
          border: "1.5px solid #dbe4f1",
          minWidth: 210,
          zIndex: 999,
          overflow: "visible",
        }}>
          {/* Freccia verso l'alto */}
          <div style={{
            position: "absolute",
            top: -7,
            left: "50%",
            transform: "translateX(-50%) rotate(45deg)",
            width: 12, height: 12,
            background: "#fff",
            borderLeft: "1.5px solid #dbe4f1",
            borderTop: "1.5px solid #dbe4f1",
            borderRadius: "2px 0 0 0",
          }} />
          <div style={{ borderRadius: 12, overflow: "hidden" }}>
            {allLinks.map((link, idx) => {
              const isCurrent = isActiveFn(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onToggle}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 18px",
                    color: isCurrent ? "#20489a" : "#374151",
                    background: isCurrent ? "#eff6ff" : "transparent",
                    fontWeight: isCurrent ? 700 : 400,
                    fontSize: 14,
                    textDecoration: "none",
                    borderBottom: idx < allLinks.length - 1 ? "1px solid #f1f5f9" : "none",
                    transition: "background 0.12s, color 0.12s",
                  }}
                  onMouseEnter={e => { if (!isCurrent) { e.currentTarget.style.background = "#f0f4ff"; e.currentTarget.style.color = "#20489a"; } }}
                  onMouseLeave={e => { if (!isCurrent) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#374151"; } }}
                >
                  <span>{link.label}</span>
                  {isCurrent && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1cb0f6", flexShrink: 0 }} />}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Navbar principale ──────────────────────────────────────────────────────────
export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [showUserMenu, setShowUserMenu]     = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [openDropdown, setOpenDropdown]     = useState(null);
  const [openMobileGrp, setOpenMobileGrp]  = useState(null);

  const navRef = useRef(null);

  const role    = session?.user?.role ? String(session.user.role).toLowerCase() : undefined;
  const isStaff = role === "admin" || role === "operatore";
  const isAdmin = role === "admin";

  function isActive(href) {
    if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard";
    if (href === "/aula")     return pathname === "/aula" || pathname?.startsWith("/aula/");
    if (href === "/lavagna")  return pathname === "/lavagna" || pathname?.startsWith("/lavagna/");
    return pathname === href || pathname?.startsWith(href + "/");
  }

  function isGroupActive(group) {
    if (group.single) return isActive(group.href);
    const links = [...(group.links || []), ...(isAdmin ? (group.adminLinks || []) : [])];
    return links.some(l => isActive(l.href));
  }

  // Click fuori → chiudi tutto
  useEffect(() => {
    function onOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenDropdown(null);
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // Cambio pagina → chiudi tutto
  useEffect(() => {
    setShowMobileMenu(false);
    setOpenDropdown(null);
    setOpenMobileGrp(null);
  }, [pathname]);

  if (status === "loading") return null;

  const singleStyle = (active) => ({
    textDecoration: "none",
    color: active ? "#fff" : "#c8d8f0",
    background: active ? "rgba(28,176,246,0.35)" : "transparent",
    border: "none",
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "clamp(14px, 1.4vw, 19px)",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
    letterSpacing: "0.1px",
  });

  const mobileLinkStyle = (active) => ({
    textDecoration: "none",
    color: "#fff",
    background: active ? "rgba(28,176,246,0.3)" : "transparent",
    padding: "13px 20px",
    fontWeight: active ? 700 : 500,
    fontSize: 15,
    display: "block",
    borderLeft: active ? "3px solid #1cb0f6" : "3px solid transparent",
    transition: "background 0.15s",
  });

  return (
    <>
      <style>{`
        .nb-staff { display: flex; flex: 1; align-items: stretch; }
        .nb-cliente { display: flex; flex: 1; gap: 2px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; align-items: center; justify-content: space-evenly; }
        .nb-cliente::-webkit-scrollbar { display: none; }
        .nb-hamburger { display: none !important; }
        @media (max-width: 800px) {
          .nb-staff, .nb-cliente { display: none !important; }
          .nb-hamburger { display: flex !important; }
        }
      `}</style>

      <nav ref={navRef} style={{
        background: "#20489a",
        padding: "0 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1.5px solid #1a3a7a",
        minHeight: 64,
        position: "sticky",
        top: 0,
        zIndex: 200,
      }}>

        {/* ── Desktop: staff con dropdown ── */}
        {isStaff && (
          <div className="nb-staff">
            {NAV_GROUPS.map(group => {
              if (group.single) {
                const active = isActive(group.href);
                return (
                  <Link key={group.id} href={group.href} style={singleStyle(active)}>
                    {group.label}
                  </Link>
                );
              }
              return (
                <GroupDropdown
                  key={group.id}
                  group={group}
                  isAdmin={isAdmin}
                  isActiveFn={isActive}
                  open={openDropdown === group.id}
                  onToggle={() => setOpenDropdown(openDropdown === group.id ? null : group.id)}
                />
              );
            })}
          </div>
        )}

        {/* ── Desktop: cliente flat ── */}
        {!isStaff && session && (
          <div className="nb-cliente">
            {NAV_CLIENTE.map(l => (
              <Link key={l.href} href={l.href} style={singleStyle(isActive(l.href))}>
                {l.label}
              </Link>
            ))}
          </div>
        )}

        {/* ── Hamburger ── */}
        <button
          className="nb-hamburger"
          onClick={() => setShowMobileMenu(v => !v)}
          style={{
            background: "transparent",
            border: "1.5px solid rgba(255,255,255,0.5)",
            color: "#fff", borderRadius: 8,
            padding: "7px 12px", cursor: "pointer",
            fontSize: 18, lineHeight: 1,
            alignItems: "center",
          }}
          aria-label="Menu"
        >
          {showMobileMenu ? "✕" : "☰"}
        </button>

        {/* ── User menu ── */}
        {session && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setOpenDropdown(null); }}
              style={{
                background: "transparent", color: "#fff",
                border: "1.5px solid rgba(255,255,255,0.5)",
                borderRadius: 8, padding: "7px 12px",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
              }}
            >
              <span>{session.user?.name || "Utente"}</span>
              <span style={{ fontSize: 10 }}>▼</span>
            </button>

            {showUserMenu && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 8px)", right: 0,
                background: "#fff",
                border: "1.5px solid #dbe4f1",
                borderRadius: 10,
                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                minWidth: 220, zIndex: 1000, overflow: "hidden",
              }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #e8ecf3", background: "#f5f8ff" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#20489a" }}>{session.user?.name || "Utente"}</div>
                  <div style={{ fontSize: 12, color: "#4268b3", marginTop: 2 }}>{session.user?.email}</div>
                </div>
                <button onClick={() => { setShowUserMenu(false); router.push("/settings"); }}
                  style={{ width: "100%", background: "transparent", border: "none", padding: "12px 16px", textAlign: "left", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#20489a", display: "flex", alignItems: "center", gap: 10 }}
                  onMouseOver={e => e.currentTarget.style.background = "#f5f8ff"}
                  onMouseOut={e => e.currentTarget.style.background = "transparent"}
                >
                  <span>⚙️</span><span>Accesso e Sicurezza</span>
                </button>
                <div style={{ borderTop: "1px solid #e8ecf3" }}>
                  <button onClick={() => { setShowUserMenu(false); signOut({ callbackUrl: "/signin" }); }}
                    style={{ width: "100%", background: "transparent", border: "none", padding: "12px 16px", textAlign: "left", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#d32f2f", display: "flex", alignItems: "center", gap: 10 }}
                    onMouseOver={e => e.currentTarget.style.background = "#ffebee"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span>🚪</span><span>Esci</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* ── Mobile menu ─────────────────────────────────────────────────────────── */}
      {showMobileMenu && (
        <div style={{
          position: "fixed", top: 56, left: 0, right: 0, bottom: 0,
          background: "#20489a", zIndex: 199, overflowY: "auto",
          display: "flex", flexDirection: "column",
          padding: "8px 0 24px",
          borderTop: "1px solid rgba(255,255,255,0.15)",
        }}>
          {isStaff ? (
            NAV_GROUPS.map(group => {
              if (group.single) {
                const active = isActive(group.href);
                return (
                  <Link key={group.id} href={group.href}
                    onClick={() => setShowMobileMenu(false)}
                    style={mobileLinkStyle(active)}>
                    {group.label}
                  </Link>
                );
              }

              const allLinks = [...(group.links || []), ...(isAdmin ? (group.adminLinks || []) : [])];
              const grpActive = isGroupActive(group);
              const isOpen = openMobileGrp === group.id;

              return (
                <div key={group.id}>
                  <button
                    onClick={() => setOpenMobileGrp(isOpen ? null : group.id)}
                    style={{
                      width: "100%", background: grpActive ? "rgba(28,176,246,0.2)" : "transparent",
                      border: "none", borderLeft: grpActive ? "3px solid #1cb0f6" : "3px solid transparent",
                      color: "#fff", padding: "13px 20px",
                      fontWeight: grpActive ? 700 : 500, fontSize: 15,
                      cursor: "pointer", textAlign: "left",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}
                  >
                    {group.label}
                    <span style={{
                      fontSize: 10, display: "inline-block",
                      transition: "transform 0.2s",
                      transform: isOpen ? "rotate(180deg)" : "none",
                    }}>▼</span>
                  </button>

                  {isOpen && (
                    <div style={{ background: "rgba(0,0,0,0.18)" }}>
                      {allLinks.map(link => {
                        const active = isActive(link.href);
                        return (
                          <Link key={link.href} href={link.href}
                            onClick={() => setShowMobileMenu(false)}
                            style={{
                              display: "block",
                              padding: "11px 20px 11px 32px",
                              color: active ? "#1cb0f6" : "rgba(255,255,255,0.82)",
                              fontWeight: active ? 700 : 400,
                              fontSize: 14,
                              textDecoration: "none",
                              borderLeft: active ? "2px solid #1cb0f6" : "2px solid transparent",
                            }}>
                            {link.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            NAV_CLIENTE.map(l => (
              <Link key={l.href} href={l.href}
                onClick={() => setShowMobileMenu(false)}
                style={mobileLinkStyle(isActive(l.href))}>
                {l.label}
              </Link>
            ))
          )}

          <div style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "12px 18px" }} />
          {session && (
            <>
              <button onClick={() => { setShowMobileMenu(false); router.push("/settings"); }}
                style={{ background: "transparent", border: "none", cursor: "pointer", textAlign: "left", width: "100%", padding: "13px 20px", color: "#fff", fontSize: 15, fontWeight: 500 }}>
                ⚙️ Impostazioni
              </button>
              <button onClick={() => { setShowMobileMenu(false); signOut({ callbackUrl: "/signin" }); }}
                style={{ background: "transparent", border: "none", cursor: "pointer", textAlign: "left", width: "100%", padding: "13px 20px", color: "#ff8080", fontSize: 15, fontWeight: 500 }}>
                🚪 Esci
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
