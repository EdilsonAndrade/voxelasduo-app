import { beforeEach, describe, expect, it, vi } from "vitest";

const { verificarPagamentoPedido } = vi.hoisted(() => ({ verificarPagamentoPedido: vi.fn() }));
vi.mock("@/lib/pagamentos/verificacao", () => ({ verificarPagamentoPedido }));

const { POST } = await import("./route");

function chamar(id = "abc") {
  return POST(new Request(`http://localhost/api/pedidos/${id}/verificar-pagamento`, { method: "POST" }), {
    params: Promise.resolve({ id }),
  });
}

describe("POST /api/pedidos/[id]/verificar-pagamento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("pago → 200 com status do pedido", async () => {
    verificarPagamentoPedido.mockResolvedValue({ resultado: "pago", mensagem: "ok" });
    const resposta = await chamar();
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toMatchObject({ resultado: "pago", pedido: { status: "pago" } });
    expect(verificarPagamentoPedido).toHaveBeenCalledWith("abc", "admin");
  });

  it("pendente → 200 com mensagem", async () => {
    verificarPagamentoPedido.mockResolvedValue({ resultado: "pendente", mensagem: "pendente" });
    const resposta = await chamar();
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toMatchObject({ resultado: "pendente", mensagem: "pendente" });
  });

  it.each([
    ["pedido_inexistente", 404],
    ["nao_e_do_site", 409],
    ["falha", 502],
  ])("%s → %i", async (resultado, status) => {
    verificarPagamentoPedido.mockResolvedValue({ resultado, mensagem: "x" });
    expect((await chamar()).status).toBe(status);
  });

  it("erro inesperado → 502", async () => {
    verificarPagamentoPedido.mockRejectedValue(new Error("db"));
    expect((await chamar()).status).toBe(502);
  });
});
