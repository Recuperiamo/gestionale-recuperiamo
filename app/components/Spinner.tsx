// @ts-nocheck
"use client";

function AtomIcon({ size = 24 }: { size?: number }) {
  const cx = size / 2, cy = size / 2;
  const rx = size * 0.44, ry = size * 0.16;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} stroke="#4f46e5" strokeWidth={size * 0.06}/>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} stroke="#4f46e5" strokeWidth={size * 0.06} transform={`rotate(60 ${cx} ${cy})`}/>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} stroke="#4f46e5" strokeWidth={size * 0.06} transform={`rotate(-60 ${cx} ${cy})`}/>
      <circle cx={cx} cy={cy} r={size * 0.1} fill="#4f46e5"/>
    </svg>
  );
}

export default function Spinner({ text = "Caricamento...", size = 48 }: { text?: string; size?: number }) {
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
          border: `${size * 0.08}px solid #e0e7ff`,
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
        {/* Atom center */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "rc-pulse 1.7s ease-in-out infinite",
        }}>
          <AtomIcon size={Math.round(size * 0.45)} />
        </div>
      </div>
      {text && (
        <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", letterSpacing: "0.02em" }}>
          {text}
        </span>
      )}
    </div>
  );
}

/** Schermo intero — sfondo #f0f4ff, centrato */
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

/** Variante brand per AuthGuard — atomo grande + nome Recuperiamo */
export function BrandSpinner() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)",
      gap: 20,
    }}>
      {/* Atomo grande animato */}
      <div style={{ position: "relative", width: 72, height: 72 }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: "5px solid #e0e7ff",
        }} />
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: "5px solid transparent",
          borderTopColor: "#4f46e5",
          borderRightColor: "#818cf8",
          animation: "rc-spin 0.9s cubic-bezier(0.4,0,0.2,1) infinite",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "rc-pulse 1.8s ease-in-out infinite",
        }}>
          <AtomIcon size={34} />
        </div>
      </div>
      {/* Pallini rimbalzanti */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 9, height: 9, borderRadius: "50%",
            background: ["#4f46e5", "#818cf8", "#c7d2fe"][i],
            animation: `rc-bounce 1.2s ease-in-out ${i * 0.18}s infinite`,
          }} />
        ))}
      </div>
      <div style={{ color: "#1e1b4b", fontWeight: 700, fontSize: 15, letterSpacing: "0.06em" }}>
        Recuperiamo
      </div>
      <style>{`
        @keyframes rc-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-12px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
