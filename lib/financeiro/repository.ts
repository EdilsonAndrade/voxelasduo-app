import { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { criarGarantiaDeIndices } from "@/lib/db/indices";
import { ML_FIXA_ABAIXO_79_CENTAVOS, ML_PERCENTUAL_ESTIMADO } from "@/lib/kits/precificacaoKit";
import {
  IMPRESSORAS_COLLECTION,
  LANCAMENTOS_VENDA_COLLECTION,
  DESPESAS_COLLECTION,
  type Despesa,
  type DespesaJson,
  type DespesaPayload,
  type Impressora,
  type ImpressoraJson,
  type ImpressoraPayload,
  type ItemLancamento,
  type LancamentoPayload,
  type LancamentoVenda,
  type LancamentoVendaJson,
} from "@/lib/models/financeiro";
import type { Pedido, StatusPedido } from "@/lib/models/pedido";
import { buscarERegistrarRecebimento } from "@/lib/pagamentos/recebimento";
import { colecaoPedidos } from "@/lib/pedidos/repository";
import { faixasMercadoLivre } from "@/lib/produtos/calculadoraRapida";
import { valoresPadraoV2 } from "@/lib/produtos/calculadoraValores";
import { comissaoCanal, resolverTaxasCanais, type TaxaCanal } from "@/lib/produtos/canais";
import { criarCalculoPreco } from "@/lib/produtos/calculosPreco";
import { chaveProduto, montarCatalogoVenda, type OpcaoVenda } from "./catalogo";
import { dataDoDia, diaDe } from "./datas";
import type { OrigemVenda, VendaPainel } from "./painel";

const garantirIndices = criarGarantiaDeIndices();

async function colecaoLancamentos() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<LancamentoVenda>(LANCAMENTOS_VENDA_COLLECTION);
  await garantirIndices(() => colecao.createIndex({ data: -1 }));
  return colecao;
}

async function colecaoDespesas() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<Despesa>(DESPESAS_COLLECTION);
  await garantirIndices(() => colecao.createIndex({ data: -1 }));
  return colecao;
}

async function colecaoImpressoras() {
  const client = await getMongoClient();
  return client.db(DB_NAME).collection<Impressora>(IMPRESSORAS_COLLECTION);
}

// ---------------------------------------------------------------- vendas à mão

function paraJson(l: LancamentoVenda): LancamentoVendaJson {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, data, criadoEm, atualizadoEm, ...resto } = l;
  return { ...resto, id: _id!.toString(), data: diaDe(data) };
}

export async function listarLancamentos(): Promise<LancamentoVendaJson[]> {
  const colecao = await colecaoLancamentos();
  const lista = await colecao.find({}).sort({ data: -1, criadoEm: -1 }).toArray();
  return lista.map(paraJson);
}

export async function buscarLancamento(id: string): Promise<LancamentoVendaJson | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoLancamentos();
  const l = await colecao.findOne({ _id: new ObjectId(id) });
  return l ? paraJson(l) : null;
}

const chaveItem = (i: { origem: string; produtoId?: string; variacaoId?: string; calculoId?: string }) =>
  i.origem === "produto" ? chaveProduto(i.produtoId!, i.variacaoId) : i.origem === "calculo" ? `calculo:${i.calculoId}` : "";

/**
 * Monta os itens gravados: o desgaste da impressora vem do catálogo de hoje
 * (ou do lançamento anterior, se o produto saiu do catálogo). Item digitado
 * com "levar para a calculadora" vira um cálculo novo, com o preço da venda
 * como preço-alvo — lá se decide se vira produto.
 */
