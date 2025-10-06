"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminOnly({ children, redirectTo = "/profilo" }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) throw new Error("Unauthorized");
        const me = await res.json();
        if (!cancelled) {
          if (me?.role === "admin") {
            setAllowed(true);
          } else {
            router.replace(redirectTo);
          }
        }
      } catch {
        if (!cancelled) router.replace("/signin");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, redirectTo]);

  if (loading) {
    return <div style={{ textAlign: "center", padding: 20 }}>Verifica permessi…</div>;
  }
  if (!allowed) return null;

  return <>{children}</>;
}