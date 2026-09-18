import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({
  obterAccessTokenValido: vi.fn().mockResolvedValue("token-valido"),
}));

const { buscarPerguntaMercadoLivre, responderPerguntaMercadoLivre } = await import("./perguntas");

describe("buscarPerguntaMercadoLivre", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("mapeia uma pergunta ainda sem resposta", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 123456789,
          item_id: "MLB123",
          text: "Tem em azul?",
          status: "UNANSWERED",
          answer: null,
        }),
      })
    );

    const pergunta = await buscarPerguntaMercadoLivre("123456789");

    expect(pergunta).toEqual({
      perguntaId: "123456789",
      itemId: "MLB123",
      texto: "Tem em azul?",
      respondida: false,
    });
  });

  it("mapeia uma pergunta já respondida", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 123456789,
          item_id: "MLB123",
          text: "Tem em azul?",
          status: "ANSWERED",
          answer: { text: "Sim!" },
        }),
      })
    );

    const pergunta = await buscarPerguntaMercadoLivre("123456789");

    expect(pergunta.respondida).toBe(true);
  });

  it("lança erro quando a API responde com falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => "" }));

    await expect(buscarPerguntaMercadoLivre("123456789")).rejects.toThrow("HTTP 404");
  });
});

describe("responderPerguntaMercadoLivre", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envia question_id e text para POST /answers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await responderPerguntaMercadoLivre("123456789", "Sim, temos em azul!");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadolibre.com/answers",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ question_id: 123456789, text: "Sim, temos em azul!" }),
      })
    );
  });

  it("lança erro quando a API responde com falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => "motivo" })
    );

    await expect(responderPerguntaMercadoLivre("123456789", "texto")).rejects.toThrow("HTTP 400");
  });
});
