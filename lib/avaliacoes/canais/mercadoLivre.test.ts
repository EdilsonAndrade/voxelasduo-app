import { beforeEach, describe, expect, it, vi } from "vitest";

const { obterAccessTokenValido } = vi.hoisted(() => ({ obterAccessTokenValido: vi.fn() }));
vi.mock("@/lib/estoque/canais/mercadoLivre/auth", () => ({ obterAccessTokenValido }));

const { mercadoLivreAvaliacoesClient } = await import("./mercadoLivre");

describe("mercadoLivreAvaliacoesClient.buscarAvaliacoes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obterAccessTokenValido.mockResolvedValue("token-123");
  });

  it("mapeia a lista de reviews do Mercado Livre para o formato comum", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reviews: [
          { id: 1, rate: 5, comment: "Excelente!", date_created: "2026-09-01T12:00:00.000Z" },
          { id: 2, rate: 4, comment: null, date_created: "2026-08-28T09:30:00.000Z" },
        ],
      }),
    }) as unknown as typeof fetch;

    const avaliacoes = await mercadoLivreAvaliacoesClient.buscarAvaliacoes("MLB123");

    expect(avaliacoes).toEqual([
      {
        avaliacaoIdCanal: "1",
        nota: 5,
        comentario: "Excelente!",
        dataAvaliacao: new Date("2026-09-01T12:00:00.000Z"),
      },
      {
        avaliacaoIdCanal: "2",
        nota: 4,
        comentario: undefined,
        dataAvaliacao: new Date("2026-08-28T09:30:00.000Z"),
      },
    ]);
  });

  it("propaga um erro descritivo quando a API responde com falha", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"message":"invalid_token"}',
    }) as unknown as typeof fetch;

    await expect(mercadoLivreAvaliacoesClient.buscarAvaliacoes("MLB123")).rejects.toThrow(
      /invalid_token/
    );
  });
});
