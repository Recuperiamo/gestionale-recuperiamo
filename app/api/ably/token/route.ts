// @ts-nocheck
// Ably rimosso: endpoint disattivato
export async function GET() {
  return new Response(JSON.stringify({ error: 'Ably rimosso. Usa Socket.IO.' }), { status: 410, headers: { 'Content-Type': 'application/json' } });
}