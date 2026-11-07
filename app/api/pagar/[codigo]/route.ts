import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/clienteConfig";
import { enviarPedidoCriadoCliente, notificarAdminPedidoCriado } from "@/lib/email/resend";
import { resolverFretePedido } from "@/lib/frete/calculo";
import { opcoesFreteVigentes } from "@/lib/frete/repository";
import { idempotenciaDoLink, opcoesFreteDoLink, situacaoDoLink } from "@/lib/linksPagamento/regras";
import { buscarLinkPorCodigo, vincularPedidoAoLink } from "@/lib/linksPagamento/repository";
import type { ServicoFrete } from "@/lib/models/frete";
import type { Pedido } from "@/lib/models/pedido";
import { ErroEstoque, chaveLinhaPedido } from "@/lib/pedidos/estoque";
import { criarPedido } from "@/lib/pedidos/repository";
import { validarCheckout, type CheckoutPayload } from "@/lib/pedidos/validation";

/** Mensagem para o cliente quando o link não aceita mais pagamento. */
const MENSAGEM_SITUACAO = {
  vencido: "Este link de pagamento venceu. Fale com a loja para receber um novo.",
  cancelado: "Este link de pagamento foi cancelado. Fale com a loja para receber um novo.",
} as const;

/** Formas de entrega do link (rota pública) — com frete grátis, PAC/SEDEX saem por R$ 0. */
export async function GET(_request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const encontrado = await buscarLinkPorCodigo(codigo);
  if (!encontrado) return NextResponse.json({ erro: "Link de pagamento não encontrado." }, { status: 404 });
  const opcoes = opcoesFreteDoLink(await opcoesFreteVigentes(), encontrado.link.freteGratis);
  return NextResponse.json({ opcoes });
}

/**
 * Cria o pedido do link (rota pública). Itens e preços vêm do link gravado no
 * banco — o navegador só manda dados do cliente e a forma de entrega.
 */
export async function POST(request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const encontrado = await buscarLinkPorCodigo(codigo);
  if (!encontrado) return NextResponse.json({ erro: "Link de pagamento não encontrado." }, { status: 404 });
  const { link, statusPedido } = encontrado;

  // Já virou pedido: devolve o mesmo pedido para o cliente seguir para o pagamento.
  if (link.pedidoId && statusPedido !== "cancelado") {
    return NextResponse.json({ pedido: { id: link.pedidoId.toString() } }, { status: 200 });
  }
  const situacao = situacaoDoLink(link, statusPedido);
  if (situacao === "vencido" || situacao === "cancelado") {
    return NextResponse.json({ erro: MENSAGEM_SITUACAO[situacao], codigo: `link_${situacao}` }, { status: 410 });
  }

  const corpo = ((await request.json().catch(() => null)) ?? {}) as CheckoutPayload;
  const itens = link.itens.map((item) => ({
    produtoId: item.produtoId.toString(),
    quantidade: item.quantidade,
    ...(item.variacaoId ? { variacaoId: item.variacaoId } : {}),
  }));
  const payload: CheckoutPayload = { ...corpo, idempotencia: idempotenciaDoLink(link.codigo), itens };
  const erros = validarCheckout(payload);
  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erro: "Dados inválidos.", campos: erros }, { status: 400 });
  }

  const freteEscolhido = payload.frete as { servico: ServicoFrete; valorCentavos: number };
  const opcoesFrete = opcoesFreteDoLink(
    await opcoesFreteVigentes({ cep: payload.cliente?.endereco?.cep as string }),
    link.freteGratis
  );
  const frete = resolverFretePedido(freteEscolhido.servico, opcoesFrete);
  if (!frete) {
    return NextResponse.json(
      { erro: "Dados inválidos.", campos: { frete: "Escolha a forma de entrega." } },
      { status: 400 }
    );
  }
  if (frete.valorCentavos !== freteEscolhido.valorCentavos) {
    return NextResponse.json(
      {
        erro: "O valor do frete mudou. Confira a nova opção antes de confirmar.",
        codigo: "frete_divergente",
        opcoes: opcoesFrete,
      },
      { status: 409 }
    );
  }

  const session = await auth();
  const clienteId = session?.user?.id ? new ObjectId(session.user.id) : undefined;
  const precosCombinados = new Map(
    link.itens.map((item) => [chaveLinhaPedido(item.produtoId.toString(), item.variacaoId), item.precoCentavos])
  );

  let pedido: Pedido;
  let duplicado: boolean;
  try {
    const resultado = await criarPedido({
      idempotencia: payload.idempotencia as string,
      cliente: payload.cliente as Pedido["cliente"],
      itens,
      clienteId,
      frete,
      precosCombinados,
      linkPagamentoId: link._id!,
    });
    pedido = resultado.pedido;
    duplicado = resultado.duplicado;
  } catch (erro) {
    if (erro instanceof ErroEstoque) {
      return NextResponse.json({ erro: "Estoque insuficiente.", itens: erro.itens }, { status: 409 });
    }
    throw erro;
  }

  await vincularPedidoAoLink(link._id!, pedido._id!);
  if (!duplicado) await Promise.all([notificarAdminPedidoCriado(pedido), enviarPedidoCriadoCliente(pedido)]);

  return NextResponse.json({ pedido: { id: pedido._id!.toString() } }, { status: duplicado ? 200 : 201 });
}
