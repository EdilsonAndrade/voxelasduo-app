import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({
  obterAccessTokenValido: vi.fn().mockResolvedValue("token-valido"),
}));

const { buscarReclamacaoMercadoLivre, responderReclamacaoMercadoLivre } = await import(
  "./reclamacoes"
);

describe("buscarReclamacaoMercadoLivre", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("mapeia uma reclamação aberta", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 555,
          resource_id: "999",
          reason: "product_not_as_described",
          status: "opened",
        }),
      })
    );

    const reclamacao = await buscarReclamacaoMercadoLivre("555");

    expect(reclamacao).toEqual({
      reclamacaoId: "555",
      pedidoExternoId: "999",
      motivo: "product_not_as_described",
      aberta: true,
    });
  });

  it("mapeia uma reclamação fechada", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 555, status: "closed" }),
      })
    );

    const reclamacao = await buscarReclamacaoMercadoLivre("555");

    expect(reclamacao.aberta).toBe(false);
  });

  it("lança erro quando a API responde com falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => "" }));

    await expect(buscarReclamacaoMercadoLivre("555")).rejects.toThrow("HTTP 404");
  });
});

describe("responderReclamacaoMercadoLivre", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envia a mensagem para a rota de mensagens da reclamação", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await responderReclamacaoMercadoLivre("555", "Vamos resolver!");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadolibre.com/post-purchase/v1/claims/555/messages",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ message: "Vamos resolver!" }) })
    );
  });

  it("lança erro quando a API responde com falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => "motivo" })
    );

    await expect(responderReclamacaoMercadoLivre("555", "texto")).rejects.toThrow("HTTP 400");
  });
});
