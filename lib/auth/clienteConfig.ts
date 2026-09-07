import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { autorizarCredenciaisCliente } from "@/lib/auth/autorizarCredenciaisCliente";
import { criarOuUnificarClienteGoogle } from "@/lib/clientes/repository";

/**
 * Autenticação do comprador do site (Tarefa 10/EDI-84) — segunda instância do
 * NextAuth, completamente separada da instância do admin (`lib/auth/config.ts`,
 * Tarefa 9/EDI-86): `basePath`, cookie de sessão e `secret` próprios, sem
 * nenhum estado compartilhado entre os dois domínios (research.md #1).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: "/api/auth/cliente",
  secret: process.env.AUTH_CLIENTE_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/entrar" },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-cliente.session-token"
          : "cliente.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        senha: {},
      },
      authorize: autorizarCredenciaisCliente,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // Unificação por e-mail (research.md #2): login via Google reaproveita
    // ou cria o Cliente e substitui `user.id` pelo `_id` real da coleção
    // `clientes` antes do callback `jwt` rodar para este mesmo sign-in.
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) {
          return false;
        }
        const cliente = await criarOuUnificarClienteGoogle({
          nome: user.name ?? user.email,
          email: user.email,
          googleId: account.providerAccountId,
        });
        user.id = cliente._id!.toString();
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
