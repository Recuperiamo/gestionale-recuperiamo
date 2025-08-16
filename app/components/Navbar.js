"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/profile", label: "Profilo" },
  { href: "/settings", label: "Impostazioni" },
  { href: "/signin", label: "Logout" }
];

// Colori principali
const primary = "#20489a";
const accent = "#1cb0f6";
const white = "#fff";

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav
      style={{
        background: primary,
        padding: "18px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        minHeight: 64,
        width: "100%"
      }}
    >
      <div
        style={{
          color: white,
          fontWeight: 700,
          fontSize: 20,
          letterSpacing: 1,
          marginRight: 36
        }}
      >
        Re<sup>2</sup>CUPERIAMO
      </div>
      <ul style={{ display: "flex", gap: 18, listStyle: "none", margin: 0, padding: 0 }}>
        {navLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              style={{
                color: pathname === link.href ? accent : white,
                textDecoration: "none",
                fontWeight: pathname === link.href ? 700 : 400,
                fontSize: 16,
                padding: "7px 16px",
                borderRadius: 6,
                background: pathname === link.href ? "rgba(255,255,255,0.07)" : "transparent",
                transition: "background 0.2s"
              }}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}