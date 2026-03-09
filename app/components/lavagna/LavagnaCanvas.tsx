// @ts-nocheck
"use client";
/**
 * LavagnaCanvas — wrapper con dynamic import (no SSR) per Next.js App Router.
 * L'implementazione reale è in LavagnaCanvasClient.tsx.
 */
import dynamic from "next/dynamic";

const LavagnaCanvasClient = dynamic(
  () => import("./LavagnaCanvasClient"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          minHeight: 300,
          background: "#f5f8ff",
          color: "#20489a",
          fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Caricamento lavagna…
      </div>
    ),
  }
);

export default function LavagnaCanvas(props) {
  return <LavagnaCanvasClient {...props} />;
}
