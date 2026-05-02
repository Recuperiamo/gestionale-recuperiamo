"use client";
import { useEffect } from "react";

export default function LavagnaFullRedirect() {
  useEffect(() => {
    window.location.replace("/lavagna/canvas" + window.location.search);
  }, []);
  return null;
}
