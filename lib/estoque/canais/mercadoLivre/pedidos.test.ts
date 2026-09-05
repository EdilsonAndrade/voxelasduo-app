import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({
  obterAccessTokenValido: vi.fn().mockResolvedValue("token-valido"),
}));

const { buscarPedidoMercadoLivre } = await import("./pedidos");

describe("buscarPedidoMercadoLivre", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("mapeia um pedido com um único item", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          order_items: [{ item: { id: "MLB123" }, quantity: 2 }],
        }),
      })
    );

    const pedido = await buscarPedidoMercadoLivre("999");

    expect(pedido).toEqual({ itens: [{ itemId: "MLB123", quantidade: 2 }] });
  });

  it("mapeia um pedido com múltiplos itens", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          order_items: [
            { item: { id: "MLB123" }, quantity: 2 },
            { item: { id: "MLB456" }, quantity: 1 },
          ],
        }),
      })
    );

    const pedido = await buscarPedidoMercadoLivre("999");

    expect(pedido.itens).toHaveLength(2);
  });

  it("lança erro quando a API responde com falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    await expect(buscarPedidoMercadoLivre("999")).rejects.toThrow("HTTP 404");
  });
});