async function montarItens(dados: LancamentoPayload, anteriores: ItemLancamento[] = []): Promise<ItemLancamento[]> {
  const { opcoes } = await montarCatalogoVenda();
  const catalogo = new Map<string, OpcaoVenda>(opcoes.map((o) => [o.valor, o]));
  const antes = new Map(anteriores.map((i) => [chaveItem(i), i]));

  const itens: ItemLancamento[] = [];
  for (const item of dados.itens) {
    if (item.origem === "avulso" && item.levarParaCalculadora) {
      const valores = valoresPadraoV2();
      valores.precificacao = {
        ...valores.precificacao,
        modo: "alvo",
        precoAlvoReais: (item.precoUnitarioCentavos / 100).toFixed(2),
      };
      const calculo = await criarCalculoPreco({ nome: item.nome, valores });
      itens.push({
        origem: "calculo",
        calculoId: calculo._id!.toString(),
        nome: item.nome,
        quantidade: item.quantidade,
        precoUnitarioCentavos: item.precoUnitarioCentavos,
        custoUnitarioCentavos: item.custoUnitarioCentavos,
        depreciacaoUnitariaCentavos: 0,
      });
      continue;
    }
    const chave = chaveItem(item);
    const depreciacao = chave ? (catalogo.get(chave)?.depreciacaoCentavos ?? antes.get(chave)?.depreciacaoUnitariaCentavos ?? 0) : 0;
    itens.push({
      origem: item.origem,
      ...(item.produtoId ? { produtoId: item.produtoId } : {}),
      ...(item.variacaoId ? { variacaoId: item.variacaoId } : {}),
      ...(item.calculoId ? { calculoId: item.calculoId } : {}),
      nome: item.nome,
      quantidade: item.quantidade,
      precoUnitarioCentavos: item.precoUnitarioCentavos,
      custoUnitarioCentavos: item.custoUnitarioCentavos,
      // O desgaste nunca passa do custo informado.
      depreciacaoUnitariaCentavos: item.custoUnitarioCentavos === null ? 0 : Math.min(depreciacao, item.custoUnitarioCentavos),
    });
  }
  return itens;
}

export async function criarLancamento(dados: LancamentoPayload): Promise<LancamentoVendaJson> {
  const itens = await montarItens(dados);
  const agora = new Date();
  const doc: LancamentoVenda = {
    data: dataDoDia(dados.data)!,
    ...(dados.cliente ? { cliente: dados.cliente } : {}),
    meio: dados.meio,
    itens,
    taxaCentavos: dados.taxaCentavos,
    ...(dados.observacao ? { observacao: dados.observacao } : {}),
    criadoEm: agora,
    atualizadoEm: agora,
  };
  const colecao = await colecaoLancamentos();
  const { insertedId } = await colecao.insertOne(doc);
  return paraJson({ ...doc, _id: insertedId });
}

export async function atualizarLancamento(id: string, dados: LancamentoPayload): Promise<LancamentoVendaJson | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoLancamentos();
  const atual = await colecao.findOne({ _id: new ObjectId(id) });
  if (!atual) return null;
  const itens = await montarItens(dados, atual.itens);
  const desdefinir: Record<string, ""> = {};
  if (!dados.cliente) desdefinir.cliente = "";
  if (!dados.observacao) desdefinir.observacao = "";
  const atualizado = await colecao.findOneAndUpdate(
    { _id: atual._id },
    {
      $set: {
        data: dataDoDia(dados.data)!,
        meio: dados.meio,
        itens,
        taxaCentavos: dados.taxaCentavos,
        atualizadoEm: new Date(),
        ...(dados.cliente ? { cliente: dados.cliente } : {}),
        ...(dados.observacao ? { observacao: dados.observacao } : {}),
      },
      ...(Object.keys(desdefinir).length > 0 ? { $unset: desdefinir } : {}),
    },
    { returnDocument: "after" }
  );
  return atualizado ? paraJson(atualizado) : null;
}

export async function excluirLancamento(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const colecao = await colecaoLancamentos();
  const { deletedCount } = await colecao.deleteOne({ _id: new ObjectId(id) });
  return deletedCount === 1;
}

