import type { ObjectId } from "mongodb";

export const USUARIOS_COLLECTION = "usuarios";

export type PapelUsuario = "admin" | "equipe";

/** Administrador do painel (Tarefa 9/EDI-86) — cadastrado via scripts/seed-admin.ts, sem tela de auto-registro. */
export interface Usuario {
  _id?: ObjectId;
  /** Identificador de login; sempre normalizado em minúsculas antes de gravar/comparar. */
  email: string;
  /** Hash bcrypt da senha — nunca armazenar a senha em texto puro. */
  senhaHash: string;
  nome: string;
  /** Ausente = "admin" (usuários anteriores ao EDI-125). "equipe" só acessa os pedidos de evento. */
  papel?: PapelUsuario;
  /** Login curto da equipe (ex.: "malu"); minúsculo. Só existe para papel "equipe". */
  usuario?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}
