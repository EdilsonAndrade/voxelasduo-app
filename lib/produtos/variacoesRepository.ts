import { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { custoSemEmbalagem, valoresDoComponente } from "@/lib/kits/componentes";
import { calcularTotaisKit } from "@/lib/kits/precificacaoKit";
import { custoProducaoDoKit } from "@/lib/kits/produtoDoKit";
import type { CustoProducao } from "@/lib/models/produto";
import { PRODUTOS_COLLECTION, type PrecosCanaisProduto, type Produto, type VariacaoKit } from "@/lib/models/produto";
import type { ResultadoAbatimentoEstoque } from "./repository";
import {
  custoDaVariacao,
  derivarPrecoEstoque,
  gerarIdVariacao,
  motivoPecaInvalida,
  type VariacaoEntrada,
} from "./variacoes";

async function colecaoProdutos() {
  const client = await getMongoClient();
  return client.db(DB_NAME).collection<Produto>(PRODUTOS_COLLECTION);
}

/** Peças das variações carregadas do banco, por id. */
export async function buscarPecas(ids: string[]): Promise<Map<string, Produto>> {
  const validos = [...new Set(ids)].filter((id) => ObjectId.isValid(id));
  if (validos.length === 0) return new Map();
  const colecao = await colecaoProdutos();
  const produtos = await colecao.find({ _id: { $in: validos.map((id) => new ObjectId(id)) } }).toArray();
  return new Map(produtos.map((p) => [p._id!.toString(), p]));
}

/** Custo atual da peça sem a embalagem dela — `null` = sem custo cadastrado. */
export function custoDaPeca(produto: Pick<Produto, "custoProducao">): number | null {
  return produto.custoProducao ? custoSemEmbalagem(produto.custoProducao) : null;
}

export interface CustoVariacaoDetalhado {
  variacaoId: string;
  custoCentavos: number;
  incompleto: boolean;
  pecas: { produtoId: string; nome: string; quantidade: number; custoCentavos: number | null; removido: boolean }[];
}

/** Custo de cada variação com os valores atuais das peças (peça apagada usa o último valor conhecido). */
export async function custosDasVariacoes(variacoes: VariacaoKit[]): Promise<CustoVariacaoDetalhado[]> {
  const pecas = await buscarPecas(variacoes.flatMap((v) => v.pecas.map((p) => p.produtoId)));
  return variacoes.map((variacao) => {
    const detalhe = variacao.pecas.map((peca) => {
      const produto = pecas.get(peca.produtoId);
      return {
        produtoId: peca.produtoId,
        nome: produto?.nome ?? peca.ultimo.nome,
        quantidade: peca.quantidade,
        custoCentavos: produto ? custoDaPeca(produto) : peca.ultimo.custoCentavos,
        removido: !produto,
      };
    });
    return { variacaoId: variacao.id, ...custoDaVariacao(detalhe, variacao.embalagemCentavos), pecas: detalhe };
  });
}

export class ErroVariacoes extends Error {
  constructor(public campos: Record<string, string>) {
    super("Payload inválido.");
    this.name = "ErroVariacoes";
  }
}

/**
 * Grava a lista inteira de variações (specs/041, FR-001/FR-002): confere as
 * peças no banco, guarda os últimos valores delas e deriva preço (menor) e
 * estoque (soma) do produto. Lista vazia remove as variações e mantém o
 * preço/estoque atuais.
 */
export async function salvarVariacoes(produtoId: string, entradas: VariacaoEntrada[]): Promise<Produto | null> {
  if (!ObjectId.isValid(produtoId)) return null;

  const pecas = await buscarPecas(entradas.flatMap((v) => v.pecas.map((p) => p.produtoId)));
  const campos: Record<string, string> = {};
  entradas.forEach((variacao, i) => {
    for (const peca of variacao.pecas) {
      const produto = pecas.get(peca.produtoId);
      const motivo = produto ? motivoPecaInvalida(produto) : "Peça não encontrada no catálogo.";
      if (motivo) campos[`variacoes[${i}].pecas`] = `${produto?.nome ?? peca.produtoId}: ${motivo}`;
    }
  });
  if (Object.keys(campos).length > 0) throw new ErroVariacoes(campos);

  const variacoes: VariacaoKit[] = entradas.map((entrada) => ({
    id: entrada.id ?? gerarIdVariacao(),
    nome: entrada.nome,
    pecas: entrada.pecas.map((peca) => {
      const produto = pecas.get(peca.produtoId)!;
      return { ...peca, ultimo: { nome: produto.nome, custoCentavos: custoDaPeca(produto) } };
    }),
    embalagemCentavos: entrada.embalagemCentavos,
    preco: entrada.preco,
    ...(entrada.precosCanais ? { precosCanais: entrada.precosCanais } : {}),
    estoque: entrada.estoque,
    ...(entrada.foto ? { foto: entrada.foto } : {}),
  }));

  const colecao = await colecaoProdutos();
  const derivados = derivarPrecoEstoque(variacoes);
  const agora = new Date();
  return colecao.findOneAndUpdate(
    { _id: new ObjectId(produtoId) },
    derivados
      ? { $set: { variacoes, ...derivados, atualizadoEm: agora } }
      : { $unset: { variacoes: "" }, $set: { atualizadoEm: agora } },
    { returnDocument: "after" }
  );
}

/** Aplica os preços vindos da calculadora numa variação e recalcula o preço "a partir de" do produto. */
export async function aplicarPrecosVariacao(
  produtoId: string,
  variacaoId: string,
  preco: number,
  precosCanais: PrecosCanaisProduto
): Promise<Produto | null> {
  if (!ObjectId.isValid(produtoId)) return null;
  const colecao = await colecaoProdutos();
  const produto = await colecao.findOne({ _id: new ObjectId(produtoId), "variacoes.id": variacaoId });
  if (!produto?.variacoes) return null;

  const variacoes = produto.variacoes.map((v) => {
    if (v.id !== variacaoId) return v;
    const canais = { ...v.precosCanais, ...precosCanais };
    return { ...v, preco, ...(Object.keys(canais).length > 0 ? { precosCanais: canais } : {}) };
  });
  return colecao.findOneAndUpdate(
    { _id: produto._id },
    { $set: { variacoes, preco: derivarPrecoEstoque(variacoes)!.preco, atualizadoEm: new Date() } },
    { returnDocument: "after" }
  );
}

/**
 * Abate o estoque de uma variação de forma atômica (research #4): o filtro
 * exige estoque suficiente na própria variação, e o total do produto desce
 * junto para continuar sendo a soma.
 */
export async function abaterEstoqueVariacaoAtomico(
  produtoId: string,
  variacaoId: string,
  quantidade: number
): Promise<ResultadoAbatimentoEstoque> {
  if (!ObjectId.isValid(produtoId)) return { sucesso: false, motivoFalha: "produto_removido" };
  const colecao = await colecaoProdutos();
  const _id = new ObjectId(produtoId);

  const resultado = await colecao.findOneAndUpdate(
    { _id, variacoes: { $elemMatch: { id: variacaoId, estoque: { $gte: quantidade } } } },
    { $inc: { "variacoes.$.estoque": -quantidade, estoque: -quantidade }, $set: { atualizadoEm: new Date() } },
    { returnDocument: "after" }
  );
  if (resultado) return { sucesso: true, produto: resultado };

  const existente = await colecao.findOne({ _id, "variacoes.id": variacaoId });
  return { sucesso: false, motivoFalha: existente ? "estoque_insuficiente" : "produto_removido" };
}

/**
 * Custo de produção agregado de uma variação para a calculadora (specs/041,
 * research #3): mesma conversão do montador de kits, para o custo na
 * calculadora bater com o mostrado na variação. `null` = variação sem peças.
 */
export async function custoProducaoDaVariacao(variacao: VariacaoKit): Promise<CustoProducao | null> {
  if (variacao.pecas.length === 0) return null;
  const pecas = await buscarPecas(variacao.pecas.map((p) => p.produtoId));
  const itens = variacao.pecas.map((peca) => {
    const produto = pecas.get(peca.produtoId);
    return {
      quantidade: peca.quantidade,
      valores: produto
        ? valoresDoComponente(produto)
        : { nome: peca.ultimo.nome, precoCentavos: 0, pesoGramas: null, tempoMinutos: null, custoCentavos: peca.ultimo.custoCentavos },
      maoDeObraHoras: produto?.custoProducao?.tempoMaoDeObraHoras,
    };
  });
  const totais = calcularTotaisKit(itens, variacao.embalagemCentavos);
  return custoProducaoDoKit(
    totais,
    itens.map((i) => ({ nome: i.valores.nome, quantidade: i.quantidade, maoDeObraHoras: i.maoDeObraHoras })),
    variacao.embalagemCentavos
  );
}