// ---------------------------------------------------------------- impressoras

function impressoraJson(i: Impressora): ImpressoraJson {
  return {
    id: i._id!.toString(),
    nome: i.nome,
    dataCompra: diaDe(i.dataCompra),
    valorCentavos: i.valorCentavos,
    ...(i.observacao ? { observacao: i.observacao } : {}),
  };
}

export async function listarImpressoras(): Promise<ImpressoraJson[]> {
  const colecao = await colecaoImpressoras();
  return (await colecao.find({}).sort({ dataCompra: 1 }).toArray()).map(impressoraJson);
}

export async function criarImpressora(dados: ImpressoraPayload): Promise<ImpressoraJson> {
  const agora = new Date();
  const doc: Impressora = {
    nome: dados.nome,
    dataCompra: dataDoDia(dados.dataCompra)!,
    valorCentavos: dados.valorCentavos,
    ...(dados.observacao ? { observacao: dados.observacao } : {}),
    criadoEm: agora,
    atualizadoEm: agora,
  };
  const colecao = await colecaoImpressoras();
  const { insertedId } = await colecao.insertOne(doc);
  return impressoraJson({ ...doc, _id: insertedId });
}

export async function atualizarImpressora(id: string, dados: ImpressoraPayload): Promise<ImpressoraJson | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoImpressoras();
  const atualizada = await colecao.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        nome: dados.nome,
        dataCompra: dataDoDia(dados.dataCompra)!,
        valorCentavos: dados.valorCentavos,
        atualizadoEm: new Date(),
        ...(dados.observacao ? { observacao: dados.observacao } : {}),
      },
      ...(dados.observacao ? {} : { $unset: { observacao: "" as const } }),
    },
    { returnDocument: "after" }
  );
  return atualizada ? impressoraJson(atualizada) : null;
}

export async function excluirImpressora(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const colecao = await colecaoImpressoras();
  const { deletedCount } = await colecao.deleteOne({ _id: new ObjectId(id) });
  return deletedCount === 1;
}

// ---------------------------------------------------------------- painel

/** Pedidos que de fato entraram dinheiro. */
const STATUS_PAGOS: StatusPedido[] = ["pago", "em_producao", "enviado", "entregue"];

function origemDoPedido(p: Pick<Pedido, "canalOrigem" | "linkPagamentoId">): OrigemVenda {
  if (p.linkPagamentoId) return "link";
  return p.canalOrigem;
}

function vendaDoLancamento(l: LancamentoVenda): VendaPainel {
  let receita = 0;
  let custo = 0;
  let depreciacao = 0;
  let semCusto = 0;
  for (const item of l.itens) {
    receita += item.precoUnitarioCentavos * item.quantidade;
    if (item.custoUnitarioCentavos === null) semCusto += item.quantidade;
    else custo += item.custoUnitarioCentavos * item.quantidade;
    depreciacao += item.depreciacaoUnitariaCentavos * item.quantidade;
  }
  return {
    data: l.data,
    origem: `manual_${l.meio}` as OrigemVenda,
    receitaCentavos: receita,
    taxaCentavos: l.taxaCentavos,
    custoCentavos: custo,
    depreciacaoCentavos: depreciacao,
    unidadesSemCusto: semCusto,
    detalhe: {
      titulo: l.cliente ? `Venda lançada · ${l.cliente}` : "Venda lançada",
      href: `/admin/financeiro/vendas/${l._id!.toString()}`,
      freteCentavos: 0,
      descontoCentavos: 0,
      taxa: "informada",
    },
  };
}

/**
 * Pedido pago → venda do painel. Custo e desgaste são os de hoje (o pedido
 * não guarda o custo da época). Taxas: site/link pela taxa do Mercado Pago
 * cadastrada; Shopee pela tabela; Mercado Livre pela estimativa da calculadora.
 */
