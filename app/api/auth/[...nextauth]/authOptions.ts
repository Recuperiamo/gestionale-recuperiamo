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
        try {
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

          // --- Diagnostic logs per debugging encoding/characters ---
          try {
            console.log("USER.PASSWORD (raw)", user.password);
            console.log("USER.PASSWORD (json)", JSON.stringify(user.password));
            console.log("USER.PASSWORD LENGTH", user.password.length);
            // mostra hex bytes per evidenziare caratteri non ASCII / invisibili
            console.log("USER.PASSWORD HEX", Buffer.from(user.password, 'utf8').toString('hex'));
            // anche l'hash ricevuto dal client (per sicurezza)
            console.log("ATTEMPTED PASSWORD (raw)", credentials.password);
            console.log("ATTEMPTED PASSWORD (json)", JSON.stringify(credentials.password));
            console.log("ATTEMPTED PASSWORD LENGTH", credentials.password.length);
            console.log("ATTEMPTED PASSWORD HEX", Buffer.from(credentials.password, 'utf8').toString('hex'));
          } catch (err) {
            console.log("ERROR logging password diagnostics", err);
          }

          // 3. Verifica password (bcrypt) sia async che sync per confrontare comportamenti
          let passwordValidAsync = false;
          let passwordValidSync = false;
          try {
            passwordValidAsync = await bcrypt.compare(credentials.password, user.password);
          } catch (err) {
            console.log("BCRYPT compare async error", err);
          }
          try {
            passwordValidSync = bcrypt.compareSync(credentials.password, user.password);
          } catch (err) {
            console.log("BCRYPT compareSync error", err);
          }
          console.log("PASSWORD VALID? async=", passwordValidAsync, " sync=", passwordValidSync);

          if (!passwordValidAsync && !passwordValidSync) {
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

  debug: true,
};