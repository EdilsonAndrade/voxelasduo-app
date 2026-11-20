import { ObjectId } from "mongodb";
import { criarGarantiaDeIndices } from "@/lib/db/indices";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { DESPESAS_COLLECTION, type Despesa } from "@/lib/models/financeiro";
import {
  INSUMOS_COLLECTION,
  type CompraInsumoPayload,
  type Insumo,
  type InsumoJson,
  type InsumoPayload,
} from "@/lib/models/insumo";
import { custoUnitarioCentavos, descricaoDaCompra } from "./insumos";
import { dataDoDia, diaDe } from "./datas";

const garantirIndices = criarGarantiaDeIndices();

async function colecaoInsumos() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<Insumo>(INSUMOS_COLLECTION);
  await garantirIndices(() => colecao.createIndex({ nome: 1 }));
  return colecao;
}

async function colecaoDespesas() {
  const client = await getMongoClient();
  return client.db(DB_NAME).collection<Despesa>(DESPESAS_COLLECTION);
}

/** Quanto já foi gasto em cada insumo, somando as compras lançadas nas despesas. */
async function gastoPorInsumo(): Promise<Map<string, { totalGastoCentavos: number; compras: number }>> {
  const colecao = await colecaoDespesas();
  const linhas = await colecao
    .aggregate<{ _id: string; total: number; compras: number }>([
      { $match: { insumoId: { $type: "string" } } },
      { $group: { _id: "$insumoId", total: { $sum: "$valorCentavos" }, compras: { $sum: 1 } } },
    ])
    .toArray();
  return new Map(linhas.map((l) => [l._id, { totalGastoCentavos: l.total, compras: l.compras }]));
}

function insumoJson(i: Insumo, gasto?: { totalGastoCentavos: number; compras: number }): InsumoJson {
  return {
    id: i._id!.toString(),
    nome: i.nome,
    ...(i.marca ? { marca: i.marca } : {}),
    categoria: i.categoria,
    unidade: i.unidade,
    quantidade: i.quantidade,
    valorTotalCentavos: i.valorTotalCentavos,
    ultimaCompraEm: diaDe(i.ultimaCompraEm),
    ...(i.observacao ? { observacao: i.observacao } : {}),
    custoUnitarioCentavos: custoUnitarioCentavos(i.quantidade, i.valorTotalCentavos),
    totalGastoCentavos: gasto?.totalGastoCentavos ?? i.valorTotalCentavos,
    compras: gasto?.compras ?? 1,
  };
}

export async function listarInsumos(): Promise<InsumoJson[]> {
  const colecao = await colecaoInsumos();
  const [lista, gastos] = await Promise.all([colecao.find({}).sort({ nome: 1 }).toArray(), gastoPorInsumo()]);
  return lista.map((i) => insumoJson(i, gastos.get(i._id!.toString())));
}

export async function buscarInsumo(id: string): Promise<InsumoJson | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoInsumos();
  const insumo = await colecao.findOne({ _id: new ObjectId(id) });
  if (!insumo) return null;
  const gastos = await gastoPorInsumo();
  return insumoJson(insumo, gastos.get(id));
}

/** Lança a compra do insumo nas despesas e devolve o id da despesa criada. */
async function lancarDespesa(
  insumo: Pick<Insumo, "nome" | "marca" | "categoria" | "unidade">,
  insumoId: string,
  compra: CompraInsumoPayload
): Promise<string> {
  const agora = new Date();
  const colecao = await colecaoDespesas();
  const doc: Despesa = {
    data: dataDoDia(compra.data)!,
    categoria: insumo.categoria,
    descricao: descricaoDaCompra(insumo, compra.quantidade),
    valorCentavos: compra.valorTotalCentavos,
    ...(compra.observacao ? { observacao: compra.observacao } : {}),
    insumoId,
    criadoEm: agora,
    atualizadoEm: agora,
  };
  const { insertedId } = await colecao.insertOne(doc);
  return insertedId.toString();
}

