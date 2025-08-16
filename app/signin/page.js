import Navbar from "../components/Navbar";

export default function SignInPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#20489a" }}>
      <Navbar />
      <main
        style={{
          maxWidth: 420,
          margin: "70px auto 0 auto",
          background: "#fff",
          borderRadius: 18,
          padding: "40px 34px 34px 34px",
          boxShadow: "0 4px 20px 0 rgba(32,72,154,0.07)",
          color: "#20489a",
        }}
      >
        <h2 style={{ fontWeight: 700, fontSize: 27, marginBottom: 16, textAlign: "center" }}>
          Accedi al tuo account
        </h2>
        <form autoComplete="off">
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontWeight: 600, fontSize: 16, marginBottom: 6, display: "block" }}>
              Email
            </label>
            <input
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 16,
                borderRadius: 7,
                border: "1.5px solid #dbe4f1",
                outline: "none",
              }}
              placeholder="tuo@email.it"
              type="email"
              name="email"
              autoComplete="username"
              disabled
            />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label style={{ fontWeight: 600, fontSize: 16, marginBottom: 6, display: "block" }}>
              Password
            </label>
            <input
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 16,
                borderRadius: 7,
                border: "1.5px solid #dbe4f1",
                outline: "none",
              }}
              placeholder="••••••••"
              type="password"
              name="password"
              autoComplete="current-password"
              disabled
            />
          </div>
          <button
            type="button"
            style={{
              background: "#1cb0f6",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              padding: "12px 0",
              border: "none",
              borderRadius: 7,
              cursor: "not-allowed",
              width: "100%",
              opacity: 0.7
            }}
            disabled
          >
            Accedi
          </button>
        </form>
        <div style={{ marginTop: 18, fontSize: 14, color: "#4268b3", textAlign: "center" }}>
          Non hai un account? <span style={{ color: "#1cb0f6", fontWeight: 600 }}>Contatta l'amministratore</span>
        </div>
      </main>
    </div>
  );
}