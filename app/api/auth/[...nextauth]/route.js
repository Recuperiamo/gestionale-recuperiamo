import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenziali",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const normEmail = credentials.email.trim().toLowerCase();
        // Recupera utente
        const user = await prisma.user.findUnique({
          where: { email: normEmail },
          include: { role: true }
        });
        if (!user || !user.password) return null;
        // Verifica password
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        // Recupera clienteId per email
        const cliente = await prisma.client.findFirst({
          where: { email: normEmail },
          select: { id: true }
        });
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role?.name || user.role,
          clienteId: cliente?.id ?? null
        };
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.clienteId = user.clienteId ?? null;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user) session.user = {};
      session.user.id = token.id ?? session.user.id ?? token.sub ?? null;
      session.user.role = token.role ?? session.user.role ?? null;
      session.user.clienteId = token.clienteId ?? session.user.clienteId ?? null;
      session.user.name = token.name ?? session.user.name ?? null;
      return session;
    }
  },
  pages: {
    signIn: "/signin"
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };