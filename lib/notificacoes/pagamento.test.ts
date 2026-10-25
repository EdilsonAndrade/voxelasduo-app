import { ObjectId } from "mongodb";
import { MPNotFoundError } from "mercadopago";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buscarPagamento: vi.fn(),
  atualizarStatusTentativa: vi.fn(),
  registrarFalhaPagamento: vi.fn(),
}));

vi.mock("@/lib/pagamentos/mercadopago", () => ({ buscarPagamento: mocks.buscarPagamento }));
vi.mock("@/lib/pagamentos/repository", () => ({
  atualizarStatusTentativa: mocks.atualizarStatusTentativa,
  registrarFalhaPagamento: mocks.registrarFalhaPagamento,
}));

const { processarPagamentoMercadoPago } = await import("./pagamento");

const pedidoId = new ObjectId().toString();

describe("processarPagamentoMercadoPago", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("aprovado → atualiza a tentativa e responde 200", async () => {
    mocks.buscarPagamento.mockResolvedValue({ id: 1, status: "approved", external_reference: pedidoId, payment_method_id: "pix" });
    mocks.atualizarStatusTentativa.mockResolvedValue("promovido");

    const resposta = await processarPagamentoMercadoPago("1");

    expect(resposta.status).toBe(200);
    expect(mocks.atualizarStatusTentativa).toHaveBeenCalledWith(pedidoId, "1", "aprovado", "pix");
    expect(mocks.registrarFalhaPagamento).not.toHaveBeenCalled();
  });

  it("pagamento inexistente no MP → 200 (sem reenvio) e log", async () => {
    mocks.buscarPagamento.mockRejectedValue(new MPNotFoundError({ status: 404, message: "not found" } as never));

    const resposta = await processarPagamentoMercadoPago("123456");

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toMatchObject({ ignorado: "pagamento_nao_encontrado" });
    expect(console.warn).toHaveBeenCalled();
  });

  it("falha transitória ao consultar → 500 e log de erro", async () => {
    mocks.buscarPagamento.mockRejectedValue(new Error("timeout"));

    const resposta = await processarPagamentoMercadoPago("1");

    expect(resposta.status).toBe(500);
    expect(console.error).toHaveBeenCalled();
  });

  it("recusado → registra o motivo no pedido", async () => {
    mocks.buscarPagamento.mockResolvedValue({ id: 1, status: "rejected", external_reference: pedidoId });
    mocks.atualizarStatusTentativa.mockResolvedValue(null);

    await processarPagamentoMercadoPago("1");

    expect(mocks.registrarFalhaPagamento).toHaveBeenCalledWith(
      pedidoId,
      expect.objectContaining({ codigo: "recusado", origem: "notificacao" })
    );
  });

  it("aprovado em pedido cancelado → registra o motivo", async () => {
    mocks.buscarPagamento.mockResolvedValue({ id: 1, status: "approved", external_reference: pedidoId });
    mocks.atualizarStatusTentativa.mockResolvedValue("cancelado");

    await processarPagamentoMercadoPago("1");

    expect(mocks.registrarFalhaPagamento).toHaveBeenCalledWith(
      pedidoId,
      expect.objectContaining({ codigo: "aprovado_pedido_cancelado" })
    );
  });

  it("pagamento sem referência a pedido → 200 sem atualizar", async () => {
    mocks.buscarPagamento.mockResolvedValue({ id: 1, status: "approved" });

    const resposta = await processarPagamentoMercadoPago("1");

    expect(resposta.status).toBe(200);
    expect(mocks.atualizarStatusTentativa).not.toHaveBeenCalled();
  });
});
