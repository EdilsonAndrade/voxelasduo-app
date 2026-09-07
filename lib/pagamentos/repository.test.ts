import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TentativaPagamento } from "@/lib/models/pedido";

const { abaterEstoquePedido } = vi.hoisted(() => ({ abaterEstoquePedido: vi.fn() }));
const { enviarConfirmacaoPedido } = vi.hoisted(() => ({ enviarConfirmacaoPedido: vi.fn() }));
const { updateOne, findOneAndUpdate } = vi.hoisted(() => ({
  updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 }),
  findOneAndUpdate: vi.fn(),
}));
const { buscarPedidoPorId } = vi.hoisted(() => ({ buscarPedidoPorId: vi.fn() }));

vi.mock("@/lib/estoque/abatimento", () => ({ abaterEstoquePedido }));
vi.mock("@/lib/email/resend", () => ({ enviarConfirmacaoPedido }));
vi.mock("@/lib/pedidos/repository", () => ({
  buscarPedidoPorId,
  colecaoPedidos: vi.fn().mockResolvedValue({ updateOne, findOneAndUpdate }),
}));

const { registrarTentativa, atualizarStatusTentativa } = await import("./repository");

function criarTentativa(overrides: Partial<TentativaPagamento> = {}): TentativaPagamento {
  return {
    referenciaExterna: "pagamento-1",
    metodo: "pix",
    status: "aprovado",
    valor: 13000,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...overrides,
  };
}

const pedidoId = new ObjectId().toString();

describe("promoverPedidoSeAprovado (via registrarTentativa/atualizarStatusTentativa)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateOne.mockResolvedValue({ matchedCount: 1 });
  });

  it("dispara enviarConfirmacaoPedido exatamente uma vez quando de fato promove o pedido a pago", async () => {
    const pedidoPromovido = { _id: new ObjectId(pedidoId), status: "pago" };
    findOneAndUpdate.mockResolvedValueOnce(pedidoPromovido);

    await registrarTentativa(pedidoId, criarTentativa());

    expect(abaterEstoquePedido).toHaveBeenCalledTimes(1);
    expect(abaterEstoquePedido).toHaveBeenCalledWith(pedidoPromovido);
    expect(enviarConfirmacaoPedido).toHaveBeenCalledTimes(1);
    expect(enviarConfirmacaoPedido).toHaveBeenCalledWith(pedidoPromovido);
  });

  it("não dispara de novo quando a mesma aprovação é reprocessada (pedido já estava pago)", async () => {
    // findOneAndUpdate com filtro { status: { $ne: "pago" } } não encontra o documento na segunda vez.
    findOneAndUpdate.mockResolvedValueOnce(null);

    await atualizarStatusTentativa(pedidoId, "pagamento-1", "aprovado", "pix");

    expect(abaterEstoquePedido).not.toHaveBeenCalled();
    expect(enviarConfirmacaoPedido).not.toHaveBeenCalled();
  });

  it("não dispara a confirmação quando a tentativa não foi aprovada", async () => {
    await registrarTentativa(pedidoId, criarTentativa({ status: "pendente" }));

    expect(findOneAndUpdate).not.toHaveBeenCalled();
    expect(enviarConfirmacaoPedido).not.toHaveBeenCalled();
  });
});
