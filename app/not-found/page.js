import Navbar from "../components/Navbar";

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#20489a" }}>
      <Navbar />
      <main
        style={{
          maxWidth: 420,
          margin: "100px auto 0 auto",
          background: "#fff",
          borderRadius: 18,
          padding: "48px 34px 54px 34px",
          boxShadow: "0 4px 20px 0 rgba(32,72,154,0.07)",
          color: "#20489a",
        }}
      >
        <h2 style={{ fontWeight: 700, fontSize: 34, marginBottom: 20, textAlign: "center" }}>
          404
        </h2>
        <div style={{ fontWeight: 600, fontSize: 18, textAlign: "center", marginBottom: 8 }}>
          Pagina non trovata
        </div>
        <div style={{ fontSize: 15, color: "#4268b3", textAlign: "center" }}>
          Torna alla <a href="/" style={{ color: "#1cb0f6", fontWeight: 600, textDecoration: "none" }}>Dashboard</a>
        </div>
      </main>
    </div>
  );
}