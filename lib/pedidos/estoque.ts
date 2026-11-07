import type { Produto } from "@/lib/models/produto";
import { buscarVariacao, nomeComVariacao, temVariacoes } from "@/lib/produtos/variacoes";

export interface ItemSemEstoque {
  produtoId: string;
  /** Variação de kit da linha (specs/041) — ausente = produto simples. */
  variacaoId?: string;
  nome: string;
  quantidadeDisponivel: number;
}

export class ErroEstoque extends Error {
  itens: ItemSemEstoque[];

  constructor(itens: ItemSemEstoque[]) {
    super("Estoque insuficiente para um ou mais itens.");
    this.name = "ErroEstoque";
    this.itens = itens;
  }
}

/** Chave de agrupamento do checkout: `produtoId` ou `produtoId:variacaoId` (specs/041). */
export function chaveLinhaPedido(produtoId: string, variacaoId?: string): string {
  return variacaoId ? `${produtoId}:${variacaoId}` : produtoId;
}

export function separarChaveLinhaPedido(chave: string): { produtoId: string; variacaoId?: string } {
  const [produtoId, variacaoId] = chave.split(":");
  return variacaoId ? { produtoId, variacaoId } : { produtoId };
}

/**
 * Valida a quantidade desejada contra o estoque real dos produtos no banco.
 * `itensAgrupados`: chave (`chaveLinhaPedido`) → soma das quantidades do checkout (duplicados somam).
 * Produto com variações exige a variação, e o estoque conferido é o dela.
 * Retorna a lista de itens problemáticos (produto inexistente ou quantidade acima do estoque).
 */
export function validarEstoque(
  itensAgrupados: Map<string, number>,
  produtos: Map<string, Produto>
): ItemSemEstoque[] {
  const problemas: ItemSemEstoque[] = [];

  for (const [chave, quantidade] of itensAgrupados) {
    const { produtoId, variacaoId } = separarChaveLinhaPedido(chave);
    const produto = produtos.get(produtoId);
    if (!produto) {
      problemas.push({ produtoId, ...(variacaoId ? { variacaoId } : {}), nome: "Produto removido", quantidadeDisponivel: 0 });
    } else if (temVariacoes(produto) || variacaoId) {
      const variacao = buscarVariacao(produto, variacaoId);
      if (!variacao || quantidade > variacao.estoque) {
        problemas.push({
          produtoId,
          ...(variacaoId ? { variacaoId } : {}),
          nome: variacao ? nomeComVariacao(produto.nome, variacao.nome) : `${produto.nome} (escolha a variação de novo)`,
          quantidadeDisponivel: variacao?.estoque ?? 0,
        });
      }
    } else if (quantidade > produto.estoque) {
      problemas.push({
        produtoId,
        nome: produto.nome,
        quantidadeDisponivel: produto.estoque,
      });
    }
  }

  return problemas;
}
