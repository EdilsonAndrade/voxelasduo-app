import {
  LIMITE_NOME_VARIACAO,
  MAXIMO_PECAS_VARIACAO,
  MAXIMO_VARIACOES,
  type PrecosCanaisProduto,
  type Produto,
  type VariacaoKit,
} from "@/lib/models/produto";

/** Variação como chega do formulário — `id` ausente = nova; `ultimo` das peças é preenchido no servidor. */
export interface VariacaoEntrada {
  id?: string;
  nome: string;
  pecas: { produtoId: string; quantidade: number }[];
  embalagemCentavos: number;
  preco: number;
  precosCanais?: PrecosCanaisProduto;
  estoque: number;
  foto?: string;
}

export interface ResultadoValidacaoVariacoes {
  erros: Record<string, string>;
  variacoes: VariacaoEntrada[];
}

function inteiroNaoNegativo(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 0;
}

function precoValido(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor > 0;
}

/**
 * Valida a lista inteira de variações (specs/041, FR-002) e devolve a versão
 * normalizada: nome aparado, peças repetidas somadas, preços de canal vazios
 * descartados e foto que não é do produto descartada.
 */
export function validarVariacoes(valor: unknown, fotosProduto: string[], produtoId?: string): ResultadoValidacaoVariacoes {
  const erros: Record<string, string> = {};
  if (!Array.isArray(valor)) {
    return { erros: { variacoes: "Envie a lista de variações." }, variacoes: [] };
  }
  if (valor.length > MAXIMO_VARIACOES) {
    erros.variacoes = `Use no máximo ${MAXIMO_VARIACOES} variações.`;
  }

  const nomes = new Set<string>();
  const variacoes: VariacaoEntrada[] = [];

  valor.forEach((bruto, i) => {
    const campo = (nome: string) => `variacoes[${i}].${nome}`;
    const v = (typeof bruto === "object" && bruto !== null ? bruto : {}) as Record<string, unknown>;

    const nome = typeof v.nome === "string" ? v.nome.trim() : "";
    if (!nome) erros[campo("nome")] = "Dê um nome à variação.";
    else if (nome.length > LIMITE_NOME_VARIACAO) erros[campo("nome")] = `Use no máximo ${LIMITE_NOME_VARIACAO} caracteres.`;
    else if (nomes.has(nome.toLowerCase())) erros[campo("nome")] = "Já existe uma variação com esse nome.";
    nomes.add(nome.toLowerCase());

    const pecasPorProduto = new Map<string, number>();
    if (!Array.isArray(v.pecas) || v.pecas.length === 0) {
      erros[campo("pecas")] = "Adicione ao menos uma peça.";
    } else {
      for (const p of v.pecas as unknown[]) {
        const peca = (typeof p === "object" && p !== null ? p : {}) as Record<string, unknown>;
        const id = typeof peca.produtoId === "string" ? peca.produtoId : "";
        const quantidade = peca.quantidade;
        if (!id || !(typeof quantidade === "number" && Number.isInteger(quantidade) && quantidade >= 1 && quantidade <= 999)) {
          erros[campo("pecas")] = "Cada peça precisa de um produto e quantidade de 1 a 999.";
          continue;
        }
        if (produtoId && id === produtoId) {
          erros[campo("pecas")] = "O próprio produto não pode ser peça da variação.";
          continue;
        }
        pecasPorProduto.set(id, Math.min(999, (pecasPorProduto.get(id) ?? 0) + quantidade));
      }
      if (pecasPorProduto.size > MAXIMO_PECAS_VARIACAO) {
        erros[campo("pecas")] = `Use no máximo ${MAXIMO_PECAS_VARIACAO} peças diferentes.`;
      }
    }

    if (!inteiroNaoNegativo(v.embalagemCentavos)) erros[campo("embalagemCentavos")] = "Embalagem inválida.";
    if (!precoValido(v.preco)) erros[campo("preco")] = "Informe o preço do site.";
    if (!inteiroNaoNegativo(v.estoque)) erros[campo("estoque")] = "Estoque deve ser um número inteiro, 0 ou mais.";

    const precosCanais: PrecosCanaisProduto = {};
    if (v.precosCanais !== undefined && v.precosCanais !== null) {
      const canais = (typeof v.precosCanais === "object" ? v.precosCanais : {}) as Record<string, unknown>;
      for (const canal of ["shopee", "mercadoLivre"] as const) {
        const preco = canais[canal];
        if (preco === undefined || preco === null) continue;
        if (!precoValido(preco)) erros[campo(`precosCanais.${canal}`)] = "Preço do canal inválido.";
        else precosCanais[canal] = preco;
      }
    }

    const foto = typeof v.foto === "string" && fotosProduto.includes(v.foto) ? v.foto : undefined;
    const id = typeof v.id === "string" && /^[a-f0-9]{6,32}$/.test(v.id) ? v.id : undefined;

    variacoes.push({
      ...(id ? { id } : {}),
      nome,
      pecas: [...pecasPorProduto].map(([produtoId, quantidade]) => ({ produtoId, quantidade })),
      embalagemCentavos: inteiroNaoNegativo(v.embalagemCentavos) ? v.embalagemCentavos : 0,
      preco: precoValido(v.preco) ? v.preco : 0,
      ...(Object.keys(precosCanais).length > 0 ? { precosCanais } : {}),
      estoque: inteiroNaoNegativo(v.estoque) ? v.estoque : 0,
      ...(foto ? { foto } : {}),
    });
  });

  const ids = variacoes.map((v) => v.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) erros.variacoes = "Há variações com o mesmo identificador.";

  return { erros, variacoes };
}

