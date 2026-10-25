import { ObjectId } from "mongodb";
import { MPNotFoundError } from "mercadopago";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buscarPagamento: vi.fn(),
  buscarPedidoPorId: vi.fn(),
  atualizarStatusTentativa: vi.fn(),
  registrarFalhaPagamento: vi.fn(),
  find: vi.fn(),
}));

vi.mock("./mercadopago", () => ({ buscarPagamento: mocks.buscarPagamento }));
vi.mock("./repository", () => ({
  buscarPedidoPorId: mocks.buscarPedidoPorId,
  atualizarStatusTentativa: mocks.atualizarStatusTentativa,
  registrarFalhaPagamento: mocks.registrarFalhaPagamento,
}));
vi.mock("@/lib/pedidos/repository", () => ({
  colecaoPedidos: vi.fn().mockResolvedValue({ find: mocks.find }),
}));

const { verificarPagamentoPedido, conferirPendentesRecentes } = await import("./verificacao");

const pedidoId = new ObjectId().toString();

function pedido(overrides: Record<string, unknown> = {}) {
  return {
    _id: new ObjectId(pedidoId),
    canalOrigem: "site",
    status: "pendente",
    pagamento: {
      tentativas: [{ referenciaExterna: "185473117082", metodo: "pix", status: "pendente" }],
    },
    ...overrides,
  };
}

describe("verificarPagamentoPedido", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.buscarPedidoPorId.mockResolvedValue(pedido());
  });

  it("aprovado → promove (pago) sem registrar falha", async () => {
    mocks.buscarPagamento.mockResolvedValue({ status: "approved", payment_method_id: "pix" });
    mocks.atualizarStatusTentativa.mockResolvedValue("promovido");

    const resultado = await verificarPagamentoPedido(pedidoId, "admin");

    expect(resultado.resultado).toBe("pago");
    expect(mocks.atualizarStatusTentativa).toHaveBeenCalledWith(pedidoId, "185473117082", "aprovado", "pix");
    expect(mocks.registrarFalhaPagamento).not.toHaveBeenCalled();
  });

  it("pedido já pago → não consulta o MP", async () => {
    mocks.buscarPedidoPorId.mockResolvedValue(pedido({ status: "pago" }));

    const resultado = await verificarPagamentoPedido(pedidoId, "admin");

    expect(resultado.resultado).toBe("pago");
    expect(mocks.buscarPagamento).not.toHaveBeenCalled();
  });

  it("pendente pelo admin → registra o motivo", async () => {
    mocks.buscarPagamento.mockResolvedValue({ status: "pending" });

    const resultado = await verificarPagamentoPedido(pedidoId, "admin");

    expect(resultado.resultado).toBe("pendente");
    expect(mocks.atualizarStatusTentativa).not.toHaveBeenCalled();
    expect(mocks.registrarFalhaPagamento).toHaveBeenCalledWith(
      pedidoId,
      expect.objectContaining({ codigo: "pendente", origem: "admin" })
    );
  });

  it("pendente pela tela do cliente → não registra (polling)", async () => {
    mocks.buscarPagamento.mockResolvedValue({ status: "pending" });

    await verificarPagamentoPedido(pedidoId, "cliente");

    expect(mocks.registrarFalhaPagamento).not.toHaveBeenCalled();
  });

  it("recusado → atualiza a tentativa e registra o motivo", async () => {
    mocks.buscarPagamento.mockResolvedValue({ status: "rejected" });
    mocks.atualizarStatusTentativa.mockResolvedValue(null);

    const resultado = await verificarPagamentoPedido(pedidoId, "cliente");

    expect(resultado.resultado).toBe("recusado");
    expect(mocks.atualizarStatusTentativa).toHaveBeenCalledWith(pedidoId, "185473117082", "recusado", "pix");
    expect(mocks.registrarFalhaPagamento).toHaveBeenCalledWith(pedidoId, expect.objectContaining({ codigo: "recusado" }));
  });

  it("sem tentativa → sem_tentativa", async () => {
    mocks.buscarPedidoPorId.mockResolvedValue(pedido({ pagamento: { tentativas: [] } }));

    const resultado = await verificarPagamentoPedido(pedidoId, "automatica");

    expect(resultado.resultado).toBe("sem_tentativa");
    expect(mocks.buscarPagamento).not.toHaveBeenCalled();
  });

  it("pagamento não encontrado no MP → nao_encontrado", async () => {
    mocks.buscarPagamento.mockRejectedValue(new MPNotFoundError({ status: 404, message: "x" } as never));

    const resultado = await verificarPagamentoPedido(pedidoId, "admin");

    expect(resultado.resultado).toBe("nao_encontrado");
  });

  it("falha ao consultar o MP → falha com motivo registrado", async () => {
    mocks.buscarPagamento.mockRejectedValue(new Error("timeout"));

    const resultado = await verificarPagamentoPedido(pedidoId, "admin");

    expect(resultado.resultado).toBe("falha");
    expect(mocks.registrarFalhaPagamento).toHaveBeenCalledWith(
      pedidoId,
      expect.objectContaining({ codigo: "falha_consulta" })
    );
  });

  it("aprovado em pedido cancelado → aprovado_pedido_cancelado", async () => {
    mocks.buscarPedidoPorId.mockResolvedValue(pedido({ status: "cancelado" }));
    mocks.buscarPagamento.mockResolvedValue({ status: "approved" });
    mocks.atualizarStatusTentativa.mockResolvedValue("cancelado");

    const resultado = await verificarPagamentoPedido(pedidoId, "automatica");

    expect(resultado.resultado).toBe("aprovado_pedido_cancelado");
  });

  it("pedido de outro canal → nao_e_do_site", async () => {
    mocks.buscarPedidoPorId.mockResolvedValue(pedido({ canalOrigem: "mercado_livre" }));

    expect((await verificarPagamentoPedido(pedidoId, "admin")).resultado).toBe("nao_e_do_site");
  });

  it("id inválido → pedido_inexistente", async () => {
    expect((await verificarPagamentoPedido("abc", "admin")).resultado).toBe("pedido_inexistente");
  });
});

describe("conferirPendentesRecentes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("confere os pendentes e resume pagos/falhas", async () => {
    const ids = [new ObjectId(), new ObjectId()];
    mocks.find.mockReturnValue({
      sort: () => ({ limit: () => ({ toArray: () => Promise.resolve(ids.map((_id) => ({ _id }))) }) }),
    });
    mocks.buscarPedidoPorId.mockImplementation((id: string) => Promise.resolve(pedido({ _id: new ObjectId(id) })));
    mocks.buscarPagamento.mockResolvedValueOnce({ status: "approved" }).mockRejectedValueOnce(new Error("x"));
    mocks.atualizarStatusTentativa.mockResolvedValue("promovido");
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const resumo = await conferirPendentesRecentes();

    expect(resumo).toEqual({ conferidos: 2, pagos: 1, falhas: 1 });
    expect(mocks.find.mock.calls[0][0]).toMatchObject({ canalOrigem: "site", status: "pendente" });
  });
});
