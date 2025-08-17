import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <main>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 48, fontWeight: 700, color: "#4268b3", margin: 0 }}>404</h1>
          <div style={{ fontSize: 20, margin: "16px 0" }}>
            Pagina non trovata
          </div>
          <div style={{ fontSize: 15, color: "#4268b3", textAlign: "center" }}>
            Torna alla{" "}
            <Link href="/" style={{ color: "#1cb0f6", fontWeight: 600, textDecoration: "none" }}>
              Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}