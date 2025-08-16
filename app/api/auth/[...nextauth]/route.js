import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs"; // opzionale per hash password

const prisma = new PrismaClient();

export default NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Ricerca utente in base all'email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { role: true },
        });
        if (!user || !user.password) return null;

        // Confronto password (qui senza hash, da migliorare in produzione)
        const isValid = credentials.password === user.password;
        // Per hash: const isValid = await compare(credentials.password, user.password);

        if (!isValid) return null;

        // User object deve avere id, email, name e ruolo
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role?.name,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token, user }) {
      // Aggiungi il ruolo alla sessione per uso lato FE
      if (user) {
        session.user.role = user.role;
        session.user.id = user.id;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    // Altre pagine personalizzate se necessario
  },
  // (Opzionale) debug: true,
});