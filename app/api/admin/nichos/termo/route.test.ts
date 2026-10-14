import { beforeEach, describe, expect, it, vi } from "vitest";

const { pesquisarTermo, obterComCache } = vi.hoisted(() => ({
  pesquisarTermo: vi.fn(),
  obterComCache: vi.fn(),
}));

vi.mock("@/lib/nichos/pesquisa", () => ({ pesquisarTermo }));
vi.mock("@/lib/nichos/dependencias", () => ({ dependenciasReais: () => ({}) }));
vi.mock("@/lib/tendencias/cache", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/tendencias/cache")>();
  return { normalizarTermo: real.normalizarTermo, obterComCache };
});

const { GET } = await import("./route");
const { ErroMakerWorld } = await import("@/lib/nichos/makerworld");

function get(query: string) {
  return GET(new Request(`http://localhost/api/admin/nichos/termo?${query}`));
}

describe("GET /api/admin/nichos/termo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("400 sem termo", async () => {
    const r = await get("termo=%20");
    expect(r.status).toBe(400);
  });

  it("200 com a oportunidade e chave normalizada", async () => {
    obterComCache.mockImplementation(async ({ buscarNovo }: { buscarNovo: () => Promise<unknown> }) => ({
      dados: await buscarNovo(),
      origem: "cache",
      obtidoEm: new Date("2026-10-14T18:00:00.000Z"),
      avisoDesatualizado: true,
    }));
    pesquisarTermo.mockResolvedValue({ tipo: "nichos_termo", termo: "Porta Caneta", oportunidade: { termo: "Porta Caneta", modelos: [] } });

    const r = await get("termo=Porta%20%20Caneta");
    const corpo = await r.json();

    expect(r.status).toBe(200);
    expect(corpo).toMatchObject({ termo: "Porta Caneta", origem: "cache", avisoDesatualizado: true });
    expect(obterComCache.mock.calls[0][0].chave).toBe("nichos:termo:porta caneta:1cor:a1");
  });

  it("502 quando o MakerWorld falha", async () => {
    obterComCache.mockRejectedValue(new ErroMakerWorld(500, "MakerWorld respondeu HTTP 500"));
    const r = await get("termo=vaso");
    expect(r.status).toBe(502);
    expect(await r.json()).toMatchObject({ erro: "falha_makerworld", statusOrigem: 500 });
  });
});
