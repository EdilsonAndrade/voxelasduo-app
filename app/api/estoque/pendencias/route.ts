import { NextResponse } from "next/server";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import {
  ESTOQUE_INCONSISTENCIAS_COLLECTION,
  type InconsistenciaEstoque,
} from "@/lib/models/estoqueSincronizacao";
import { listarPendencias } from "@/lib/estoque/fila";
import { buscarProdutosPorIds } from "@/lib/pedidos/repository";

/**
 * Lista sincronizações pendentes/falhas e inconsistências de estoque não
 * resolvidas, para o responsável da loja acompanhar sem consultar o banco
 * diretamente (contracts/estoque-api.md, FR-009/FR-010, SC-005).
 */
export async function GET() {
  const client = await getMongoClient();
  const colecaoInconsistencias = client
    .db(DB_NAME)
    .collection<InconsistenciaEstoque>(ESTOQUE_INCONSISTENCIAS_COLLECTION);

  const [sincronizacoes, inconsistencias] = await Promise.all([
    listarPendencias(),
    colecaoInconsistencias.find({ resolvidoEm: { $exists: false } }).toArray(),
  ]);

  const idsProdutos = [
    ...new Set(
      [...sincronizacoes, ...inconsistencias].map((registro) => registro.produtoId.toString())
    ),
  ];
  const produtos = await buscarProdutosPorIds(idsProdutos);

  return NextResponse.json({
    sincronizacoes: sincronizacoes.map((registro) => ({
      produtoId: registro.produtoId.toString(),
      nomeProduto: produtos.get(registro.produtoId.toString())?.nome ?? "Produto não encontrado",
      canal: registro.canal,
      status: registro.status,
      tentativas: registro.tentativas,
      ultimoErro: registro.ultimoErro,
      atualizadoEm: registro.atualizadoEm,
    })),
    inconsistenciasEstoque: inconsistencias.map((registro) => ({
      produtoId: registro.produtoId.toString(),
      nomeProduto: produtos.get(registro.produtoId.toString())?.nome ?? "Produto não encontrado",
      pedidoId: registro.pedidoId.toString(),
      quantidadeSolicitada: registro.quantidadeSolicitada,
      motivo: registro.motivo,
      criadoEm: registro.criadoEm,
    })),
  });
}
