/**
 * Funzioni di fetch alle API clienti.
 * Da collegare al backend REST.
 */

const API_URL = "/api/clienti"; // Modifica se backend diverso

export async function fetchClienti() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error("Errore fetch clienti");
  return res.json();
}

export async function creaCliente(cliente) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cliente)
  });
  if (!res.ok) throw new Error("Errore creazione cliente");
  return res.json();
}

export async function updateCliente(cliente) {
  const res = await fetch(`${API_URL}/${cliente.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cliente)
  });
  if (!res.ok) throw new Error("Errore aggiornamento cliente");
  return res.json();
}

export async function deleteCliente(id) {
  const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Errore eliminazione cliente");
  return true;
}