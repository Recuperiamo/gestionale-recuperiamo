"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}