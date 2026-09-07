import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import type { Cliente } from "@/lib/models/cliente";
import { definirCodigoVerificacao, marcarEmailVerificado } from "./repository";

const CODIGO_TAMANHO = 6;
const VALIDADE_MINUTOS = 10;
const SALT_ROUNDS = 10;

function gerarCodigoNumerico(): string {
  return randomInt(0, 10 ** CODIGO_TAMANHO).toString().padStart(CODIGO_TAMANHO, "0");
}

/**
 * Gera um código de verificação de e-mail (6 dígitos, válido por 10 minutos
 * — pedido explícito de correção pós-EDI-84) e grava no cliente,
 * sobrescrevendo qualquer código anterior. Retorna o código em texto puro
 * para envio por e-mail (nunca persistido em texto puro).
 */
export async function gerarCodigoVerificacao(cliente: Cliente): Promise<string> {
  const codigo = gerarCodigoNumerico();
  const codigoHash = await bcrypt.hash(codigo, SALT_ROUNDS);
  const expiraEm = new Date(Date.now() + VALIDADE_MINUTOS * 60 * 1000);

  await definirCodigoVerificacao(cliente._id!, { codigoHash, expiraEm });

  return codigo;
}

/**
 * Valida o código informado contra o `cliente` (deve ser lido do banco
 * imediatamente antes desta chamada, para refletir o código mais recente).
 */
export async function validarCodigoVerificacao(cliente: Cliente, codigo: string): Promise<boolean> {
  const verificacao = cliente.verificacaoEmail;
  if (!verificacao) {
    return false;
  }
  if (verificacao.expiraEm.getTime() < Date.now()) {
    return false;
  }
  // .trim() — proteção contra espaço/quebra de linha ao colar o código do e-mail.
  return bcrypt.compare(codigo.trim(), verificacao.codigoHash);
}

/** Confirma a posse do e-mail e invalida o código de verificação usado. */
export async function confirmarVerificacaoEmail(cliente: Cliente): Promise<void> {
  await marcarEmailVerificado(cliente._id!);
}
