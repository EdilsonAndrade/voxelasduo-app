import { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import {
  ESTOQUE_INCONSISTENCIAS_COLLECTION,
  type Canal,
  type InconsistenciaEstoque,
  type MotivoInconsistenciaEstoque,
} from "@/lib/models/estoqueSincronizacao";
import type { Pedido } from "@/lib/models/pedido";
import { abaterEstoqueAtomico, buscarProdutoPorId } from "@/lib/produtos/repository";
import { buscarVariacao } from "@/lib/produtos/variacoes";
import { abaterEstoqueVariacaoAtomico } from "@/lib/produtos/variacoesRepository";
import { sincronizarAnuncioProduto } from "./sincronizacao";

async function colecaoInconsistencias() {
  const client = await getMongoClient();
  const colecao = client
    .db(DB_NAME)
    .collection<InconsistenciaEstoque>(ESTOQUE_INCONSISTENCIAS_COLLECTION);
  await colecao.createIndex({ resolvidoEm: 1 }, { sparse: true });
  return colecao;
}

async function registrarInconsistencia(
  produtoId: ObjectId,
  pedidoId: ObjectId,
  quantidadeSolicitada: number,
  motivo: MotivoInconsistenciaEstoque
): Promise<void> {
  const colecao = await colecaoInconsistencias();
  await colecao.insertOne({
    produtoId,
    pedidoId,
    quantidadeSolicitada,
    motivo,
    criadoEm: new Date(),
  });
}

/**
 * Registra um item de pedido de canal externo sem produto correspondente no
 * catálogo do site (Tarefa 7/EDI-80, FR-012) — sem `produtoId`/`pedidoId`
 * locais para referenciar, ao contrário de `registrarInconsistencia`.
 */
export async function registrarItemExternoSemProduto(
  canal: Canal,
  pedidoExternoId: string,
  itemIdCanal: string,
  quantidade: number
): Promise<void> {
  const colecao = await colecaoInconsistencias();
  await colecao.insertOne({
    origemExterna: { canal, pedidoExternoId, itemIdCanal },
    quantidadeSolicitada: quantidade,
    motivo: "produto_removido",
    criadoEm: new Date(),
  });
}

/**
 * Abate o estoque de cada item de um pedido pago, de forma atômica e por
 * item (research.md #2). Nunca lança exceção: o pagamento já foi aprovado
 * nesse ponto e não pode ser desfeito automaticamente — uma falha de
 * abatimento vira inconsistência para revisão manual (FR-004) sem impedir
 * o abatimento/sincronização dos demais itens do mesmo pedido.
 */
async function abaterItem(produtoId: string, variacaoId: string | undefined, quantidade: number) {
  // Variação de kit (specs/041): abate a variação e o total do produto juntos.
  return variacaoId
    ? abaterEstoqueVariacaoAtomico(produtoId, variacaoId, quantidade)
    : abaterEstoqueAtomico(produtoId, quantidade);
}

/**
 * Link de pagamento: as peças já foram produzidas/combinadas, então faltar
 * estoque não é inconsistência — abate só o que houver (sem ficar negativo).
 */
async function abaterDisponivel(produtoId: string, variacaoId: string | undefined, quantidade: number) {
  const produto = await buscarProdutoPorId(produtoId);
  if (!produto) return { sucesso: false, motivoFalha: "produto_removido" as const };
  const disponivel = variacaoId ? (buscarVariacao(produto, variacaoId)?.estoque ?? 0) : produto.estoque;
  const abater = Math.min(quantidade, Math.max(0, disponivel));
  if (abater === 0) return { sucesso: true };
  return abaterItem(produtoId, variacaoId, abater);
}

export async function abaterEstoquePedido(pedido: Pedido): Promise<void> {
  if (!pedido._id) return;
  const pedidoId = pedido._id;

  for (const item of pedido.itens) {
    const produtoId = item.produtoId.toString();
    let resultado = await abaterItem(produtoId, item.variacaoId, item.quantidade);
    if (!resultado.sucesso && resultado.motivoFalha === "estoque_insuficiente" && pedido.linkPagamentoId) {
      resultado = await abaterDisponivel(produtoId, item.variacaoId, item.quantidade);
    }

    if (resultado.sucesso) {
      // A sincronização com os canais externos nunca deve derrubar o
      // abatimento (fonte da verdade) — sincronizarAnuncioProduto já não
      // lança, mas o catch aqui é uma segunda rede de segurança. Uma venda
      // nascida em canal externo (Tarefa 7/EDI-80) já reflete a baixa nesse
      // canal — não reenvia para ele (research.md #8 da Tarefa 7).
      const canalOrigem = pedido.canalOrigem !== "site" ? pedido.canalOrigem : undefined;
      await sincronizarAnuncioProduto(item.produtoId.toString(), pedidoId, { canalOrigem }).catch(
        () => undefined
      );
    } else {
      await registrarInconsistencia(
        item.produtoId,
        pedidoId,
        item.quantidade,
        resultado.motivoFalha ?? "estoque_insuficiente"
      );
    }
  }
}
