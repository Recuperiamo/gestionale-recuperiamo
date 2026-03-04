// @ts-nocheck
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
    // Instrument fetch to capture failures to /api/auth/session (NextAuth client fetch errors)
    try {
      const origFetch = window.fetch;
      window.__DEBUG_CLIENT_ORIG_FETCH = origFetch;
      window.fetch = async function(input, init) {
        try {
          const url = (typeof input === 'string') ? input : input?.url;
          if (url && url.includes('/api/auth/session')) {
            // eslint-disable-next-line no-console
            console.log('[DebugClientRuntime][fetch] calling', url, { init });
          }
          const res = await origFetch.apply(this, arguments);
          if (url && url.includes('/api/auth/session')) {
            // eslint-disable-next-line no-console
            console.log('[DebugClientRuntime][fetch] response', url, { status: res.status, ok: res.ok });
          }
          return res;
        } catch (err) {
          try {
            const url = (typeof input === 'string') ? input : input?.url;
            if (url && url.includes('/api/auth/session')) {
              // eslint-disable-next-line no-console
              console.error('[DebugClientRuntime][fetch][error]', url, err && err.message, err);
            }
          } catch (e) {
            // ignore
          }
          throw err;
        }
      };
    } catch (e) {
      // ignore instrumentation failures
    }
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      // restore original fetch if we replaced it
      try {
        if (window.__DEBUG_CLIENT_ORIG_FETCH) {
          window.fetch = window.__DEBUG_CLIENT_ORIG_FETCH;
          delete window.__DEBUG_CLIENT_ORIG_FETCH;
        }
      } catch (e) {
        // ignore
      }
    };
  }, []);
  return null;
}
