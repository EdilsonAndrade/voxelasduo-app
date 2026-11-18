import { ObjectId } from "mongodb";
import {
  LIMITES_LANCAMENTO,
  MEIOS_PAGAMENTO,
  ORIGENS_ITEM_VENDA,
  type ImpressoraPayload,
  type ItemLancamentoPayload,
  type LancamentoPayload,
  type MeioPagamento,
  type OrigemItemVenda,
} from "@/lib/models/financeiro";
import { dataDoDia } from "./datas";

type Erros = Record<string, string>;

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function centavos(valor: unknown): number | null {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 0 && valor <= LIMITES_LANCAMENTO.valorMaxCentavos
    ? valor
    : null;
}

function idValido(valor: string): boolean {
  return valor !== "" && ObjectId.isValid(valor);
}

function validarItem(bruto: unknown, i: number, erros: Erros): ItemLancamentoPayload | null {
  const item = (typeof bruto === "object" && bruto !== null ? bruto : {}) as Record<string, unknown>;
  const campo = (nome: string) => `itens[${i}].${nome}`;
  const origem = item.origem as OrigemItemVenda;
  const nome = texto(item.nome);
  const produtoId = texto(item.produtoId);
  const variacaoId = texto(item.variacaoId);
  const calculoId = texto(item.calculoId);

  if (!ORIGENS_ITEM_VENDA.includes(origem)) erros[campo("origem")] = "Origem do item inválida.";
  if (origem === "produto" && !idValido(produtoId)) erros[campo("produtoId")] = "Escolha o produto.";
  if (origem === "calculo" && !idValido(calculoId)) erros[campo("calculoId")] = "Escolha o cálculo.";
  if (!nome) erros[campo("nome")] = "Informe o nome do produto.";
  else if (nome.length > LIMITES_LANCAMENTO.textoMax) erros[campo("nome")] = "Nome muito longo.";

  const quantidade = item.quantidade;
  const quantidadeOk =
    typeof quantidade === "number" && Number.isInteger(quantidade) && quantidade >= 1 && quantidade <= LIMITES_LANCAMENTO.quantidadeMax;
  if (!quantidadeOk) erros[campo("quantidade")] = "Quantidade inválida.";

  const preco = centavos(item.precoUnitarioCentavos);
  if (preco === null || preco === 0) erros[campo("precoUnitarioCentavos")] = "Informe o preço da unidade.";

  const custo = item.custoUnitarioCentavos === null || item.custoUnitarioCentavos === undefined ? null : centavos(item.custoUnitarioCentavos);
  if (custo === null && item.custoUnitarioCentavos !== null && item.custoUnitarioCentavos !== undefined) {
    erros[campo("custoUnitarioCentavos")] = "Custo inválido.";
  }

  if (!ORIGENS_ITEM_VENDA.includes(origem) || !nome || !quantidadeOk || !preco) return null;
  return {
    origem,
    ...(origem === "produto" ? { produtoId, ...(variacaoId ? { variacaoId } : {}) } : {}),
    ...(origem === "calculo" ? { calculoId } : {}),
    nome,
    quantidade: quantidade as number,
    precoUnitarioCentavos: preco,
    custoUnitarioCentavos: custo,
    ...(origem === "avulso" && item.levarParaCalculadora === true ? { levarParaCalculadora: true } : {}),
  };
}

/** Valida o corpo de criação/edição de uma venda lançada à mão. */
export function validarLancamento(payload: unknown): { erros: Erros; dados?: LancamentoPayload } {
  const corpo = (typeof payload === "object" && payload !== null ? payload : {}) as Record<string, unknown>;
  const erros: Erros = {};

  const data = texto(corpo.data);
  if (!dataDoDia(data)) erros.data = "Informe a data da venda.";

  const meio = corpo.meio as MeioPagamento;
  if (!MEIOS_PAGAMENTO.includes(meio)) erros.meio = "Escolha como a venda foi paga.";

  const cliente = texto(corpo.cliente);
  if (cliente.length > LIMITES_LANCAMENTO.textoMax) erros.cliente = "Nome muito longo.";
  const observacao = texto(corpo.observacao);
  if (observacao.length > 500) erros.observacao = "Recado muito longo (máx. 500).";

  const taxa = centavos(corpo.taxaCentavos ?? 0);
  if (taxa === null) erros.taxaCentavos = "Taxa inválida.";

  const brutos = Array.isArray(corpo.itens) ? corpo.itens : [];
  if (brutos.length === 0) erros.itens = "Inclua pelo menos um produto.";
  else if (brutos.length > LIMITES_LANCAMENTO.itensMax) erros.itens = `No máximo ${LIMITES_LANCAMENTO.itensMax} produtos.`;
  const itens = brutos.slice(0, LIMITES_LANCAMENTO.itensMax).map((item, i) => validarItem(item, i, erros));

  if (Object.keys(erros).length > 0) return { erros };
  return {
    erros,
    dados: {
      data,
      ...(cliente ? { cliente } : {}),
      meio,
      itens: itens as ItemLancamentoPayload[],
      taxaCentavos: taxa!,
      ...(observacao ? { observacao } : {}),
    },
  };
}

/** Valida o cadastro de uma impressora. */
export function validarImpressora(payload: unknown): { erros: Erros; dados?: ImpressoraPayload } {
  const corpo = (typeof payload === "object" && payload !== null ? payload : {}) as Record<string, unknown>;
  const erros: Erros = {};
  const nome = texto(corpo.nome);
  if (!nome) erros.nome = "Informe o nome da impressora.";
  else if (nome.length > 80) erros.nome = "Nome muito longo.";
  const dataCompra = texto(corpo.dataCompra);
  if (!dataDoDia(dataCompra)) erros.dataCompra = "Informe a data da compra.";
  const valor = centavos(corpo.valorCentavos);
  if (!valor) erros.valorCentavos = "Informe quanto a impressora custou.";
  const observacao = texto(corpo.observacao);
  if (observacao.length > 300) erros.observacao = "Observação muito longa.";

  if (Object.keys(erros).length > 0) return { erros };
  return { erros, dados: { nome, dataCompra, valorCentavos: valor!, ...(observacao ? { observacao } : {}) } };
}
