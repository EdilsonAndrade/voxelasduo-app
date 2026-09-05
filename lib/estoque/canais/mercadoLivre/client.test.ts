import { afterEach, describe, expect, it, vi } from "vitest";
import { mercadoLivreClient } from "./client";

vi.mock("./auth", () => ({
  obterAccessTokenValido: vi.fn().mockResolvedValue("token-valido"),
}));

describe("mercadoLivreClient.atualizarQuantidade", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("chama a API do Mercado Livre com o token e a nova quantidade", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await mercadoLivreClient.atualizarQuantidade("MLB123", 7);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadolibre.com/items/MLB123",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({ Authorization: "Bearer token-valido" }),
        body: JSON.stringify({ available_quantity: 7 }),
      })
    );
  });

  it("lança erro quando a API responde com falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(mercadoLivreClient.atualizarQuantidade("MLB123", 7)).rejects.toThrow(
      "HTTP 500"
    );
  });
});
