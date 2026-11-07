import type { CanalOrigem, Pedido, StatusPedido } from "@/lib/models/pedido";
import type { Produto } from "@/lib/models/produto";
import { codigoPedido } from "./numero";
import { buscarVariacao, fotoDaVariacao, nomeComVariacao } from "@/lib/produtos/variacoes";

export interface PedidoResumo {
  id: string;
  /** Código amigável para exibir (ex.: 1042). */
  codigo: string;
  canalOrigem: CanalOrigem;
  status: StatusPedido;
  cliente: { nome: string; email: string };
  valorTotal: number;
  /** Forma de entrega e frete (spec 039) — ausente em pedidos antigos/externos. */
  frete?: Pedido["frete"];
  criadoEm: Date;
  temItemSemCorrespondencia: boolean;
  rastreio?: Pedido["rastreio"];
  envioAguardandoLiberacaoAte?: Pedido["envioAguardandoLiberacaoAte"];
  /** Último motivo de pagamento não aprovado (EDI-132) — indicador na lista. */
  ultimaFalhaPagamento?: Pedido["pagamento"]["ultimaFalha"];
  /** Itens com miniatura — para reconhecer o que foi comprado direto na listagem. */
  itens: ItemPedidoDetalhe[];
}

export interface ItemPedidoDetalhe {
  produtoId: string | null;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  /** Preço do site antes do desconto do link de pagamento. */
  precoOriginal?: number;
  semCorrespondencia: boolean;
  /** Primeira foto do produto — ausente quando o produto saiu do catálogo ou não tem foto. */
  foto?: string;
  /** Página do produto na loja (/produtos/[categoria]/[slug]). */
  urlLoja?: string;
}

export interface PedidoDetalhado {
  id: string;
  /** Código amigável para exibir (ex.: 1042). */
  codigo: string;
  canalOrigem: CanalOrigem;
  status: StatusPedido;
  cliente: Pedido["cliente"];
  itens: ItemPedidoDetalhe[];
  valorTotal: number;
  frete?: Pedido["frete"];
  pagamento: Pedido["pagamento"];
  origemExterna?: Pedido["origemExterna"];
  criadoEm: Date;
  atualizadoEm: Date;
  rastreio?: Pedido["rastreio"];
  envioAguardandoLiberacaoAte?: Pedido["envioAguardandoLiberacaoAte"];
  /** Pedido gerado por um link de pagamento. */
  viaLinkPagamento?: boolean;
}

function resolverItem(
  item: Pedido["itens"][number],
  produtos: Map<string, Produto>
): ItemPedidoDetalhe {
  const produto = produtos.get(item.produtoId.toString());
  // Variação de kit (specs/041): nome gravado na compra; foto da variação se ela ainda existir.
  const variacao = produto ? buscarVariacao(produto, item.variacaoId) : undefined;
  return {
    produtoId: produto ? item.produtoId.toString() : null,
    nome: nomeComVariacao(produto?.nome ?? "Produto removido do catálogo", item.variacaoNome),
    quantidade: item.quantidade,
    precoUnitario: item.precoUnitario,
    ...(item.precoOriginal !== undefined ? { precoOriginal: item.precoOriginal } : {}),
    semCorrespondencia: !produto,
    foto: produto ? fotoDaVariacao(variacao, produto.fotos) : undefined,
    urlLoja: produto
      ? `/produtos/${encodeURIComponent(produto.categoria)}/${encodeURIComponent(produto.slug)}`
      : undefined,
  };
}

export function paraPedidoResumo(pedido: Pedido, produtos: Map<string, Produto>): PedidoResumo {
  const temItemSemCorrespondencia = pedido.itens.some(
    (item) => !produtos.has(item.produtoId.toString())
  );

  return {
    id: pedido._id!.toString(),
    codigo: codigoPedido(pedido),
    canalOrigem: pedido.canalOrigem,
    status: pedido.status,
    cliente: { nome: pedido.cliente.nome, email: pedido.cliente.email },
    valorTotal: pedido.valorTotal,
    frete: pedido.frete,
    criadoEm: pedido.criadoEm,
    temItemSemCorrespondencia,
    rastreio: pedido.rastreio,
    envioAguardandoLiberacaoAte: pedido.envioAguardandoLiberacaoAte,
    ultimaFalhaPagamento: pedido.pagamento?.ultimaFalha,
    itens: pedido.itens.map((item) => resolverItem(item, produtos)),
  };
}

export function paraPedidoDetalhado(
  pedido: Pedido,
  produtos: Map<string, Produto>
): PedidoDetalhado {
  return {
    id: pedido._id!.toString(),
    codigo: codigoPedido(pedido),
    canalOrigem: pedido.canalOrigem,
    status: pedido.status,
    cliente: pedido.cliente,
    itens: pedido.itens.map((item) => resolverItem(item, produtos)),
    valorTotal: pedido.valorTotal,
    frete: pedido.frete,
    pagamento: pedido.pagamento,
    origemExterna: pedido.origemExterna,
    criadoEm: pedido.criadoEm,
    atualizadoEm: pedido.atualizadoEm,
    rastreio: pedido.rastreio,
    envioAguardandoLiberacaoAte: pedido.envioAguardandoLiberacaoAte,
    ...(pedido.linkPagamentoId ? { viaLinkPagamento: true } : {}),
  };
}
