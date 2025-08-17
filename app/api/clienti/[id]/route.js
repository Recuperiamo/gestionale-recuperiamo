
import { NextResponse } from "next/server";
import { getClientiData } from "../_lib/data"; // Adatta il path se necessario

export async function GET(request, { params }) {
  const { id } = params;
  const clienti = await getClientiData();
  const cliente = clienti.find(c => String(c.id) === String(id));
  if (!cliente) {
    return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });
  }
  return NextResponse.json(cliente);
}