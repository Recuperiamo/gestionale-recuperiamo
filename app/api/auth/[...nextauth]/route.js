import NextAuth from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

const prisma = new PrismaClient();

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Logica per validare utente (modifica secondo il tuo schema)
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });
        if (user && await compare(credentials.password, user.password)) {
          return { id: user.id, email: user.email };
        }
        return null;
      }
    })
    // Puoi aggiungere altri provider (Google, GitHub, ecc.) qui
  ],
  // ...altre opzioni NextAuth (es: session, pages, callbacks)
});

export { handler as GET, handler as POST };