/** Novo identificador de variação (hex de 12 caracteres). */
export function gerarIdVariacao(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Produto com ao menos uma variação de kit. */
export function temVariacoes(produto: Pick<Produto, "variacoes">): boolean {
  return (produto.variacoes?.length ?? 0) > 0;
}

/** Preço (menor) e estoque (soma) do produto derivados das variações — `null` sem variações. */
export function derivarPrecoEstoque(variacoes: Pick<VariacaoKit, "preco" | "estoque">[]): { preco: number; estoque: number } | null {
  if (variacoes.length === 0) return null;
  return {
    preco: Math.min(...variacoes.map((v) => v.preco)),
    estoque: variacoes.reduce((soma, v) => soma + v.estoque, 0),
  };
}

export function buscarVariacao(produto: Pick<Produto, "variacoes">, variacaoId: string | undefined | null): VariacaoKit | undefined {
  if (!variacaoId) return undefined;
  return produto.variacoes?.find((v) => v.id === variacaoId);
}

/** "Centro de Mesa — Kit 4 peças" (ou só o nome do produto, sem variação). */
export function nomeComVariacao(nomeProduto: string, variacaoNome?: string | null): string {
  return variacaoNome ? `${nomeProduto} — ${variacaoNome}` : nomeProduto;
}

/** Foto da variação, se ainda for uma foto do produto; senão a primeira foto. */
export function fotoDaVariacao(variacao: Pick<VariacaoKit, "foto"> | undefined, fotos: string[] | undefined): string | undefined {
  if (variacao?.foto && fotos?.includes(variacao.foto)) return variacao.foto;
  return fotos?.[0];
}

export interface CustoVariacao {
  custoCentavos: number;
  /** Alguma peça sem custo cadastrado — o custo é uma estimativa por baixo. */
  incompleto: boolean;
}

/**
 * Custo da variação (FR-003): peças sem a embalagem delas × quantidade + a
 * embalagem do kit — a mesma regra do montador de kits (specs/037).
 */
export function custoDaVariacao(
  pecas: { quantidade: number; custoCentavos: number | null }[],
  embalagemCentavos: number
): CustoVariacao {
  let custoCentavos = embalagemCentavos;
  let incompleto = false;
  for (const peca of pecas) {
    if (peca.custoCentavos === null) incompleto = true;
    else custoCentavos += peca.custoCentavos * peca.quantidade;
  }
  return { custoCentavos: Math.round(custoCentavos), incompleto };
}

/** Peça que não pode entrar numa variação: produto com variações ou gerado por kit. */
export function motivoPecaInvalida(produto: Pick<Produto, "variacoes" | "kitId">): string | null {
  if (temVariacoes(produto)) return "Um produto com variações não pode ser peça de outra variação.";
  if (produto.kitId) return "Um produto gerado por kit não pode ser peça de uma variação.";
  return null;
}
