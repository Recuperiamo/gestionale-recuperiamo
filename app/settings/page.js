import Navbar from "../components/Navbar";

export default function SettingsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#20489a" }}>
      <Navbar />
      <main
        style={{
          maxWidth: 420,
          margin: "60px auto 0 auto",
          background: "#fff",
          borderRadius: 18,
          padding: "38px 34px 34px 34px",
          boxShadow: "0 4px 20px 0 rgba(32,72,154,0.07)",
          color: "#20489a",
        }}
      >
        <h2 style={{ fontWeight: 700, fontSize: 26, marginBottom: 18, textAlign: "center" }}>
          Impostazioni
        </h2>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>
          (Placeholder) Qui potrai modificare le impostazioni del tuo account e delle notifiche.
        </div>
        <div style={{ fontSize: 15, color: "#4268b3", marginTop: 26 }}>
          Funzionalità avanzate in arrivo...
        </div>
      </main>
    </div>
  );
}