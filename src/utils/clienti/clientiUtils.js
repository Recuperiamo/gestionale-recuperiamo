/**
 * Utility e validazione per clienti.
 */

export function validateCliente(cliente) {
  if (!cliente.nome) return "Nome obbligatorio";
  if (!cliente.email) return "Email obbligatoria";
  // Regex semplice email
  if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(cliente.email)) return "Email non valida";
  return null;
}