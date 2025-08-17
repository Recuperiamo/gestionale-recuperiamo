import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/utils/prisma";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";

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
    async jwt({ token, user }: { token: JWT; user?: any }) {
      if (user) {
        token.role = user.role;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token) {
        // @ts-ignore
        session.user.role = token.role;
        // @ts-ignore
        session.user.name = token.name;
      }
      return session;
    },
    async redirect({ url, baseUrl, token }: { url: string; baseUrl: string; token?: JWT }) {
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