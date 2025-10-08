// @ts-nocheck
import { prisma } from '../../../lib/prisma';
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

/**
 * NOTE:
 * - La registrazione crea User con role 'cliente' se la email corrisponde a un Client.
 * - Qui normalizziamo sempre l'email (trim+lowercase) per evitare mismatch.
 * - Propaghiamo clienteId così gli endpoint /api/attivita possono filtrare in sicurezza.
 * - Se in futuro servirà bloccare login senza pacchetto attivo, vedere snippet commentato sotto.
 */

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
          return null;
        }

        // 1. Normalizza email
        const normEmail = credentials.email.trim().toLowerCase();

        // 2. Recupera utente + ruolo
        const user = await prisma.user.findUnique({
          where: { email: normEmail },
          include: { role: true }
        });
        if (!user || !user.password || !user.role) {
            return null;
        }

        // 3. Verifica password (bcrypt)
        const passwordValid = await bcrypt.compare(credentials.password, user.password);
        if (!passwordValid) {
          return null;
        }

        // 4. Recupera clienteId (associazione per email)
        //    Se usi un legame diverso (es. user -> cliente FK diretta), sostituisci questa query.
        const cliente = await prisma.client.findFirst({
          where: { email: normEmail },
          select: { id: true }
        });

        // (Opzionale) Controllo pacchetto attivo - DISABILITATO per ora
        /*
        if (user.role.name === 'cliente' && cliente?.id) {
          const hasActive = await prisma.pacchettoOre.findFirst({
            where: {
              clienteId: cliente.id,
              stato: 'attivo',
              OR: [
                { dataScadenza: null },
                { dataScadenza: { gt: new Date() } }
              ]
            },
            select: { id: true }
          });
          if (!hasActive) {
            // Se vuoi bloccare login cliente senza pacchetti attivi, decommenta il return null
            // return null;
          }
        }
        */

        // 5. Ritorna solo i campi necessari al token
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
          clienteId: cliente?.id ?? null
        };
      }
    })
  ],

  session: {
    strategy: "jwt"
  },

  callbacks: {
    /**
     * jwt: copia i dati dell'utente (prima autenticazione) nel token
     * Token rimarrà sorgente per la session successiva.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id?.toString?.() ?? user.id;
        token.role = user.role;
        token.name = user.name;
        token.clienteId = user.clienteId ?? null;
      }
      return token;
    },

    /**
     * session: arricchisce la sessione inviata al client (browser)
     */
    async session({ session, token }) {
      if (token) {
        // Assicura oggetto session.user
        session.user = session.user || {};
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.name = token.name;
        session.user.clienteId = token.clienteId ?? null;
      }
      return session;
    },

    /**
     * redirect: differenzia admin vs clienti
     */
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

  // (Opzionale) Eventi next-auth se desideri logging:
  /**
   * events: {
   *   signIn(message) { console.log('SIGNIN', message); },
   *   signOut(message) { console.log('SIGNOUT', message); },
   *   error(error) { console.error('AUTH ERROR', error); }
   * },
   */

  // AGGIUNGI QUESTA RIGA QUI SOTTO (debug attivo sempre)
  debug: true,
};