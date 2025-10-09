"use client";
import React, { useEffect } from 'react';

/**
 * DebugClientRuntime
 * Intercetta errori runtime globali per aiutare a individuare il chunk sorgente (ReferenceError 'Q').
 * Stampa in console un banner una sola volta e registra window.onerror / unhandledrejection.
 */
export default function DebugClientRuntime() {
  useEffect(() => {
    if (window.__DEBUG_CLIENT_RUNTIME_INSTALLED) return;
    window.__DEBUG_CLIENT_RUNTIME_INSTALLED = true;
    const banner = '[DebugClientRuntime] install global listeners';
    // eslint-disable-next-line no-console
    console.log(banner);

    function onError(event, source, lineno, colno, error) {
      // eslint-disable-next-line no-console
      console.error('[DebugClientRuntime][error]', { message: event?.message, source, lineno, colno, stack: error?.stack });
    }
    function onRejection(ev) {
      // eslint-disable-next-line no-console
      console.error('[DebugClientRuntime][unhandledrejection]', ev?.reason);
    }
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}
