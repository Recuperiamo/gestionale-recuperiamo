// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

const prisma = new PrismaClient();

const noteInclude = {
  cliente: { select: { id: true, nomeReferente: true, email: true } },
};

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  const id = Number(params.id);
  const body = await request.json();
  const { testo, clienteId, data, dataFine, colore } = body;

  const nota = await prisma.nota.update({
    where: { id },
    data: {
      ...(testo !== undefined && { testo: testo.trim() }),
      ...(clienteId !== undefined && { clienteId: clienteId ? Number(clienteId) : null }),
      ...(data !== undefined && { data: data ? new Date(data) : null }),
      ...(dataFine !== undefined && { dataFine: dataFine ? new Date(dataFine) : null }),
      ...(colore !== undefined && { colore }),
    },
    include: noteInclude,
  });
  return Response.json(nota);
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  const id = Number(params.id);
  await prisma.nota.delete({ where: { id } });
  return Response.json({ ok: true });
}
