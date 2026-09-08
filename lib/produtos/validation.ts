export interface ProdutoPayload {
  nome?: unknown;
  descricao?: unknown;
  preco?: unknown;
  estoque?: unknown;
  categoria?: unknown;
  fotos?: unknown;
  /** IDs do anúncio em cada canal externo (Tarefa 5) — opcional, sem anúncio ainda em nenhum canal por padrão. */
  integracoes?: unknown;
  /** Custo de produção (COGS) do produto (EDI-92) — opcional, produto pode ser salvo sem custo configurado. */
  custoProducao?: unknown;
  /** Peso/dimensões da embalagem para envio (EDI-96) — opcional, produto pode ser salvo sem esses dados configurados. */
  embalagemEnvio?: unknown;
}

/** Campos monetários/numéricos obrigatórios de `custoProducao`, todos exigidos > 0 quando o objeto está presente (EDI-92). */
const CAMPOS_CUSTO_PRODUCAO_POSITIVOS = [
  "pesoPecaGramas",
  "tempoImpressaoHoras",
  "tempoMaoDeObraHoras",
  "precoCarreteCentavos",
  "pesoCarreteGramas",
  "precoImpressoraCentavos",
  "vidaUtilImpressoraHoras",
  "consumoEletricoKwh",
  "tarifaEnergiaCentavos",
  "valorHoraTrabalhoCentavos",
  "custoEmbalagemCentavos",
] as const;

function numeroFinito(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

/**
 * Valida `custoProducao` quando presente no payload: todos os campos são
 * obrigatórios (data-model.md → "Validação"). Campos de peso/tempo/preço
 * devem ser > 0; `margemPerdaPercentual` pode ser 0 (sem perda) mas não
 * negativa.
 */
function validarCustoProducao(valor: unknown): string | undefined {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    return "Formato de custo de produção inválido.";
  }

  const custo = valor as Record<string, unknown>;

  for (const campo of CAMPOS_CUSTO_PRODUCAO_POSITIVOS) {
    if (!numeroFinito(custo[campo]) || (custo[campo] as number) <= 0) {
      return `Informe um valor maior que zero para "${campo}".`;
    }
  }

  if (!numeroFinito(custo.margemPerdaPercentual) || (custo.margemPerdaPercentual as number) < 0) {
    return "A margem de perda não pode ser negativa.";
  }

  return undefined;
}

/** Campos obrigatórios de `embalagemEnvio`, todos exigidos > 0 quando o objeto está presente (EDI-96). */
const CAMPOS_EMBALAGEM_ENVIO = ["pesoGramas", "alturaCm", "larguraCm", "comprimentoCm"] as const;

/** Valida `embalagemEnvio` quando presente no payload: todos os campos são obrigatórios e devem ser > 0 (data-model.md → "Validação"). */
function validarEmbalagemEnvio(valor: unknown): string | undefined {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    return "Formato de embalagem para envio inválido.";
  }

  const embalagem = valor as Record<string, unknown>;

  for (const campo of CAMPOS_EMBALAGEM_ENVIO) {
    if (!numeroFinito(embalagem[campo]) || (embalagem[campo] as number) <= 0) {
      return `Informe um valor maior que zero para "${campo}".`;
    }
  }

  return undefined;
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

  if (presente("integracoes") && payload.integracoes !== undefined) {
    const integracoes = payload.integracoes;
    if (typeof integracoes !== "object" || integracoes === null || Array.isArray(integracoes)) {
      erros.integracoes = "Formato de integrações inválido.";
    }
  }

  if (presente("fotos")) {
    const fotos = payload.fotos;
    if (!Array.isArray(fotos) || fotos.length === 0 || !fotos.every((f) => typeof f === "string" && f.length > 0)) {
      erros.fotos = "Envie ao menos uma foto do produto.";
    }
  }

  if (payload.custoProducao !== undefined) {
    const erro = validarCustoProducao(payload.custoProducao);
    if (erro) {
      erros.custoProducao = erro;
    }
  }

  if (payload.embalagemEnvio !== undefined) {
    const erro = validarEmbalagemEnvio(payload.embalagemEnvio);
    if (erro) {
      erros.embalagemEnvio = erro;
    }
  }

  return erros;
}
