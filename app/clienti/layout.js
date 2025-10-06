export const metadata = {
  title: "Clienti",
  description: "Gestione clienti"
};

export default function ClientiLayout({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f8ff" }}>
      {children}
    </div>
  );
}