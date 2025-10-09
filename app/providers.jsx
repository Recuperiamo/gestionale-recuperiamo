"use client";
import React from 'react';
import { SessionProvider } from 'next-auth/react';
import DebugClientRuntime from './components/debug/DebugClientRuntime';

export function Providers({ children }) {
  return (
    <SessionProvider>
      <DebugClientRuntime />
      {children}
    </SessionProvider>
  );
}
