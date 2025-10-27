"use client";
import { useSession as useNextAuthSession } from "next-auth/react";
import { useEffect, useRef } from "react";

export function useSession(options) {
  const session = useNextAuthSession(options);
  const status = session.status;
  const lastStatus = useRef(status);

  useEffect(() => {
    if (status !== lastStatus.current) {
      console.log(`[useSession] status changed from ${lastStatus.current} to ${status}`, {
        data: session.data,
      });
      lastStatus.current = status;
    }
  }, [status, session.data]);

  return session;
}