export async function criarInsumo(dados: InsumoPayload): Promise<InsumoJson> {
  const agora = new Date();
  const doc: Insumo = {
    nome: dados.nome,
    ...(dados.marca ? { marca: dados.marca } : {}),
    categoria: dados.categoria,
    unidade: dados.unidade,
    quantidade: dados.quantidade,
    valorTotalCentavos: dados.valorTotalCentavos,
    ultimaCompraEm: dataDoDia(dados.data)!,
    ...(dados.observacao ? { observacao: dados.observacao } : {}),
    criadoEm: agora,
    atualizadoEm: agora,
  };
  const colecao = await colecaoInsumos();
  const { insertedId } = await colecao.insertOne(doc);
  const id = insertedId.toString();
  const despesaId = await lancarDespesa(doc, id, dados);
  await colecao.updateOne({ _id: insertedId }, { $set: { ultimaDespesaId: despesaId } });
  return insumoJson({ ...doc, _id: insertedId, ultimaDespesaId: despesaId });
}

/**
 * Edita o cadastro e corrige a despesa da última compra (mesma compra, valor
 * ajustado) — sem lançar gasto novo no caixa.
 */
export async function atualizarInsumo(id: string, dados: InsumoPayload): Promise<InsumoJson | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoInsumos();
  const atual = await colecao.findOne({ _id: new ObjectId(id) });
  if (!atual) return null;

  const limpar: Record<string, ""> = {};
  if (!dados.marca) limpar.marca = "";
  if (!dados.observacao) limpar.observacao = "";
  const atualizado = await colecao.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        nome: dados.nome,
        categoria: dados.categoria,
        unidade: dados.unidade,
        quantidade: dados.quantidade,
        valorTotalCentavos: dados.valorTotalCentavos,
        ultimaCompraEm: dataDoDia(dados.data)!,
        atualizadoEm: new Date(),
        ...(dados.marca ? { marca: dados.marca } : {}),
        ...(dados.observacao ? { observacao: dados.observacao } : {}),
      },
      ...(Object.keys(limpar).length > 0 ? { $unset: limpar } : {}),
    },
    { returnDocument: "after" }
  );
  if (!atualizado) return null;

  const despesas = await colecaoDespesas();
  if (atual.ultimaDespesaId && ObjectId.isValid(atual.ultimaDespesaId)) {
    await despesas.updateOne(
      { _id: new ObjectId(atual.ultimaDespesaId) },
      {
        $set: {
          data: dataDoDia(dados.data)!,
          categoria: dados.categoria,
          descricao: descricaoDaCompra(atualizado, dados.quantidade),
          valorCentavos: dados.valorTotalCentavos,
          atualizadoEm: new Date(),
          ...(dados.observacao ? { observacao: dados.observacao } : {}),
        },
        ...(dados.observacao ? {} : { $unset: { observacao: "" as const } }),
      }
    );
  } else {
    // Insumo sem despesa vinculada: lança agora, para a compra não ficar fora do caixa.
    const despesaId = await lancarDespesa(atualizado, id, dados);
    await colecao.updateOne({ _id: new ObjectId(id) }, { $set: { ultimaDespesaId: despesaId } });
  }

  const gastos = await gastoPorInsumo();
  return insumoJson(atualizado, gastos.get(id));
}

/** Nova compra: sobrescreve o custo atual do insumo e lança a despesa do gasto. */
export async function registrarCompra(id: string, compra: CompraInsumoPayload): Promise<InsumoJson | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoInsumos();
  const atual = await colecao.findOne({ _id: new ObjectId(id) });
  if (!atual) return null;

  const atualizado = await colecao.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        quantidade: compra.quantidade,
        valorTotalCentavos: compra.valorTotalCentavos,
        ultimaCompraEm: dataDoDia(compra.data)!,
        atualizadoEm: new Date(),
      },
    },
    { returnDocument: "after" }
  );
  if (!atualizado) return null;

  // A despesa é lançada depois do cadastro, para não sobrar gasto sem insumo.
  const despesaId = await lancarDespesa(atualizado, id, compra);
  await colecao.updateOne({ _id: new ObjectId(id) }, { $set: { ultimaDespesaId: despesaId } });

  const gastos = await gastoPorInsumo();
  return insumoJson(atualizado, gastos.get(id));
}

/**
 * Tira o insumo do catálogo. As compras já lançadas ficam nas despesas — o
 * dinheiro saiu do caixa de verdade —, só perdem o vínculo com o cadastro.
 */
export async function excluirInsumo(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const colecao = await colecaoInsumos();
  const { deletedCount } = await colecao.deleteOne({ _id: new ObjectId(id) });
  if (deletedCount !== 1) return false;
  const despesas = await colecaoDespesas();
  await despesas.updateMany({ insumoId: id }, { $unset: { insumoId: "" } });
  return true;
}
