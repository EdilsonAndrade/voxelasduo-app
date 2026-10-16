import { beforeEach, describe, expect, it, vi } from "vitest";

const { obterComCache, listarMaisVendidos, listarMaisProcurados, categoria } = vi.hoisted(() => ({
  obterComCache: vi.fn(),
  listarMaisVendidos: vi.fn(),
  listarMaisProcurados: vi.fn(),
  categoria: vi.fn(),
}));

vi.mock("@/lib/tendencias/cache", async (original) => ({
  ...(await original<typeof import("@/lib/tendencias/cache")>()),
  obterComCache,
}));
vi.mock("@/lib/produtosAlta/listas", () => ({ listarMaisVendidos, listarMaisProcurados }));
vi.mock("@/lib/produtosAlta/dependencias", () => ({ dependenciasReais: () => ({ categoria }) }));

const { GET } = await import("./route");

const banheiros = { id: "MLB1613", nome: "Banheiros", caminho: [], filhas: [] };

function get(query: string) {
  return GET(new Request(`http://localhost/api/admin/produtos-alta/lista?${query}`));
}

function comoNovo() {
  obterComCache.mockImplementation(async ({ buscarNovo }: { buscarNovo: () => Promise<unknown> }) => ({
    dados: await buscarNovo(),
    origem: "novo",
    obtidoEm: new Date("2026-10-15T18:00:00.000Z"),
    avisoDesatualizado: false,
  }));
}

describe("GET /api/admin/produtos-alta/lista", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    categoria.mockResolvedValue(banheiros);
  });

  it("400 para ordem inválida", async () => {
    const r = await get("categoria=MLB1613&ordem=preco");
    expect(r.status).toBe(400);
    expect((await r.json()).erro).toBe("ordem_invalida");
  });

  it("400 para categoria fora das 16 do 3D", async () => {
    categoria.mockResolvedValue({ id: "MLB1430", nome: "Roupas", caminho: [], filhas: [] });
    const r = await get("categoria=MLB1430&ordem=vendidos");
    expect(r.status).toBe(400);
    expect((await r.json()).erro).toBe("categoria_invalida");
  });

  it("200 com os mais vendidos e cache por ordem + categoria", async () => {
    comoNovo();
    listarMaisVendidos.mockResolvedValue([{ chave: "PRODUCT:MLB1", posicao: 1 }]);

    const r = await get("categoria=MLB1613&ordem=vendidos&forcar=true");
    const corpo = await r.json();

    expect(r.status).toBe(200);
    expect(corpo).toMatchObject({
      categoriaId: "MLB1613",
      categoriaNome: "Banheiros",
      itens: [{ chave: "PRODUCT:MLB1" }],
      origem: "novo",
      obtidoEm: "2026-10-15T18:00:00.000Z",
    });
    expect(obterComCache.mock.calls[0][0]).toMatchObject({ chave: "alta:vendidos:MLB1613", forcar: true });
  });

  it("ordem procurados usa os termos mais buscados", async () => {
    comoNovo();
    listarMaisProcurados.mockResolvedValue([]);
    await get("categoria=MLB1613&ordem=procurados");
    expect(listarMaisProcurados).toHaveBeenCalled();
    expect(obterComCache.mock.calls[0][0].chave).toBe("alta:procurados:MLB1613");
  });

  it("401 quando o token do ML não renova", async () => {
    obterComCache.mockRejectedValue(new Error("Falha ao renovar token do Mercado Livre (HTTP 400)."));
    const r = await get("categoria=MLB1613&ordem=vendidos");
    expect(r.status).toBe(401);
  });

  it("502 com a mensagem e o status real quando o ML falha", async () => {
    obterComCache.mockRejectedValue(new Error("Falha ao consultar os mais vendidos no Mercado Livre (HTTP 500): boom"));
    const r = await get("categoria=MLB1613&ordem=vendidos");
    expect(r.status).toBe(502);
    expect(await r.json()).toMatchObject({ erro: "falha_mercado_livre", statusOrigem: 500 });
  });
});
