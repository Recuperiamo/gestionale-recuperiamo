// @ts-nocheck
'use client';

import React from "react";
import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
import PacchettiCardsAdmin from '../components/pacchetti/PacchettiCardsAdmin';

export default function PacchettiPage() {
  return (
    <AuthGuard>
      <Navbar />
      <main style={{ 
        maxWidth: 1400, 
        margin: "60px auto 40px auto",
        padding: "40px 42px 48px",
        background: "#fff",
        borderRadius: 28,
        boxShadow: "0 6px 34px rgba(32,72,154,0.15)",
        fontFamily: "'Inter','Segoe UI',Arial,sans-serif"
      }}>
        <PacchettiCardsAdmin />
      </main>
    </AuthGuard>
  );
}