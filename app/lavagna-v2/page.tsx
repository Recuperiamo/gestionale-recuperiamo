"use client";
import { useEffect } from "react";

export default function LavagnaV2Redirect() {
  useEffect(() => { window.location.replace("/lavagna"); }, []);
  return null;
}
