import { NextResponse } from "next/server";
import { assinaturaWebhookValida } from "@/lib/pagamentos/webhook";
import {
  identificarNotificacao,
  type NotificacaoMercadoLivre,
  type TopicoMercadoLivre,
} from "./identificar";
import { processarPagamentoMercadoPago } from "./pagamento";
import { processarPedidoMercadoLivre } from "./mercadoLivre/pedidos";
import { processarPerguntaMercadoLivre } from "./mercadoLivre/perguntas";
import { processarReclamacaoMercadoLivre } from "./mercadoLivre/reclamacoes";
import { processarMensagemMercadoLivre } from "./mercadoLivre/mensagens";
import { processarEnvioMercadoLivre } from "./mercadoLivre/envios";

const PROCESSADORES_MERCADO_LIVRE: Record<
  TopicoMercadoLivre,
  (payload: NotificacaoMercadoLivre) => Promise<Response>
> = {
  pedidos: processarPedidoMercadoLivre,
  perguntas: processarPerguntaMercadoLivre,
  reclamacoes: processarReclamacaoMercadoLivre,
  mensagens: processarMensagemMercadoLivre,
  envios: processarEnvioMercadoLivre,
};

/**
 * Ponto único de entrada das notificações da aplicação compartilhada
 * Mercado Pago + Mercado Livre (EDI-132). Usado por `/api/notificacoes` e por
 * todas as rotas antigas — qualquer URL configurada no painel funciona para
 * todos os tópicos. `topicoPadrao` cobre avisos do ML sem `topic` recebidos
 * numa rota dedicada antiga.
 *
 * A assinatura `x-signature` só é exigida de avisos do Mercado Pago que a
 * enviam (formato Webhook); o formato IPN legado não é assinado e é aceito,
 * pois o aviso nunca é usado como dado — o pagamento é sempre consultado na
 * API (research.md #2 da spec 036). Avisos do ML continuam validados pelo
 * `application_id` dentro de cada processador.
 */
export async function despacharNotificacao(
  request: Request,
  { topicoPadrao }: { topicoPadrao?: TopicoMercadoLivre } = {}
): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const corpo = await request.json().catch(() => null);
  const notificacao = identificarNotificacao({ query, corpo, topicoPadrao });

  if (notificacao.origem === "mercado_livre") {
    if (!notificacao.topico) {
      console.info(
        `[notificacoes] tópico do Mercado Livre não tratado: ${notificacao.topicoOriginal} (${notificacao.payload.resource}) — ignorado.`
      );
      return NextResponse.json({ recebido: true });
    }
    return PROCESSADORES_MERCADO_LIVRE[notificacao.topico](notificacao.payload);
  }

  if (notificacao.origem === "desconhecida") {
    console.info("[notificacoes] notificação sem origem identificável — ignorada.");
    return NextResponse.json({ recebido: true });
  }

  const xSignature = request.headers.get("x-signature");
  if (xSignature) {
    const assinaturaOk = assinaturaWebhookValida({
      xSignature,
      xRequestId: request.headers.get("x-request-id"),
      dataId: notificacao.id,
      secret: process.env.MERCADOPAGO_WEBHOOK_SECRET!,
    });
    if (!assinaturaOk) {
      console.warn(
        `[notificacoes] assinatura inválida do Mercado Pago (tipo ${notificacao.tipo}, id ${notificacao.id}, x-request-id ${request.headers.get("x-request-id")}) — confira MERCADOPAGO_WEBHOOK_SECRET.`
      );
      return NextResponse.json({ erro: "Assinatura inválida." }, { status: 401 });
    }
  }

  if (notificacao.tipo !== "payment" || !notificacao.id) {
    console.info(`[notificacoes] aviso do Mercado Pago não tratado: tipo ${notificacao.tipo}, id ${notificacao.id} — ignorado.`);
    return NextResponse.json({ recebido: true });
  }

  return processarPagamentoMercadoPago(notificacao.id);
}
