export interface EncomendaPayload {
  nome?: unknown;
  email?: unknown;
  telefone?: unknown;
  descricao?: unknown;
}

export const IMAGENS_QUANTIDADE_MAXIMA = 3;
export const IMAGEM_TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5MB
export const IMAGEM_TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

export type ErrosValidacao = Record<string, string>;

export const DESCRICAO_TAMANHO_MINIMO = 10;
export const DESCRICAO_TAMANHO_MAXIMO = 2000;
const NOME_TAMANHO_MAXIMO = 120;
const EMAIL_TAMANHO_MAXIMO = 254;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function textoValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim().length > 0;
}

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Valida o formulário de encomenda — nome, e-mail, telefone e descrição são obrigatórios. */
export function validarEncomenda(payload: EncomendaPayload): ErrosValidacao {
  const erros: ErrosValidacao = {};

  if (!textoValido(payload.nome)) {
    erros.nome = "Informe seu nome.";
  } else if (payload.nome.trim().length > NOME_TAMANHO_MAXIMO) {
    erros.nome = `O nome deve ter no máximo ${NOME_TAMANHO_MAXIMO} caracteres.`;
  }

  if (
    !textoValido(payload.email) ||
    payload.email.trim().length > EMAIL_TAMANHO_MAXIMO ||
    !EMAIL_REGEX.test(payload.email.trim())
  ) {
    erros.email = "Informe um e-mail válido.";
  }

  if (!textoValido(payload.telefone)) {
    erros.telefone = "Informe um telefone para contato.";
  } else {
    const digitos = somenteDigitos(payload.telefone);
    if (digitos.length < 10 || digitos.length > 11) {
      erros.telefone = "Informe um telefone válido com DDD.";
    }
  }

  if (!textoValido(payload.descricao)) {
    erros.descricao = "Conte o que você gostaria de encomendar.";
  } else {
    const tamanho = payload.descricao.trim().length;
    if (tamanho < DESCRICAO_TAMANHO_MINIMO) {
      erros.descricao = `Descreva um pouco mais (mínimo ${DESCRICAO_TAMANHO_MINIMO} caracteres).`;
    } else if (tamanho > DESCRICAO_TAMANHO_MAXIMO) {
      erros.descricao = `A descrição deve ter no máximo ${DESCRICAO_TAMANHO_MAXIMO} caracteres.`;
    }
  }

  return erros;
}

/** Imagens de referência (opcionais) — até 3, JPEG/PNG/WebP, 5MB cada. Retorna a mensagem de erro ou `undefined`. */
export function validarImagensEncomenda(arquivos: { type: string; size: number }[]): string | undefined {
  if (arquivos.length > IMAGENS_QUANTIDADE_MAXIMA) {
    return `Envie no máximo ${IMAGENS_QUANTIDADE_MAXIMA} imagens.`;
  }
  if (arquivos.some((arquivo) => !IMAGEM_TIPOS_ACEITOS.includes(arquivo.type))) {
    return "Formato de imagem não suportado. Envie arquivos JPEG, PNG ou WebP.";
  }
  if (arquivos.some((arquivo) => arquivo.size > IMAGEM_TAMANHO_MAXIMO_BYTES)) {
    return "Cada imagem deve ter no máximo 5MB.";
  }
  return undefined;
}