function vendaDoPedido(
  p: Pedido,
  custos: Map<string, OpcaoVenda>,
  taxas: { site: TaxaCanal; shopee: TaxaCanal; mercadoLivre: TaxaCanal }
): VendaPainel {
  const origem = origemDoPedido(p);
  const frete = p.frete?.valorCentavos ?? 0;
  let custo = 0;
  let depreciacao = 0;
  let semCusto = 0;
  let taxaItens = 0;
  let desconto = 0;
  for (const item of p.itens) {
    if (item.precoOriginal != null && item.precoOriginal > item.precoUnitario) {
      desconto += (item.precoOriginal - item.precoUnitario) * item.quantidade;
    }
    const opcao = custos.get(chaveProduto(item.produtoId.toString(), item.variacaoId));
    if (opcao?.custoCentavos == null) semCusto += item.quantidade;
    else {
      custo += opcao.custoCentavos * item.quantidade;
      depreciacao += opcao.depreciacaoCentavos * item.quantidade;
    }
    if (origem === "shopee") taxaItens += comissaoCanal(taxas.shopee, item.precoUnitario) * item.quantidade;
    if (origem === "mercado_livre") taxaItens += comissaoCanal(taxas.mercadoLivre, item.precoUnitario) * item.quantidade;
  }
  const mp = p.pagamento?.recebimento;
  const viaMercadoPago = origem === "site" || origem === "link";
  const taxa = mp ? mp.taxaCentavos : viaMercadoPago ? comissaoCanal(taxas.site, p.valorTotal) : taxaItens;
  const nome = p.cliente?.nome?.split(" ")[0];
  return {
    data: p.criadoEm,
    origem,
    receitaCentavos: Math.max(0, p.valorTotal - frete),
    taxaCentavos: taxa,
    custoCentavos: custo,
    depreciacaoCentavos: depreciacao,
    unidadesSemCusto: semCusto,
    detalhe: {
      titulo: `Pedido ${p.numero ? `#${p.numero}` : p._id!.toString().slice(-6)}${nome ? ` · ${nome}` : ""}`,
      freteCentavos: frete,
      descontoCentavos: desconto,
      taxa: mp ? "real" : "estimada",
      mercadoPago: mp && {
        clientePagouCentavos: mp.valorCentavos + mp.jurosClienteCentavos,
        jurosClienteCentavos: mp.jurosClienteCentavos,
        cupomCentavos: mp.cupomCentavos,
        liquidoCentavos: mp.liquidoCentavos,
        parcelas: mp.parcelas,
      },
    },
  };
}

/** Quantos pedidos antigos buscar no Mercado Pago por carregamento do painel. */
const LIMITE_TARIFAS_POR_CARGA = 30;

function pagamentoAprovadoId(p: Pedido): string | undefined {
  const aprovada = p.pagamento?.tentativas?.findLast((t) => t.status === "aprovado");
  return aprovada?.referenciaExterna ?? p.pagamento?.referenciaExterna;
}

/**
 * Pedidos do site/link pagos antes de a tarifa real ser guardada: busca no
 * Mercado Pago e grava (uma vez só). Falhas ficam na taxa estimada e tentam
 * de novo no próximo carregamento.
 */
async function completarTarifasMercadoPago(pedidos: Pedido[]): Promise<void> {
  const faltando = pedidos
    .filter((p) => !p.origemExterna && !p.pagamento?.recebimento && pagamentoAprovadoId(p))
    .slice(0, LIMITE_TARIFAS_POR_CARGA);
  const resultados = await Promise.all(
    faltando.map((p) => buscarERegistrarRecebimento(p._id!.toString(), pagamentoAprovadoId(p)!))
  );
  faltando.forEach((p, i) => {
    const recebimento = resultados[i];
    if (recebimento) p.pagamento = { ...p.pagamento, recebimento };
  });
}

// ---------------------------------------------------------------- despesas

