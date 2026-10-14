import { beforeEach, describe, expect, it, vi } from "vitest";

const { pesquisarCategoria, obterComCache } = vi.hoisted(() => ({
  pesquisarCategoria: vi.fn(),
  obterComCache: vi.fn(),
}));

vi.mock("@/lib/nichos/pesquisa", () => ({ pesquisarCategoria }));
vi.mock("@/lib/nichos/dependencias", () => ({ dependenciasReais: () => ({}) }));
vi.mock("@/lib/tendencias/cache", () => ({ obterComCache }));

const { GET } = await import("./route");
const { ErroMakerWorld } = await import("@/lib/nichos/makerworld");

function get(query: string) {
  return GET(new Request(`http://localhost/api/admin/nichos/categoria?${query}`));
}

function comoNovo() {
  obterComCache.mockImplementation(async ({ buscarNovo }: { buscarNovo: () => Promise<unknown> }) => ({
    dados: await buscarNovo(),
    origem: "novo",
    obtidoEm: new Date("2026-10-14T18:00:00.000Z"),
    avisoDesatualizado: false,
  }));
}

describe("GET /api/admin/nichos/categoria", () => {
  beforeEach(() => vi.clearAllMocks());

  it("400 para categoria fora da lista", async () => {
    const r = await get("id=MLB999");
    expect(r.status).toBe(400);
    expect((await r.json()).erro).toBe("categoria_invalida");
  });

  it("200 com as oportunidades, usando filtros padrão e cache por categoria + filtros", async () => {
    comoNovo();
    pesquisarCategoria.mockResolvedValue({
      tipo: "nichos_categoria",
      categoriaId: "MLB436414",
      categoriaNome: "Organização para Casa",
      oportunidades: [],
      ocultas: 2,
      descartados: 5,
    });

    const r = await get("id=MLB436414");
    const corpo = await r.json();

    expect(r.status).toBe(200);
    expect(corpo).toMatchObject({ categoriaId: "MLB436414", ocultas: 2, origem: "novo", obtidoEm: "2026-10-14T18:00:00.000Z" });
    expect(corpo.tipo).toBeUndefined();
    expect(obterComCache.mock.calls[0][0].chave).toBe("nichos:cat:MLB436414:1cor:a1");
    expect(pesquisarCategoria.mock.calls[0][1]).toEqual({ umaCor: true, compativelA1: true });
  });

  it("filtros desligados e forcar mudam chave e repassam forcar", async () => {
    comoNovo();
    pesquisarCategoria.mockResolvedValue({ tipo: "nichos_categoria", oportunidades: [] });
    await get("id=MLB1631&umaCor=0&a1=0&forcar=true");
    expect(obterComCache.mock.calls[0][0]).toMatchObject({ chave: "nichos:cat:MLB1631:cores:todas", forcar: true });
  });

  it("429 quando o MakerWorld bloqueia, com o status real da origem", async () => {
    obterComCache.mockRejectedValue(new ErroMakerWorld(403, "o MakerWorld bloqueou", true));
    const r = await get("id=MLB1631");
    expect(r.status).toBe(429);
    expect(await r.json()).toMatchObject({ erro: "makerworld_bloqueado", statusOrigem: 403 });
  });

  it("502 com a mensagem real quando o Mercado Livre falha", async () => {
    obterComCache.mockRejectedValue(new Error("Falha ao consultar as tendências da categoria no Mercado Livre (HTTP 500): boom"));
    const r = await get("id=MLB1631");
    expect(r.status).toBe(502);
    expect(await r.json()).toMatchObject({ erro: "falha_mercado_livre", statusOrigem: 500 });
  });

  it("401 quando o token do Mercado Livre não renova", async () => {
    obterComCache.mockRejectedValue(new Error("Falha ao renovar token do Mercado Livre (HTTP 400)."));
    const r = await get("id=MLB1631");
    expect(r.status).toBe(401);
  });
});
