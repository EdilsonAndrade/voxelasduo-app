import { NextResponse } from "next/server";
import { listarFalhasPendentes } from "@/lib/avaliacoes/falhas";
import { buscarProdutosPorIds } from "@/lib/pedidos/repository";

/**
 * Lista falhas de importação de avaliações não resolvidas, para o
 * responsável da loja acompanhar sem consultar o banco diretamente
 * (contracts/avaliacoes-api.md, FR-006, SC-005) — mesmo padrão de
 * `GET /api/anuncios/pendencias`.
 */
export async function GET() {
  const falhas = await listarFalhasPendentes();

  const idsProdutos = [
    ...new Set(
      falhas.map((falha) => falha.produtoId?.toString()).filter((id): id is string => Boolean(id))
    ),
  ];
  const produtos = await buscarProdutosPorIds(idsProdutos);

  return NextResponse.json({
    falhas: falhas.map((falha) => ({
      produtoId: falha.produtoId?.toString(),
      nomeProduto: falha.produtoId
        ? (produtos.get(falha.produtoId.toString())?.nome ?? "Produto não encontrado")
        : undefined,
      canal: falha.canal,
      motivo: falha.motivo,
      criadoEm: falha.criadoEm,
    })),
  });
}
