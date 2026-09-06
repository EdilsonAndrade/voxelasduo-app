import bcrypt from "bcryptjs";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { USUARIOS_COLLECTION, type Usuario } from "@/lib/models/usuario";

export interface UsuarioAutenticado {
  id: string;
  email: string;
  name: string;
}

/**
 * Lógica do Credentials provider (Tarefa 9/EDI-86), extraída do NextAuth
 * config para poder ser testada isoladamente (o objeto retornado por
 * `NextAuth(...)` não re-exporta o `authorize` dos providers).
 * Nunca indica qual dos dois campos (e-mail/senha) está incorreto — retorna
 * `null` para qualquer combinação inválida (FR-004).
 */
export async function autorizarCredenciais(
  credentials: Partial<Record<"email" | "senha", unknown>> | undefined
): Promise<UsuarioAutenticado | null> {
  const email = String(credentials?.email ?? "")
    .trim()
    .toLowerCase();
  const senha = String(credentials?.senha ?? "");

  if (!email || !senha) {
    return null;
  }

  const client = await getMongoClient();
  const usuario = await client
    .db(DB_NAME)
    .collection<Usuario>(USUARIOS_COLLECTION)
    .findOne({ email });

  if (!usuario) {
    return null;
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
  if (!senhaValida) {
    return null;
  }

  return {
    id: usuario._id!.toString(),
    email: usuario.email,
    name: usuario.nome,
  };
}
