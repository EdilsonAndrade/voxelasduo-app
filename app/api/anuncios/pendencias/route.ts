import { NextResponse } from "next/server";
import { listarFalhasPendentes } from "@/lib/estoque/publicacoes";
import { buscarProdutosPorIds } from "@/lib/pedidos/repository";

/**
 * Lista falhas de criação/atualização de anúncio ainda não resolvidas, para
 * o responsável da loja acompanhar sem consultar o banco diretamente
 * (contracts/mercado-livre-api.md, FR-011, SC-005).
 */
export async function GET() {
  const falhas = await listarFalhasPendentes();

  const idsProdutos = [...new Set(falhas.map((falha) => falha.produtoId.toString()))];
  const produtos = await buscarProdutosPorIds(idsProdutos);

  return NextResponse.json({
    falhas: falhas.map((falha) => ({
      produtoId: falha.produtoId.toString(),
      nomeProduto: produtos.get(falha.produtoId.toString())?.nome ?? "Produto não encontrado",
      canal: falha.canal,
      operacao: falha.operacao,
      motivo: falha.motivo,
      criadoEm: falha.criadoEm,
    })),
  });
}
