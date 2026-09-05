import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({
  obterAccessTokenValido: vi.fn().mockResolvedValue("token-valido"),
}));

const { preverCategoriaMercadoLivre } = await import("./previsorCategoria");

describe("preverCategoriaMercadoLivre", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retorna o category_id do primeiro resultado", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ category_id: "MLB12345" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const categoryId = await preverCategoriaMercadoLivre("Chaveiro VoXElas Duo");

    expect(categoryId).toBe("MLB12345");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadolibre.com/sites/MLB/domain_discovery/search?limit=1&q=Chaveiro%20VoXElas%20Duo",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-valido" }) })
    );
  });

  it("retorna undefined quando o previsor não encontra correspondência", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    const categoryId = await preverCategoriaMercadoLivre("Produto sem categoria óbvia");

    expect(categoryId).toBeUndefined();
  });

  it("lança erro quando a API responde com falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "" }));

    await expect(preverCategoriaMercadoLivre("Chaveiro")).rejects.toThrow("HTTP 500");
  });
});
