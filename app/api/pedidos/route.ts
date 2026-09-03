import { NextResponse } from "next/server";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { PEDIDOS_COLLECTION, type Pedido } from "@/lib/models/pedido";
import { buscarProdutosPorIds, criarPedido, type ItemPedidoDetalhado } from "@/lib/pedidos/repository";
import { ErroEstoque } from "@/lib/pedidos/estoque";
import { validarCheckout, type CheckoutPayload } from "@/lib/pedidos/validation";

// Esqueleto da rota (Tarefa 1): lista pedidos sem regra de negócio de pagamento.
// A listagem administrativa completa é escopo da Tarefa 8 (EDI-81).
export async function GET() {
  const client = await getMongoClient();
  const pedidos = await client
    .db(DB_NAME)
    .collection<Pedido>(PEDIDOS_COLLECTION)
    .find({})
    .toArray();

  return NextResponse.json({ pedidos });
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

  let pedido: Pedido;
  let duplicado: boolean;
  let itensDetalhados: ItemPedidoDetalhado[];

  try {
    const resultado = await criarPedido({
      idempotencia: payload.idempotencia as string,
      cliente: payload.cliente as Pedido["cliente"],
      itens,
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
