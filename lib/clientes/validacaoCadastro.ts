export interface CadastroClientePayload {
  nome?: unknown;
  email?: unknown;
  senha?: unknown;
}

export type ErrosValidacao = Record<string, string>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENHA_TAMANHO_MINIMO = 8;

function textoValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim().length > 0;
}

/** Valida o payload de cadastro de cliente (nome/e-mail/senha). Mesmo formato de `lib/pedidos/validation.ts`. */
export function validarCadastroCliente(payload: CadastroClientePayload): ErrosValidacao {
  const erros: ErrosValidacao = {};

  if (!textoValido(payload.nome)) {
    erros.nome = "Informe seu nome.";
  }

  if (!textoValido(payload.email) || !EMAIL_REGEX.test(payload.email.trim())) {
    erros.email = "Informe um e-mail válido.";
  }

  if (!textoValido(payload.senha) || payload.senha.length < SENHA_TAMANHO_MINIMO) {
    erros.senha = `A senha deve ter pelo menos ${SENHA_TAMANHO_MINIMO} caracteres.`;
  }

  return erros;
}
