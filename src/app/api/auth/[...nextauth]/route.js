import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions = {
  debug: true,
  logger: {
    error(code, ...message) {
      console.error("NEXTAUTH ERROR:", code, ...message);
    },
    warn(code, ...message) {
      console.warn("NEXTAUTH WARN:", code, ...message);
    },
    debug(code, ...message) {
      console.log("NEXTAUTH DEBUG:", code, ...message);
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("DEBUG authorize - credentials:", credentials);
        if (!credentials?.email || !credentials?.password) {
          console.log("MANCANO CREDENZIALI");
          return null;
        }
        // Include il ruolo nella query
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { role: true }, // Ricava l'oggetto ruolo associato
        });
        if (!user) {
          console.log("UTENTE NON TROVATO");
          return null;
        }
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) {
          console.log("PASSWORD NON VALIDA");
          return null;
        }
        console.log("LOGIN OK:", user.email, "RUOLO:", user.role?.name);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role?.name, // Passa il nome del ruolo, non l'oggetto intero
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
  },
  callbacks: {
    async session({ session, token }) {
      console.log("DEBUG session callback", session, token);
      if (token && session.user) {
        session.user.role = token.role || null;
      }
      return session;
    },
    async jwt({ token, user }) {
      console.log("DEBUG jwt callback", token, user);
      if (user && user.role) {
        token.role = user.role;
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      console.log("DEBUG redirect callback (forzato su /)", url, baseUrl);
      return `${baseUrl}/`; // Forza sempre la home dopo login
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };