"use client";
import "../styles/globals.css";
import React from "react";
import { SessionProvider } from "next-auth/react";
import DebugClientRuntime from "./components/debug/DebugClientRuntime";


export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <SessionProvider>
          <DebugClientRuntime />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}