function despesaJson(d: Despesa): DespesaJson {
  return {
    id: d._id!.toString(),
    data: diaDe(d.data),
    categoria: d.categoria,
    descricao: d.descricao,
    valorCentavos: d.valorCentavos,
    ...(d.observacao ? { observacao: d.observacao } : {}),
  };
}

export async function listarDespesas(): Promise<DespesaJson[]> {
  const colecao = await colecaoDespesas();
  return (await colecao.find({}).sort({ data: -1, criadoEm: -1 }).toArray()).map(despesaJson);
}

export async function criarDespesa(dados: DespesaPayload): Promise<DespesaJson> {
  const agora = new Date();
  const doc: Despesa = {
    data: dataDoDia(dados.data)!,
    categoria: dados.categoria,
    descricao: dados.descricao,
    valorCentavos: dados.valorCentavos,
    ...(dados.observacao ? { observacao: dados.observacao } : {}),
    criadoEm: agora,
    atualizadoEm: agora,
  };
  const colecao = await colecaoDespesas();
  const { insertedId } = await colecao.insertOne(doc);
  return despesaJson({ ...doc, _id: insertedId });
}

export async function atualizarDespesa(id: string, dados: DespesaPayload): Promise<DespesaJson | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoDespesas();
  const atualizada = await colecao.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        data: dataDoDia(dados.data)!,
        categoria: dados.categoria,
        descricao: dados.descricao,
        valorCentavos: dados.valorCentavos,
        atualizadoEm: new Date(),
        ...(dados.observacao ? { observacao: dados.observacao } : {}),
      },
      ...(dados.observacao ? {} : { $unset: { observacao: "" as const } }),
    },
    { returnDocument: "after" }
  );
  return atualizada ? despesaJson(atualizada) : null;
}

export async function excluirDespesa(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const colecao = await colecaoDespesas();
  const { deletedCount } = await colecao.deleteOne({ _id: new ObjectId(id) });
  return deletedCount === 1;
}

export interface DadosPainel {
  vendas: VendaPainel[];
  impressoras: ImpressoraJson[];
  despesas: DespesaJson[];
}

/** Todas as vendas (pedidos pagos + lançamentos à mão), as impressoras e as despesas. */
export async function carregarDadosPainel(): Promise<DadosPainel> {
  const [{ opcoes, taxas }, lancamentos, pedidos, impressoras, despesas] = await Promise.all([
    montarCatalogoVenda(),
    colecaoLancamentos().then((c) => c.find({}).toArray()),
    colecaoPedidos().then((c) =>
      c
        .find(
          { status: { $in: STATUS_PAGOS } },
          {
            projection: {
              itens: 1,
              valorTotal: 1,
              frete: 1,
              canalOrigem: 1,
              linkPagamentoId: 1,
              criadoEm: 1,
              numero: 1,
              "cliente.nome": 1,
              pagamento: 1,
              origemExterna: 1,
            },
          }
        )
        .toArray()
    ),
    listarImpressoras(),
    listarDespesas(),
  ]);
  await completarTarifasMercadoPago(pedidos as Pedido[]);
  const custos = new Map(opcoes.map((o) => [o.valor, o]));
  const efetivas = resolverTaxasCanais(taxas);
  const taxasCanais = {
    site: efetivas.siteProprio,
    shopee: efetivas.shopee,
    mercadoLivre: {
      percentual: ML_PERCENTUAL_ESTIMADO,
      fixaCentavos: ML_FIXA_ABAIXO_79_CENTAVOS,
      faixas: faixasMercadoLivre(ML_PERCENTUAL_ESTIMADO, ML_FIXA_ABAIXO_79_CENTAVOS),
    },
  };
  return {
    vendas: [
      ...(pedidos as Pedido[]).map((p) => vendaDoPedido(p, custos, taxasCanais)),
      ...lancamentos.map(vendaDoLancamento),
    ],
    impressoras,
    despesas,
  };
}
