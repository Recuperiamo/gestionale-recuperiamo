"use client";
import { useEffect } from "react";

export default function LavagnaV2CanvasRedirect() {
  useEffect(() => {
    window.location.replace("/lavagna/canvas" + window.location.search);
  }, []);
  return null;
}
