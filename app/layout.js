import "../styles/globals.css";
import React from "react";
import { Providers } from "./providers";

export const metadata = {
  title: 'Recuperiamo',
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