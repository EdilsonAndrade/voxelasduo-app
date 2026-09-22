import { beforeEach, describe, expect, it, vi } from "vitest";

const { buscarTendenciasGerais } = vi.hoisted(() => ({
  buscarTendenciasGerais: vi.fn(),
}));

vi.mock("@/lib/estoque/canais/mercadoLivre/tendencias", () => ({ buscarTendenciasGerais }));

const { obterComCache } = vi.hoisted(() => ({ obterComCache: vi.fn() }));

vi.mock("@/lib/tendencias/cache", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/tendencias/cache")>();
  return { ...real, obterComCache };
});

const { GET } = await import("./route");

function get(forcar?: boolean) {
  const url = new URL("http://localhost/api/admin/tendencias/gerais");
  if (forcar) url.searchParams.set("forcar", "true");
  return GET(new Request(url));
}

describe("GET /api/admin/tendencias/gerais", () => {
  beforeEach(() => vi.clearAllMocks());

  it("200 com os termos em alta (origem novo)", async () => {
    obterComCache.mockImplementation(async ({ buscarNovo }: { buscarNovo: () => Promise<unknown> }) => ({
      dados: await buscarNovo(),
      origem: "novo" as const,
      obtidoEm: new Date("2026-09-21T21:00:00.000Z"),
      avisoDesatualizado: false,
    }));
    buscarTendenciasGerais.mockResolvedValue([
      { termo: "cadeira gamer", url: "https://lista.mercadolivre.com.br/cadeira-gamer" },
    ]);

    const resposta = await get();
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.origem).toBe("novo");
    expect(corpo.termos).toHaveLength(1);
  });

  it("devolve origem cache sem chamar o Mercado Livre", async () => {
    obterComCache.mockResolvedValue({
      dados: { termos: [] },
      origem: "cache",
      obtidoEm: new Date("2026-09-21T10:00:00.000Z"),
      avisoDesatualizado: false,
    });

    const resposta = await get();
    const corpo = await resposta.json();

    expect(corpo.origem).toBe("cache");
    expect(buscarTendenciasGerais).not.toHaveBeenCalled();
  });

  it("repassa forcar=true para obterComCache", async () => {
    obterComCache.mockResolvedValue({
      dados: { termos: [] },
      origem: "novo",
      obtidoEm: new Date(),
      avisoDesatualizado: false,
    });

    await get(true);

    expect(obterComCache).toHaveBeenCalledWith(expect.objectContaining({ forcar: true }));
  });

  it("US4: 200 com avisoDesatualizado quando obterComCache faz fallback ao cache vencido", async () => {
    obterComCache.mockResolvedValue({
      dados: { termos: [] },
      origem: "cache",
      obtidoEm: new Date("2026-09-20T10:00:00.000Z"),
      avisoDesatualizado: true,
    });

    const resposta = await get();
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.avisoDesatualizado).toBe(true);
  });

  it("401 quando o token do Mercado Livre é inválido", async () => {
    obterComCache.mockRejectedValue(new Error("Falha ao renovar token do Mercado Livre (HTTP 400)."));

    const resposta = await get();

    expect(resposta.status).toBe(401);
    expect((await resposta.json()).erro).toBe("token_invalido");
  });

  it("502 numa falha genérica do Mercado Livre", async () => {
    obterComCache.mockRejectedValue(new Error("Falha ao consultar (HTTP 500)."));

    const resposta = await get();

    expect(resposta.status).toBe(502);
    expect((await resposta.json()).erro).toBe("falha_mercado_livre");
  });
});
