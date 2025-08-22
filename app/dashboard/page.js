'use client';

import React from 'react';
import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
// ...altri import esistenti qui...

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Navbar />
      {/* resto dashboard */}
    </AuthGuard>
  );
}
