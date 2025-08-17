/**
 * Tipizzazione/schema e validatore cliente.
 */

export const clienteSchema = {
  nome: "string",
  email: "string",
  telefono: "string"
};

// Esempio di validazione
export function validateClienteData(data) {
  if (!data.nome || !data.email) return false;
  // Validazione più avanzata qui
  return true;
}