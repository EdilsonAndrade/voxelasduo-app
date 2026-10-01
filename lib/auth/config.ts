import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { autorizarCredenciais } from "@/lib/auth/autorizarCredenciais";
import type { PapelUsuario } from "@/lib/models/usuario";

/**
 * Autenticação do painel administrativo (Tarefa 9/EDI-86). Sessão JWT
 * stateless (sem coleção de sessões no Mongo) — decisão validada com o
 * usuário em specs/008-auth-painel-admin/research.md.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        senha: {},
      },
      authorize: autorizarCredenciais,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // EDI-125: papel do usuário (admin | equipe) — usado pelo proxy para restringir a equipe de evento.
        token.papel = (user as { papel?: PapelUsuario }).papel ?? "admin";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.papel = token.papel ?? "admin";
      }
      return session;
    },
  },
});
