import { ObjectId } from "mongodb";
import { MPNotFoundError } from "mercadopago";
import type { CodigoFalhaPagamento, OrigemVerificacaoPagamento, Pedido } from "@/lib/models/pedido";
import { colecaoPedidos } from "@/lib/pedidos/repository";
import { buscarPagamento } from "./mercadopago";
import { atualizarStatusTentativa, buscarPedidoPorId, registrarFalhaPagamento } from "./repository";
import { mapearStatusMercadoPago } from "./status";
import { falha, MENSAGENS_FALHA_PAGAMENTO } from "./falhas";

export type ResultadoVerificacao =
  | "pago"
  | "pendente"
  | "recusado"
  | "expirado"
  | "sem_tentativa"
  | "nao_encontrado"
  | "aprovado_pedido_cancelado"
  | "falha"
  | "pedido_inexistente"
  | "nao_e_do_site";

export interface VerificacaoPagamento {
  resultado: ResultadoVerificacao;
  mensagem: string;
}

/** Na tela do cliente (polling a cada 5s) só vale registrar o que exige ação da loja. */
const FALHAS_REGISTRADAS_PELO_CLIENTE: CodigoFalhaPagamento[] = [
  "recusado",
  "expirado",
  "aprovado_pedido_cancelado",
];

async function concluir(
  pedidoId: string,
  origem: OrigemVerificacaoPagamento,
  codigo: CodigoFalhaPagamento
): Promise<VerificacaoPagamento> {
  if (origem !== "cliente" || FALHAS_REGISTRADAS_PELO_CLIENTE.includes(codigo)) {
    await registrarFalhaPagamento(pedidoId, { ...falha(codigo), origem, em: new Date() });
  }
  return {
    resultado: codigo === "falha_consulta" ? "falha" : codigo,
    mensagem: MENSAGENS_FALHA_PAGAMENTO[codigo],
  };
}

function tentativaParaVerificar(pedido: Pedido) {
  const tentativas = pedido.pagamento?.tentativas ?? [];
  return [...tentativas].reverse().find((t) => t.status === "pendente") ?? tentativas.at(-1);
}

/**
 * Confere no Mercado Pago o pagamento de um pedido do site e conclui o pedido
 * como o aviso do MP faria (EDI-132) — caminho único da tela do cliente, do
 * botão do admin, da conferência ao abrir a lista e do cron. Idempotente: a
 * promoção a "pago" (estoque + e-mails) acontece no máximo uma vez, pela
 * condição já existente em `atualizarStatusTentativa`.
 */
export async function verificarPagamentoPedido(
  pedidoId: string,
  origem: OrigemVerificacaoPagamento
): Promise<VerificacaoPagamento> {
  const pedido = ObjectId.isValid(pedidoId) ? await buscarPedidoPorId(pedidoId) : null;
  if (!pedido) {
    return { resultado: "pedido_inexistente", mensagem: "Pedido não encontrado." };
  }
  if (pedido.canalOrigem !== "site") {
    return { resultado: "nao_e_do_site", mensagem: "Só pedidos do site são pagos pelo Mercado Pago." };
  }
  if (pedido.status === "pago") {
    return { resultado: "pago", mensagem: "Pedido já está pago." };
  }

  const tentativa = tentativaParaVerificar(pedido);
  if (!tentativa) {
    return concluir(pedidoId, origem, "sem_tentativa");
  }

  let pagamento;
  try {
    pagamento = await buscarPagamento(tentativa.referenciaExterna);
  } catch (erro) {
    if (erro instanceof MPNotFoundError) {
      return concluir(pedidoId, origem, "nao_encontrado");
    }
    console.error(`[pagamentos] falha ao verificar o pedido ${pedidoId} no Mercado Pago:`, erro);
    return concluir(pedidoId, origem, "falha_consulta");
  }

  const status = mapearStatusMercadoPago(pagamento.status ?? "pending");
  if (status === "pendente") {
    return concluir(pedidoId, origem, "pendente");
  }

  const promocao = await atualizarStatusTentativa(
    pedidoId,
    tentativa.referenciaExterna,
    status,
    pagamento.payment_method_id ?? tentativa.metodo
  );

  if (status === "aprovado") {
    if (promocao === "cancelado") {
      return concluir(pedidoId, origem, "aprovado_pedido_cancelado");
    }
    return { resultado: "pago", mensagem: "Pagamento aprovado — pedido marcado como pago e e-mails enviados." };
  }

  return concluir(pedidoId, origem, status);
}

/** Janela e limite da conferência automática (research.md #6 da spec 036). */
const DIAS_CONFERENCIA = 7;
const LIMITE_CONFERENCIA = 20;

export interface ResumoConferencia {
  conferidos: number;
  pagos: number;
  falhas: number;
}

/**
 * Confere no MP os pedidos do site ainda pendentes dos últimos 7 dias que
 * têm tentativa de pagamento — rede de segurança para avisos que não
 * chegaram. Consultas em paralelo; uma falha não interrompe as demais.
 */
export async function conferirPendentesRecentes(): Promise<ResumoConferencia> {
  const colecao = await colecaoPedidos();
  const pendentes = await colecao
    .find(
      {
        canalOrigem: "site",
        status: "pendente",
        criadoEm: { $gte: new Date(Date.now() - DIAS_CONFERENCIA * 24 * 60 * 60 * 1000) },
        "pagamento.tentativas.0": { $exists: true },
      },
      { projection: { _id: 1 } }
    )
    .sort({ criadoEm: -1 })
    .limit(LIMITE_CONFERENCIA)
    .toArray();

  const resultados = await Promise.allSettled(
    pendentes.map((pedido) => verificarPagamentoPedido(pedido._id.toString(), "automatica"))
  );

  return {
    conferidos: resultados.length,
    pagos: resultados.filter((r) => r.status === "fulfilled" && r.value.resultado === "pago").length,
    falhas: resultados.filter((r) => r.status === "rejected" || r.value.resultado === "falha").length,
  };
}
