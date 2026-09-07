import { NextResponse } from "next/server";
import { buscarPedidoMercadoLivre } from "@/lib/estoque/canais/mercadoLivre/pedidos";
import { buscarProdutoPorMercadoLivreId } from "@/lib/produtos/repository";
import { upsertPedidoExterno, type ItemPedidoExterno } from "@/lib/pedidos/externos";
import { abaterEstoquePedido, registrarItemExternoSemProduto } from "@/lib/estoque/abatimento";
import { notificarAdminVendaExterna } from "@/lib/email/resend";

interface NotificacaoMercadoLivre {
  resource?: string;
  application_id?: number | string;
}

/**
 * Recebe o tópico `orders_v2` do Mercado Livre (US2). O corpo da notificação
 * é só o gatilho — os dados reais do pedido vêm sempre de `GET /orders/{id}`
 * (research.md #7), o mesmo princípio já usado pelo webhook do Mercado Pago.
 */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as NotificacaoMercadoLivre;

  if (String(payload.application_id ?? "") !== (process.env.MERCADOLIVRE_CLIENT_ID ?? "")) {
    // application_id não corresponde à aplicação configurada — nada a processar.
    return NextResponse.json({ recebido: true });
  }

  const orderId = payload.resource?.split("/").pop();
  if (!orderId) {
    return NextResponse.json({ recebido: true });
  }

  let pedidoMercadoLivre;
  try {
    pedidoMercadoLivre = await buscarPedidoMercadoLivre(orderId);
  } catch {
    // Falha transitória ao consultar a API do Mercado Livre — o ML reenvia a notificação depois.
    return NextResponse.json({ erro: "Falha ao consultar o pedido." }, { status: 500 });
  }

  const itens: ItemPedidoExterno[] = [];
  for (const item of pedidoMercadoLivre.itens) {
    const produto = await buscarProdutoPorMercadoLivreId(item.itemId);
    if (!produto || !produto._id) {
      // Produto sem correspondência no catálogo do site (FR-012) — segue para os demais itens.
      await registrarItemExternoSemProduto(
        "mercado_livre",
        orderId,
        item.itemId,
        item.quantidade
      );
      continue;
    }
    itens.push({
      produtoId: produto._id,
      quantidade: item.quantidade,
      precoUnitario: produto.preco,
    });
  }

  if (itens.length > 0) {
    const { pedido, criado } = await upsertPedidoExterno({
      canal: "mercado_livre",
      pedidoExternoId: orderId,
      itens,
    });

    if (criado) {
      await abaterEstoquePedido(pedido);
      // Best-effort (Tarefa 10/EDI-84) — nunca bloqueia o processamento do webhook.
      await notificarAdminVendaExterna(pedido);
    }
  }

  return NextResponse.json({ recebido: true });
}
