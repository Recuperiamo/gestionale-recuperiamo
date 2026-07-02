// @ts-nocheck
"use client";

export default function Spinner({ text = "Caricamento...", size = 48 }: { text?: string; size?: number }) {
  const r = size / 2;
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 16, padding: 40,
    }}>
      <div style={{ position: "relative", width: size, height: size }}>
        {/* Track */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          border: `${size * 0.08}px solid #e5e7eb`,
        }} />
        {/* Spinning arc */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          border: `${size * 0.08}px solid transparent`,
          borderTopColor: "#4f46e5",
          borderRightColor: "#818cf8",
          animation: "rc-spin 0.85s cubic-bezier(0.4,0,0.2,1) infinite",
        }} />
        {/* Center icon */}
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "rc-pulse 1.7s ease-in-out infinite",
          fontSize: size * 0.38,
          lineHeight: 1,
        }}>
          📚
        </div>
      </div>
      {text && (
        <span style={{
          fontSize: 13, fontWeight: 600, color: "#6b7280",
          letterSpacing: "0.02em",
        }}>
          {text}
        </span>
      )}
    </div>
  );
}

/** Versione a schermo pieno — wrappa Spinner in un div che occupa tutta la viewport */
export function FullPageSpinner({ text }: { text?: string }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "#f0f4ff",
    }}>
      <Spinner text={text} size={56} />
    </div>
  );
}
