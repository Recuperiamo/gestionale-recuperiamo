'use client';

import React from "react";
import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
import PacchettiList from '../components/pacchetti/PacchettiList';

export default function PacchettiPage() {
  return (
    <AuthGuard>
      <Navbar />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <PacchettiList />
      </main>
    </AuthGuard>
  );
}