export interface CheckoutItem {
  produtoId?: unknown;
  quantidade?: unknown;
}

export interface CheckoutPayload {
  idempotencia?: unknown;
  cliente?: {
    nome?: unknown;
    email?: unknown;
    telefone?: unknown;
    endereco?: {
      logradouro?: unknown;
      numero?: unknown;
      complemento?: unknown;
      bairro?: unknown;
      cidade?: unknown;
      estado?: unknown;
      cep?: unknown;
    };
  };
  itens?: unknown;
}

export type ErrosValidacao = Record<string, string>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function textoValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim().length > 0;
}

function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

function quantidadeValida(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 1;
}

/**
 * Valida o payload do checkout (dados do cliente + endereço + itens).
 * Retorna um mapa `campo → mensagem` com chaves no formato "cliente.nome",
 * "cliente.endereco.logradouro", "itens", etc.
 */
export function validarCheckout(payload: CheckoutPayload): ErrosValidacao {
  const erros: ErrosValidacao = {};

  if (!textoValido(payload.idempotencia)) {
    erros.idempotencia = "Envio inválido. Recarregue a página e tente novamente.";
  }

  const cliente = payload.cliente;
  if (typeof cliente !== "object" || cliente === null) {
    erros.cliente = "Informe seus dados.";
    return erros;
  }

  if (!textoValido(cliente.nome)) {
    erros["cliente.nome"] = "Informe seu nome.";
  }

  if (!textoValido(cliente.email) || !EMAIL_REGEX.test(cliente.email.trim())) {
    erros["cliente.email"] = "Informe um e-mail válido.";
  }

  if (cliente.telefone !== undefined && cliente.telefone !== null && cliente.telefone !== "") {
    const digitos = somenteDigitos(String(cliente.telefone));
    if (digitos.length < 10 || digitos.length > 11) {
      erros["cliente.telefone"] = "Informe um telefone válido com DDD.";
    }
  }

  const endereco = cliente.endereco;
  if (typeof endereco !== "object" || endereco === null) {
    erros["cliente.endereco"] = "Informe o endereço de entrega.";
    return erros;
  }

  if (!textoValido(endereco.logradouro)) {
    erros["cliente.endereco.logradouro"] = "Informe a rua.";
  }
  if (!textoValido(endereco.numero)) {
    erros["cliente.endereco.numero"] = "Informe o número.";
  }
  if (!textoValido(endereco.bairro)) {
    erros["cliente.endereco.bairro"] = "Informe o bairro.";
  }
  if (!textoValido(endereco.cidade)) {
    erros["cliente.endereco.cidade"] = "Informe a cidade.";
  }
  if (!textoValido(endereco.estado) || endereco.estado.trim().length !== 2) {
    erros["cliente.endereco.estado"] = "Informe a sigla do estado (ex: SP).";
  }
  const cep = textoValido(endereco.cep) ? somenteDigitos(endereco.cep) : "";
  if (cep.length !== 8) {
    erros["cliente.endereco.cep"] = "Informe um CEP válido com 8 dígitos.";
  }

  if (!Array.isArray(payload.itens) || payload.itens.length === 0) {
    erros.itens = "Seu carrinho está vazio.";
  } else {
    payload.itens.forEach((item, indice) => {
      if (!textoValido(item.produtoId)) {
        erros[`itens[${indice}].produtoId`] = "Item inválido.";
      }
      if (!quantidadeValida(item.quantidade)) {
        erros[`itens[${indice}].quantidade`] = "A quantidade deve ser um número inteiro maior que zero.";
      }
    });
  }

  return erros;
}
