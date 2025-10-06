import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../lib/prisma";
import { authOptions } from "../auth/[...nextauth]/authOptions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { role: true },
    });

    const client = await prisma.client.findFirst({
      where: { email: session.user.email },
      select: { id: true },
    });

    return NextResponse.json({
      authenticated: true,
      userId: user?.id ?? null,
      roleId: user?.roleId ?? null,
      role: user?.role?.name ?? null,
      clienteId: client?.id ?? null,
      email: session.user.email,
      name: session.user.name ?? null,
    });
  } catch (e) {
    return NextResponse.json({ authenticated: false, error: e.message }, { status: 500 });
  }
}