import { beforeEach, describe, expect, it, vi } from "vitest";

const { preverCategoriaParaTendencia, buscarMaisVendidosCategoria } = vi.hoisted(() => ({
  preverCategoriaParaTendencia: vi.fn(),
  buscarMaisVendidosCategoria: vi.fn(),
}));

vi.mock("@/lib/estoque/canais/mercadoLivre/tendencias", () => ({
  preverCategoriaParaTendencia,
  buscarMaisVendidosCategoria,
}));

const { obterComCache } = vi.hoisted(() => ({ obterComCache: vi.fn() }));

vi.mock("@/lib/tendencias/cache", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/tendencias/cache")>();
  return { ...real, obterComCache, normalizarTermo: (termo: string) => termo.trim().toLowerCase() };
});

const { GET } = await import("./route");
const { ErroNaoEncontrado } = await import("@/lib/tendencias/cache");

function get(termo?: string, forcar?: boolean) {
  const url = new URL("http://localhost/api/admin/tendencias");
  if (termo !== undefined) url.searchParams.set("termo", termo);
  if (forcar) url.searchParams.set("forcar", "true");
  return GET(new Request(url));
}

/** Simula `obterComCache` chamando de verdade o `buscarNovo` recebido, como o real faria numa entrada nova de cache. */
function comoNovo(avisoDesatualizado = false) {
  return obterComCache.mockImplementation(async ({ buscarNovo }: { buscarNovo: () => Promise<unknown> }) => ({
    dados: await buscarNovo(),
    origem: "novo" as const,
    obtidoEm: new Date("2026-09-21T21:00:00.000Z"),
    avisoDesatualizado,
  }));
}

describe("GET /api/admin/tendencias", () => {
  beforeEach(() => vi.clearAllMocks());

  it("200 com o ranking quando a categoria é resolvida (origem novo)", async () => {
    comoNovo();
    preverCategoriaParaTendencia.mockResolvedValue({
      categoryId: "MLB439316",
      categoriaNome: "Chaveiros",
    });
    buscarMaisVendidosCategoria.mockResolvedValue([
      { posicao: 1, id: "MLB1", tipo: "PRODUCT", nome: "Chaveiro Estrela" },
    ]);

    const resposta = await get("chaveiro personalizado");
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.origem).toBe("novo");
    expect(corpo.categoriaId).toBe("MLB439316");
    expect(corpo.ranking).toHaveLength(1);
    expect(buscarMaisVendidosCategoria).toHaveBeenCalledWith("MLB439316");
  });

  it("devolve origem cache sem chamar o Mercado Livre", async () => {
    obterComCache.mockResolvedValue({
      dados: { categoriaId: "MLB439316", categoriaNome: "Chaveiros", ranking: [] },
      origem: "cache",
      obtidoEm: new Date("2026-09-21T10:00:00.000Z"),
      avisoDesatualizado: false,
    });

    const resposta = await get("chaveiro personalizado");
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.origem).toBe("cache");
    expect(preverCategoriaParaTendencia).not.toHaveBeenCalled();
    expect(buscarMaisVendidosCategoria).not.toHaveBeenCalled();
  });

  it("repassa forcar=true para obterComCache", async () => {
    comoNovo();
    preverCategoriaParaTendencia.mockResolvedValue({ categoryId: "MLB1" });
    buscarMaisVendidosCategoria.mockResolvedValue([]);

    await get("chaveiro", true);

    expect(obterComCache).toHaveBeenCalledWith(expect.objectContaining({ forcar: true }));
  });

  it("400 quando o termo está vazio ou só com espaços", async () => {
    const resposta = await get("   ");
    expect(resposta.status).toBe(400);
    expect((await resposta.json()).erro).toBe("termo_invalido");
    expect(obterComCache).not.toHaveBeenCalled();
  });

  it("400 quando o termo não é informado", async () => {
    const resposta = await get();
    expect(resposta.status).toBe(400);
  });

  it("404 quando nenhuma categoria é encontrada para o termo (ErroNaoEncontrado nunca cai em fallback)", async () => {
    comoNovo();
    preverCategoriaParaTendencia.mockResolvedValue(undefined);

    const resposta = await get("asdkjaslkdjaslkd");

    expect(resposta.status).toBe(404);
    expect((await resposta.json()).erro).toBe("categoria_nao_encontrada");
    expect(buscarMaisVendidosCategoria).not.toHaveBeenCalled();
  });

  it("US4: 200 com avisoDesatualizado quando obterComCache faz fallback ao cache vencido", async () => {
    obterComCache.mockResolvedValue({
      dados: { categoriaId: "MLB439316", categoriaNome: "Chaveiros", ranking: [] },
      origem: "cache",
      obtidoEm: new Date("2026-09-20T10:00:00.000Z"),
      avisoDesatualizado: true,
    });

    const resposta = await get("chaveiro personalizado");
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.origem).toBe("cache");
    expect(corpo.avisoDesatualizado).toBe(true);
  });

  it("401 quando o token do Mercado Livre é inválido", async () => {
    obterComCache.mockRejectedValue(new Error("Falha ao renovar token do Mercado Livre (HTTP 400)."));

    const resposta = await get("chaveiro");

    expect(resposta.status).toBe(401);
    expect((await resposta.json()).erro).toBe("token_invalido");
  });

  it("502 numa falha genérica do Mercado Livre — status real, não mascarado", async () => {
    obterComCache.mockRejectedValue(
      new Error("Falha ao consultar os mais vendidos no Mercado Livre (HTTP 403): forbidden")
    );

    const resposta = await get("chaveiro");

    expect(resposta.status).toBe(502);
    expect((await resposta.json()).erro).toBe("falha_mercado_livre");
  });

  it("ErroNaoEncontrado propagado por buscarNovo nunca vira 502", async () => {
    comoNovo();
    preverCategoriaParaTendencia.mockRejectedValue(new ErroNaoEncontrado("x"));

    const resposta = await get("chaveiro");

    expect(resposta.status).toBe(404);
  });
});
