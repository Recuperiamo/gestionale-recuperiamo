// @ts-nocheck
"use client";
import { useSession as useNextAuthSession } from "next-auth/react";

export function useSession(options) {
  return useNextAuthSession(options);
}
