// @ts-nocheck
import "../styles/globals.css";
import React from "react";
import { Providers } from "./providers";

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata = {
  title: 'Recuperiamo',
  description: 'Gestionale Recuperiamo — lezioni, quiz e pacchetti ore',
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}