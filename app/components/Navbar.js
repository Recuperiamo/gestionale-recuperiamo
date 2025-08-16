"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const navLinks = [
  { href: "/", label: "Dashboard", auth: true },
  { href: "/profile", label: "Profilo", auth: true },
  { href: "/settings", label: "Impostazioni", auth: true }
];

const primary = "#20489a";
const accent = "#1cb0f6";
const white = "#fff";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

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
        {navLinks
          .filter(link => (session ? true : !link.auth))
          .map((link) => (
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
        <li>
          {session ? (
            <button
              onClick={() => signOut({ callbackUrl: "/signin" })}
              style={{
                background: accent,
                color: white,
                fontWeight: 700,
                border: "none",
                borderRadius: 7,
                padding: "7px 19px",
                fontSize: 15,
                cursor: "pointer"
              }}
            >
              Logout
            </button>
          ) : (
            <Link
              href="/signin"
              style={{
                background: accent,
                color: white,
                fontWeight: 700,
                border: "none",
                borderRadius: 7,
                padding: "7px 19px",
                fontSize: 15,
                textDecoration: "none"
              }}
            >
              Login
            </Link>
          )}
        </li>
      </ul>
    </nav>
  );
}