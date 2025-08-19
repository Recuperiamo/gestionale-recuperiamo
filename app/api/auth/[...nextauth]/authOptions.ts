// @ts-nocheck
import { prisma } from '@/lib/prisma';
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "tuo@email.it" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { role: true }
        });

        if (!user || !user.password) return null;
        const passwordValid = await bcrypt.compare(credentials.password, user.password);

        if (!passwordValid || !user.role) return null;

        // Propaga solo i dati necessari
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name
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
        token.role = user.role;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role;
        session.user.name = token.name;
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
  }
};