import { MercadoPagoConfig, Payment } from "mercadopago";

export type PagamentoRequisicao = Parameters<Payment["create"]>[0]["body"];
export type PagamentoResposta = Awaited<ReturnType<Payment["get"]>>;

let clientePagamento: Payment | undefined;

function getPaymentClient(): Payment {
  if (!clientePagamento) {
    const config = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });
    clientePagamento = new Payment(config);
  }
  return clientePagamento;
}

export async function criarPagamento(body: PagamentoRequisicao): Promise<PagamentoResposta> {
  return getPaymentClient().create({ body });
}

export async function buscarPagamento(id: string | number): Promise<PagamentoResposta> {
  return getPaymentClient().get({ id });
}
