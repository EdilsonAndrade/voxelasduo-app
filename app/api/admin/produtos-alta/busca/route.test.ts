import { beforeEach, describe, expect, it, vi } from "vitest";

const { obterComCache, buscarPorNome, categoria } = vi.hoisted(() => ({
  obterComCache: vi.fn(),
  buscarPorNome: vi.fn(),
  categoria: vi.fn(),
}));

vi.mock("@/lib/tendencias/cache", async (original) => ({
  ...(await original<typeof import("@/lib/tendencias/cache")>()),
  obterComCache,
}));
vi.mock("@/lib/produtosAlta/listas", () => ({ buscarPorNome }));
vi.mock("@/lib/produtosAlta/dependencias", () => ({ dependenciasReais: () => ({ categoria }) }));

const { GET } = await import("./route");

function get(query: string) {
  return GET(new Request(`http://localhost/api/admin/produtos-alta/busca?${query}`));
}

describe("GET /api/admin/produtos-alta/busca", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obterComCache.mockImplementation(async ({ buscarNovo }: { buscarNovo: () => Promise<unknown> }) => ({
      dados: await buscarNovo(),
      origem: "novo",
      obtidoEm: new Date("2026-10-15T18:00:00.000Z"),
      avisoDesatualizado: false,
    }));
    buscarPorNome.mockResolvedValue([]);
  });

  it("400 para termo vazio", async () => {
    const r = await get("termo=%20%20");
    expect(r.status).toBe(400);
    expect((await r.json()).erro).toBe("termo_invalido");
  });

  it("sem categoria busca no catálogo todo", async () => {
    const r = await get("termo=Papel%20Higienico");
    expect(r.status).toBe(200);
    expect(buscarPorNome).toHaveBeenCalledWith("Papel Higienico", undefined, expect.anything());
    expect(obterComCache.mock.calls[0][0].chave).toBe("alta:busca:todas:papel higienico");
    expect(categoria).not.toHaveBeenCalled();
  });

  it("com categoria valida e restringe a busca", async () => {
    const banheiros = { id: "MLB1613", nome: "Banheiros", caminho: [], filhas: [] };
    categoria.mockResolvedValue(banheiros);
    const r = await get("termo=papel&categoria=MLB1613");
    expect(r.status).toBe(200);
    expect(buscarPorNome).toHaveBeenCalledWith("papel", banheiros, expect.anything());
    expect(obterComCache.mock.calls[0][0].chave).toBe("alta:busca:MLB1613:papel");
  });
});
