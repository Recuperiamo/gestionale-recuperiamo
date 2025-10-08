// @ts-nocheck
import { prisma } from '../../../lib/prisma';
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenziali",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "tuo@email.it" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("NO EMAIL OR PASSWORD", credentials);
          return null;
        }

        // 1. Normalizza email
        const normEmail = credentials.email.trim().toLowerCase();
        console.log("NORM EMAIL", normEmail);

        // 2. Recupera utente + ruolo
        const user = await prisma.user.findUnique({
          where: { email: normEmail },
          include: { role: true }
        });
        console.log("USER FOUND", user);

        if (!user) {
          console.log("NO USER FOUND", normEmail);
          return null;
        }
        if (!user.password) {
          console.log("NO PASSWORD FIELD IN USER", user);
          return null;
        }
        if (!user.role) {
          console.log("NO ROLE FOUND IN USER", user);
          return null;
        }

        // 3. Verifica password (bcrypt)
        const passwordValid = await bcrypt.compare(credentials.password, user.password);
        console.log("PASSWORD VALID?", passwordValid);

        if (!passwordValid) {
          console.log("PASSWORD INVALID", { user, attempted: credentials.password });
          return null;
        }

        // 4. Recupera clienteId (associazione per email)
        const cliente = await prisma.client.findFirst({
          where: { email: normEmail },
          select: { id: true }
        });
        console.log("CLIENTE FOUND", cliente);

        // 5. Ritorna solo i campi necessari al token
        const ret = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
          clienteId: cliente?.id ?? null
        };
        console.log("RETURNING USER OBJECT TO NEXTAUTH", ret);
        return ret;
      }
    })
  ],

  session: {
    strategy: "jwt"
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id?.toString?.() ?? user.id;
        token.role = user.role;
        token.name = user.name;
        token.clienteId = user.clienteId ?? null;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user = session.user || {};
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.name = token.name;
        session.user.clienteId = token.clienteId ?? null;
      }
      return session;
    },

    async redirect({ url, baseUrl, token }) {
      if (token?.role === "admin") {
        return baseUrl + "/";
      }
      return baseUrl + "/profilo";
    }
  },

  pages: {
    signIn: "/signin"
  },

  debug: true,
};