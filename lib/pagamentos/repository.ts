import { ObjectId } from "mongodb";
import { buscarPedidoPorId, colecaoPedidos } from "@/lib/pedidos/repository";
import type { StatusTentativaPagamento, TentativaPagamento } from "@/lib/models/pedido";
import { abaterEstoquePedido } from "@/lib/estoque/abatimento";

/** Janela em que uma tentativa "pendente" é considerada ativa (evita cobrança dupla em abas simultâneas). */
const JANELA_TENTATIVA_ATIVA_MS = 10 * 60 * 1000;

export { buscarPedidoPorId };

/**
 * Verifica se o pedido já tem uma tentativa "pendente" registrada há pouco
 * tempo — usado para bloquear uma segunda tentativa concorrente (research.md #9).
 */
export async function existeTentativaAtivaRecente(pedidoId: string): Promise<boolean> {
  const pedido = await buscarPedidoPorId(pedidoId);
  if (!pedido) return false;

  const limite = Date.now() - JANELA_TENTATIVA_ATIVA_MS;
  return pedido.pagamento.tentativas.some(
    (tentativa) => tentativa.status === "pendente" && tentativa.criadoEm.getTime() >= limite
  );
}

/**
 * Promove o pedido para "pago" de forma condicional/idempotente — só tem
 * efeito se o pedido ainda não estiver "pago" (data-model.md #3). Reprocessar
 * a mesma aprovação (resposta síncrona + webhook posterior) não duplica efeito.
 *
 * O abatimento de estoque (Tarefa 5/EDI-78) é amarrado a esta mesma condição
 * via `findOneAndUpdate`: só dispara quando esta chamada foi de fato quem
 * promoveu o pedido, reaproveitando a idempotência já resolvida aqui em vez
 * de um mecanismo próprio (research.md #1 da Tarefa 5).
 */
async function promoverPedidoSeAprovado(
  objectId: ObjectId,
  metodo: string,
  referenciaExterna: string
): Promise<void> {
  const colecao = await colecaoPedidos();
  const pedidoPromovido = await colecao.findOneAndUpdate(
    { _id: objectId, status: { $ne: "pago" } },
    {
      $set: {
        status: "pago",
        "pagamento.metodo": metodo,
        "pagamento.status": "aprovado",
        "pagamento.referenciaExterna": referenciaExterna,
        atualizadoEm: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  if (pedidoPromovido) {
    await abaterEstoquePedido(pedidoPromovido);
  }
}

/**
 * Registra uma nova tentativa de pagamento no pedido e atualiza o resumo
 * (`pagamento.metodo/status/referenciaExterna`) para refletir esta tentativa,
 * a mais recente. Se a resposta síncrona do Mercado Pago já vier aprovada
 * (comum em cartão à vista), promove o pedido a "pago" imediatamente — sem
 * esperar o webhook, que ainda confirma de forma idempotente depois.
 */
export async function registrarTentativa(
  pedidoId: string,
  tentativa: TentativaPagamento
): Promise<void> {
  const colecao = await colecaoPedidos();
  const objectId = new ObjectId(pedidoId);

  await colecao.updateOne(
    { _id: objectId },
    {
      $push: { "pagamento.tentativas": tentativa },
      $set: {
        "pagamento.metodo": tentativa.metodo,
        "pagamento.status": tentativa.status,
        "pagamento.referenciaExterna": tentativa.referenciaExterna,
        atualizadoEm: tentativa.criadoEm,
      },
    }
  );

  if (tentativa.status === "aprovado") {
    await promoverPedidoSeAprovado(objectId, tentativa.metodo, tentativa.referenciaExterna);
  }
}

/**
 * Atualiza o status de uma tentativa existente (por `referenciaExterna`) e,
 * quando o novo status é "aprovado", promove o pedido para "pago" de forma
 * condicional/idempotente — reprocessar a mesma notificação não tem efeito
 * adicional (data-model.md #3). Usado pelo webhook.
 */
export async function atualizarStatusTentativa(
  pedidoId: string,
  referenciaExterna: string,
  novoStatus: StatusTentativaPagamento,
  metodo: string
): Promise<void> {
  const colecao = await colecaoPedidos();
  const objectId = new ObjectId(pedidoId);
  const agora = new Date();

  const resultado = await colecao.updateOne(
    { _id: objectId, "pagamento.tentativas.referenciaExterna": referenciaExterna },
    {
      $set: {
        "pagamento.tentativas.$.status": novoStatus,
        "pagamento.tentativas.$.atualizadoEm": agora,
        atualizadoEm: agora,
      },
    }
  );

  // Corrida rara: o webhook chegou antes de a tentativa ser registrada localmente.
  if (resultado.matchedCount === 0) {
    await colecao.updateOne(
      { _id: objectId },
      {
        $push: {
          "pagamento.tentativas": {
            referenciaExterna,
            metodo,
            status: novoStatus,
            valor: 0,
            criadoEm: agora,
            atualizadoEm: agora,
          },
        },
        $set: { atualizadoEm: agora },
      }
    );
  }

  if (novoStatus === "aprovado") {
    await promoverPedidoSeAprovado(objectId, metodo, referenciaExterna);
  }
}
