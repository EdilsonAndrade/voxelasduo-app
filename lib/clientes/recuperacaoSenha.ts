import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import type { Cliente } from "@/lib/models/cliente";
import { definirCodigoRecuperacao, redefinirSenhaCliente } from "./repository";

const CODIGO_TAMANHO = 6;
const VALIDADE_MINUTOS = 20;
const SALT_ROUNDS = 10;

/** `randomInt` (CSPRNG) em vez de `Math.random()` — o código autentica a troca de senha. */
function gerarCodigoNumerico(): string {
  return randomInt(0, 10 ** CODIGO_TAMANHO).toString().padStart(CODIGO_TAMANHO, "0");
}

/**
 * Gera um novo código de recuperação de senha (6 dígitos, válido por
 * `VALIDADE_MINUTOS`) e o grava no cliente — sobrescreve/invalida qualquer
 * código anterior automaticamente, por ser um único campo (research.md #3).
 * Retorna o código em texto puro, para ser enviado por e-mail (nunca
 * persistido em texto puro — só o hash é gravado).
 */
export async function gerarCodigoRecuperacao(cliente: Cliente): Promise<string> {
  const codigo = gerarCodigoNumerico();
  const codigoHash = await bcrypt.hash(codigo, SALT_ROUNDS);
  const expiraEm = new Date(Date.now() + VALIDADE_MINUTOS * 60 * 1000);

  await definirCodigoRecuperacao(cliente._id!, { codigoHash, expiraEm });

  return codigo;
}

/**
 * Valida o código informado contra o `cliente` (deve ser lido do banco
 * imediatamente antes desta chamada, para refletir o código mais recente).
 */
export async function validarCodigoRecuperacao(cliente: Cliente, codigo: string): Promise<boolean> {
  const recuperacao = cliente.recuperacaoSenha;
  if (!recuperacao) {
    return false;
  }
  if (recuperacao.expiraEm.getTime() < Date.now()) {
    return false;
  }
  // .trim() — proteção contra espaço/quebra de linha ao colar o código do e-mail.
  return bcrypt.compare(codigo.trim(), recuperacao.codigoHash);
}

/** Define a nova senha do cliente e invalida o código de recuperação usado. */
export async function definirNovaSenha(cliente: Cliente, novaSenha: string): Promise<void> {
  const senhaHash = await bcrypt.hash(novaSenha, SALT_ROUNDS);
  await redefinirSenhaCliente(cliente._id!, senhaHash);
}
