import AulaContent from "../AulaContent";

export default function AulaStudentePage({ params }) {
  const clienteId = Array.isArray(params?.clienteId) ? params.clienteId[0] : params?.clienteId;
  return <AulaContent initialClienteId={clienteId ?? null} />;
}
