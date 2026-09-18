import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({
  obterAccessTokenValido: vi.fn().mockResolvedValue("token-valido"),
}));

const { buscarMensagemMercadoLivre, responderMensagemMercadoLivre } = await import("./mensagens");

function mockFetchSequencial(...respostas: unknown[]) {
  const fetchMock = vi.fn();
  for (const resposta of respostas) {
    fetchMock.mockResolvedValueOnce(resposta);
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("buscarMensagemMercadoLivre", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("busca o vendedor e retorna a última mensagem do pack", async () => {
    mockFetchSequencial(
      { ok: true, json: async () => ({ id: 42 }) },
      {
        ok: true,
        json: async () => ({
          messages: [
            { id: "msg-1", text: "Oi", status: "READ" },
            { id: "msg-2", text: "Chegou quando?", status: "UNREAD" },
          ],
        }),
      }
    );

    const mensagem = await buscarMensagemMercadoLivre("pack-999");

    expect(mensagem).toEqual({
      mensagemId: "msg-2",
      pedidoExternoId: "pack-999",
      texto: "Chegou quando?",
      pendente: true,
    });
  });

  it("lança erro quando falha ao identificar o vendedor", async () => {
    mockFetchSequencial({ ok: false, status: 401, text: async () => "" });

    await expect(buscarMensagemMercadoLivre("pack-999")).rejects.toThrow("HTTP 401");
  });
});

describe("responderMensagemMercadoLivre", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envia o texto para o pack do vendedor", async () => {
    const fetchMock = mockFetchSequencial(
      { ok: true, json: async () => ({ id: 42 }) },
      { ok: true }
    );

    await responderMensagemMercadoLivre("pack-999", "Chega amanhã!");

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.mercadolibre.com/messages/packs/pack-999/sellers/42",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ text: "Chega amanhã!" }) })
    );
  });
});
