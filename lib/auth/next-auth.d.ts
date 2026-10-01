import type { PapelUsuario } from "@/lib/models/usuario";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      papel?: PapelUsuario;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    papel?: PapelUsuario;
  }
}
