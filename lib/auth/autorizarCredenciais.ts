import bcrypt from "bcryptjs";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { limparFalhasLogin, loginBloqueado, registrarFalhaLogin } from "@/lib/auth/limiteTentativas";
import { USUARIOS_COLLECTION, type PapelUsuario, type Usuario } from "@/lib/models/usuario";

export interface UsuarioAutenticado {
  id: string;
  email: string;
  name: string;
  papel: PapelUsuario;
}

/**
 * Lógica do Credentials provider (Tarefa 9/EDI-86), extraída do NextAuth
 * config para poder ser testada isoladamente (o objeto retornado por
 * `NextAuth(...)` não re-exporta o `authorize` dos providers).
 * Nunca indica qual dos dois campos (e-mail/senha) está incorreto — retorna
 * `null` para qualquer combinação inválida (FR-004).
 *
 * EDI-125: o campo `email` também aceita o login curto da equipe de evento
 * (sem "@", ex.: "malu"), e as tentativas erradas são limitadas por identificador.
 */
export async function autorizarCredenciais(
  credentials: Partial<Record<"email" | "senha", unknown>> | undefined
): Promise<UsuarioAutenticado | null> {
  const identificador = String(credentials?.email ?? "")
    .trim()
    .toLowerCase();
  const senha = String(credentials?.senha ?? "");

  if (!identificador || !senha) {
    return null;
  }

  if (await loginBloqueado(identificador)) {
    return null;
  }

  const filtro = identificador.includes("@")
    ? { email: identificador }
    : { usuario: identificador, papel: "equipe" as const };

  const client = await getMongoClient();
  const usuario = await client
    .db(DB_NAME)
    .collection<Usuario>(USUARIOS_COLLECTION)
    .findOne(filtro);

  const senhaValida = usuario ? await bcrypt.compare(senha, usuario.senhaHash) : false;
  if (!usuario || !senhaValida) {
    await registrarFalhaLogin(identificador);
    return null;
  }

  await limparFalhasLogin(identificador);

  return {
    id: usuario._id!.toString(),
    email: usuario.email,
    name: usuario.nome,
    papel: usuario.papel ?? "admin",
  };
}
