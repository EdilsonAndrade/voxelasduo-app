import { NextResponse } from "next/server";
import {
  buscarPedidoPorId,
  existeTentativaAtivaRecente,
  registrarTentativa,
} from "@/lib/pagamentos/repository";
import { criarPagamento, type PagamentoRequisicao } from "@/lib/pagamentos/mercadopago";
import { mapearStatusMercadoPago } from "@/lib/pagamentos/status";
import { centavosParaReais } from "@/lib/pagamentos/conversao";

interface PagamentosRequestBody {
  pedidoId?: string;
  formData?: Record<string, unknown>;
}

export async function POST(request: Request) {
  const body = (await request.json()) as PagamentosRequestBody;
  const { pedidoId, formData } = body;

  if (!pedidoId || !formData) {
    return NextResponse.json({ erro: "pedidoId e formData são obrigatórios." }, { status: 400 });
  }

  const pedido = await buscarPedidoPorId(pedidoId);
  if (!pedido) {
    return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  }

  if (pedido.status === "pago") {
    return NextResponse.json({ erro: "Este pedido já está pago." }, { status: 409 });
  }

  if (await existeTentativaAtivaRecente(pedidoId)) {
    return NextResponse.json(
      { erro: "Já existe uma tentativa de pagamento em andamento para este pedido." },
      { status: 409 }
    );
  }

  // O valor cobrado é sempre o do pedido lido do banco — nunca o que vier do cliente (FR-004).
  const requisicao = {
    ...formData,
    transaction_amount: centavosParaReais(pedido.valorTotal),
    external_reference: pedidoId,
  } as PagamentoRequisicao;

  let resposta;
  try {
    resposta = await criarPagamento(requisicao);
  } catch {
    return NextResponse.json({ erro: "Falha ao processar o pagamento." }, { status: 502 });
  }

  const statusMapeado = mapearStatusMercadoPago(resposta.status ?? "pending");
  const agora = new Date();

  await registrarTentativa(pedidoId, {
    referenciaExterna: String(resposta.id),
    metodo: resposta.payment_method_id ?? "desconhecido",
    status: statusMapeado,
    valor: pedido.valorTotal,
    criadoEm: agora,
    atualizadoEm: agora,
  });

  return NextResponse.json(
    {
      tentativa: {
        referenciaExterna: String(resposta.id),
        metodo: resposta.payment_method_id,
        status: statusMapeado,
        detalhes: {
          qrCode: resposta.point_of_interaction?.transaction_data?.qr_code ?? null,
          qrCodeBase64: resposta.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
        },
      },
      pedido: { id: pedidoId, status: statusMapeado === "aprovado" ? "pago" : pedido.status },
    },
    { status: 201 }
  );
}
