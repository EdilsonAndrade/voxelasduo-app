export interface ProdutoPayload {
  nome?: unknown;
  descricao?: unknown;
  preco?: unknown;
  estoque?: unknown;
  categoria?: unknown;
  fotos?: unknown;
}

export type ErrosValidacao = Record<string, string>;

function textoValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim().length > 0;
}

/**
 * Valida o payload de criação/edição de produto.
 * `parcial: true` (edição via PATCH) só valida os campos presentes no payload.
 */
export function validarProduto(
  payload: ProdutoPayload,
  { parcial = false }: { parcial?: boolean } = {}
): ErrosValidacao {
  const erros: ErrosValidacao = {};
  const presente = (campo: keyof ProdutoPayload) =>
    !parcial || payload[campo] !== undefined;

  if (presente("nome") && !textoValido(payload.nome)) {
    erros.nome = "Informe o nome do produto.";
  }

  if (presente("descricao") && !textoValido(payload.descricao)) {
    erros.descricao = "Informe a descrição do produto.";
  }

  if (presente("categoria") && !textoValido(payload.categoria)) {
    erros.categoria = "Informe a categoria do produto.";
  }

  if (presente("preco")) {
    const preco = payload.preco;
    if (typeof preco !== "number" || !Number.isInteger(preco) || preco <= 0) {
      erros.preco = "O preço deve ser maior que zero.";
    }
  }

  if (presente("estoque")) {
    const estoque = payload.estoque;
    if (typeof estoque !== "number" || !Number.isInteger(estoque) || estoque < 0) {
      erros.estoque = "O estoque não pode ser negativo.";
    }
  }

  if (presente("fotos")) {
    const fotos = payload.fotos;
    if (!Array.isArray(fotos) || fotos.length === 0 || !fotos.every((f) => typeof f === "string" && f.length > 0)) {
      erros.fotos = "Envie ao menos uma foto do produto.";
    }
  }

  return erros;
}
