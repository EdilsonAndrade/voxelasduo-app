import type { Produto } from "@/lib/models/produto";

export interface ItemSemEstoque {
  produtoId: string;
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

/**
 * Valida a quantidade desejada contra o estoque real dos produtos no banco.
 * `itensAgrupados`: produtoId → soma das quantidades do checkout (duplicados somam).
 * Retorna a lista de itens problemáticos (produto inexistente ou quantidade acima do estoque).
 */
export function validarEstoque(
  itensAgrupados: Map<string, number>,
  produtos: Map<string, Produto>
): ItemSemEstoque[] {
  const problemas: ItemSemEstoque[] = [];

  for (const [produtoId, quantidade] of itensAgrupados) {
    const produto = produtos.get(produtoId);
    if (!produto) {
      problemas.push({ produtoId, nome: "Produto removido", quantidadeDisponivel: 0 });
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
