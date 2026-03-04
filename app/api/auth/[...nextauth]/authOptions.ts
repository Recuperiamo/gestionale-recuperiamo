// @ts-nocheck
import { prisma } from '../../../lib/prisma';
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { checkRateLimit, resetRateLimit } from '../../lib/loginRateLimiter';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenziali",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "tuo@email.it" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          // 1. Normalizza email
          const normEmail = credentials.email.trim().toLowerCase();

          // 2. Rate limit check
          const rateLimit = checkRateLimit(normEmail);
          if (!rateLimit.allowed) {
            throw new Error(`Troppi tentativi. Riprova tra ${rateLimit.retryAfterMinutes} minuti.`);
          }

          // 3. Recupera utente + ruolo
          const user = await prisma.user.findUnique({
            where: { email: normEmail },
            include: { role: true }
          });

          if (!user || !user.password || !user.role) {
            return null;
          }

          // 4. Verifica password (bcrypt)
          const passwordValid = await bcrypt.compare(credentials.password, user.password);

          if (!passwordValid) {
            return null;
          }

          // 5. Recupera clienteId (associazione per email)
          const cliente = await prisma.client.findFirst({
            where: { email: normEmail },
            select: { id: true }
          });

          // Login riuscito: azzera il contatore
          resetRateLimit(normEmail);

          // 6. Ritorna solo i campi necessari al token
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role.name,
            clienteId: cliente?.id ?? null
          };
        } catch (err) {
          console.error("AUTHORIZE ERROR", err);
          return null;
        }
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
      if (token?.role === "admin" || token?.role === "Admin") {
        return baseUrl + "/";
      }
      return baseUrl + "/profilo";
    }
  },

  pages: {
    signIn: "/signin"
  },
};