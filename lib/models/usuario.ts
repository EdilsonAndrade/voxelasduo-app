import type { ObjectId } from "mongodb";

export const USUARIOS_COLLECTION = "usuarios";

/** Administrador do painel (Tarefa 9/EDI-86) — cadastrado via scripts/seed-admin.ts, sem tela de auto-registro. */
export interface Usuario {
  _id?: ObjectId;
  /** Identificador de login; sempre normalizado em minúsculas antes de gravar/comparar. */
  email: string;
  /** Hash bcrypt da senha — nunca armazenar a senha em texto puro. */
  senhaHash: string;
  nome: string;
  criadoEm: Date;
  atualizadoEm: Date;
}
