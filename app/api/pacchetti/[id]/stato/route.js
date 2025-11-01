import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/authOptions";
import prisma from "../../../../../lib/prisma";

/**
 * PATCH /api/pacchetti/[id]/stato
 * Aggiorna lo stato di un pacchetto (solo admin)
 * Body: { stato: "attivo" | "sospeso" | "archiviato" }
 */
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('[STATO] Session:', session);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    
    console.log('[STATO] User role:', dbUser?.role);

    if (!dbUser || dbUser.role !== "admin") {
      return NextResponse.json({ 
        error: "Non autorizzato - Accesso riservato agli amministratori",
        role: dbUser?.role 
      }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { stato } = body;

    if (!["attivo", "sospeso", "archiviato"].includes(stato)) {
      return NextResponse.json(
        { error: "Stato non valido. Valori ammessi: attivo, sospeso, archiviato" },
        { status: 400 }
      );
    }

    const pacchetto = await prisma.pacchettoOre.update({
      where: { id: parseInt(id) },
      data: { stato }
    });

    return NextResponse.json(pacchetto);
  } catch (error) {
    console.error("Errore aggiornamento stato pacchetto:", error);
    return NextResponse.json(
      { error: "Errore aggiornamento stato" },
      { status: 500 }
    );
  }
}
