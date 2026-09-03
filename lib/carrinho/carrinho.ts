export interface ItemCarrinho {
  produtoId: string;
  nome: string;
  foto: string;
  /** Usados para montar o link de volta ao detalhe: /produtos/[categoria]/[slug]. */
  categoria: string;
  slug: string;
  /** Preço unitário em centavos (informativo — o pedido sempre recalcula no servidor). */
  preco: number;
  /** Estoque visto no momento da adição (limite máximo da quantidade no carrinho). */
  estoque: number;
  quantidade: number;
}

export const CARRINHO_STORAGE_KEY = "voxelas-carrinho";

export interface TotaisCarrinho {
  totalItens: number;
  totalCentavos: number;
}

export function calcularTotais(itens: ItemCarrinho[]): TotaisCarrinho {
  return itens.reduce<TotaisCarrinho>(
    (acc, item) => ({
      totalItens: acc.totalItens + item.quantidade,
      totalCentavos: acc.totalCentavos + item.preco * item.quantidade,
    }),
    { totalItens: 0, totalCentavos: 0 }
  );
}

export function adicionarItem(
  itens: ItemCarrinho[],
  novo: Omit<ItemCarrinho, "quantidade"> & { quantidade: number }
): ItemCarrinho[] {
  const limite = Math.max(1, novo.estoque);
  const quantidade = Math.max(1, Math.min(novo.quantidade, limite));
  const existente = itens.find((item) => item.produtoId === novo.produtoId);

  if (existente) {
    return itens.map((item) =>
      item.produtoId === novo.produtoId
        ? { ...item, quantidade: Math.min(item.quantidade + quantidade, limite) }
        : item
    );
  }

  const item: ItemCarrinho = {
    produtoId: novo.produtoId,
    nome: novo.nome,
    foto: novo.foto,
    categoria: novo.categoria,
    slug: novo.slug,
    preco: novo.preco,
    estoque: novo.estoque,
    quantidade,
  };

  return [...itens, item];
}

export function alterarQuantidade(
  itens: ItemCarrinho[],
  produtoId: string,
  quantidade: number
): ItemCarrinho[] {
  return itens.map((item) => {
    if (item.produtoId !== produtoId) {
      return item;
    }
    const limite = Math.max(1, item.estoque);
    return { ...item, quantidade: Math.max(1, Math.min(quantidade, limite)) };
  });
}

export function removerItem(itens: ItemCarrinho[], produtoId: string): ItemCarrinho[] {
  return itens.filter((item) => item.produtoId !== produtoId);
}

export function limparCarrinho(): ItemCarrinho[] {
  return [];
}

export function carregarCarrinho(): ItemCarrinho[] {
  try {
    const bruto = window.localStorage.getItem(CARRINHO_STORAGE_KEY);
    if (!bruto) {
      return [];
    }
    const dados = JSON.parse(bruto);
    if (!Array.isArray(dados)) {
      return [];
    }
    return dados.filter(isItemCarrinhoValido);
  } catch {
    return [];
  }
}

export function salvarCarrinho(itens: ItemCarrinho[]): void {
  try {
    window.localStorage.setItem(CARRINHO_STORAGE_KEY, JSON.stringify(itens));
  } catch {
    // Storage indisponível (modo privado/quota): o carrinho segue funcionando em memória.
  }
}

function isItemCarrinhoValido(valor: unknown): valor is ItemCarrinho {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }
  const item = valor as Partial<ItemCarrinho>;
  return (
    typeof item.produtoId === "string" &&
    item.produtoId.length > 0 &&
    typeof item.nome === "string" &&
    typeof item.foto === "string" &&
    typeof item.categoria === "string" &&
    item.categoria.length > 0 &&
    typeof item.slug === "string" &&
    item.slug.length > 0 &&
    typeof item.preco === "number" &&
    item.preco > 0 &&
    typeof item.estoque === "number" &&
    item.estoque >= 0 &&
    typeof item.quantidade === "number" &&
    Number.isInteger(item.quantidade) &&
    item.quantidade >= 1
  );
}
