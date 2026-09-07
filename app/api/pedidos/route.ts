import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/clienteConfig";
import { CANAIS_ORIGEM, STATUS_PEDIDO, type CanalOrigem, type Pedido, type StatusPedido } from "@/lib/models/pedido";
import {
  PEDIDOS_POR_PAGINA,
  buscarProdutosPorIds,
  criarPedido,
  listarPedidos,
  type ItemPedidoDetalhado,
} from "@/lib/pedidos/repository";
import { paraPedidoResumo } from "@/lib/pedidos/apresentacao";
import { ErroEstoque } from "@/lib/pedidos/estoque";
import { validarCheckout, type CheckoutPayload } from "@/lib/pedidos/validation";

/** Listagem administrativa de pedidos (Tarefa 8/EDI-81) — filtro por canal/status e paginação simples. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const canalParam = searchParams.get("canal");
  const statusParam = searchParams.get("status");
  const paginaParam = Number(searchParams.get("pagina"));

  const { pedidos, total } = await listarPedidos({
    canal: CANAIS_ORIGEM.includes(canalParam as CanalOrigem) ? (canalParam as CanalOrigem) : undefined,
    status: STATUS_PEDIDO.includes(statusParam as StatusPedido) ? (statusParam as StatusPedido) : undefined,
    pagina: Number.isFinite(paginaParam) && paginaParam > 0 ? paginaParam : undefined,
  });

  const produtos = await buscarProdutosPorIds(
    pedidos.flatMap((pedido) => pedido.itens.map((item) => item.produtoId.toString()))
  );

  return NextResponse.json({
    pedidos: pedidos.map((pedido) => paraPedidoResumo(pedido, produtos)),
    totalPaginas: Math.max(1, Math.ceil(total / PEDIDOS_POR_PAGINA)),
    paginaAtual: Number.isFinite(paginaParam) && paginaParam > 0 ? paginaParam : 1,
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as CheckoutPayload;
  const erros = validarCheckout(payload);

  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erro: "Dados inválidos.", campos: erros }, { status: 400 });
  }

  const itens = (payload.itens as { produtoId: string; quantidade: number }[]).map(
    (item) => ({
      produtoId: item.produtoId,
      quantidade: item.quantidade,
    })
  );

  // Leitura opcional da sessão do cliente (Tarefa 10/EDI-84) — o checkout
  // continua público (guest checkout); quando há sessão válida, o pedido
  // já nasce associado à conta.
  const session = await auth();
  const clienteId = session?.user?.id ? new ObjectId(session.user.id) : undefined;

  let pedido: Pedido;
  let duplicado: boolean;
  let itensDetalhados: ItemPedidoDetalhado[];

  try {
    const resultado = await criarPedido({
      idempotencia: payload.idempotencia as string,
      cliente: payload.cliente as Pedido["cliente"],
      itens,
      clienteId,
    });
    pedido = resultado.pedido;
    duplicado = resultado.duplicado;
    itensDetalhados = resultado.itensDetalhados;
  } catch (erro) {
    if (erro instanceof ErroEstoque) {
      return NextResponse.json(
        { erro: "Estoque insuficiente.", itens: erro.itens },
        { status: 409 }
      );
    }
    throw erro;
  }

  let detalhes = itensDetalhados;
  if (duplicado && detalhes.length === 0) {
    const produtos = await buscarProdutosPorIds(
      pedido.itens.map((item) => item.produtoId.toString())
    );
    detalhes = pedido.itens.map((item) => ({
      produtoId: item.produtoId.toString(),
      nome: produtos.get(item.produtoId.toString())?.nome ?? "Produto",
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
    }));
  }

  return NextResponse.json(
    {
      pedido: {
        id: pedido._id!.toString(),
        status: pedido.status,
        valorTotal: pedido.valorTotal,
        itens: detalhes,
        cliente: pedido.cliente,
        criadoEm: pedido.criadoEm,
      },
    },
    { status: duplicado ? 200 : 201 }
  );
}
