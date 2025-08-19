"use client";
import "../styles/globals.css";
import React from "react";
import { SessionProvider } from "next-auth/react";
import { ClientiProvider } from "@/context/ClientiContext";

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <SessionProvider>
          <ClientiProvider>
            {children}
          </ClientiProvider>
        </SessionProvider>
      </body>
    </html>
  );
}