import { beforeEach, describe, expect, it, vi } from "vitest";

const { categoria } = vi.hoisted(() => ({ categoria: vi.fn() }));
vi.mock("@/lib/produtosAlta/dependencias", () => ({ dependenciasReais: () => ({ categoria }) }));

const { GET } = await import("./route");

function get(query: string) {
  return GET(new Request(`http://localhost/api/admin/produtos-alta/categoria?${query}`));
}

describe("GET /api/admin/produtos-alta/categoria", () => {
  beforeEach(() => vi.clearAllMocks());

  it("200 com caminho e subcategorias", async () => {
    const banheiros = { id: "MLB1613", nome: "Banheiros", caminho: [], filhas: [{ id: "MLB1616", nome: "Acessórios" }] };
    categoria.mockResolvedValue(banheiros);
    const r = await get("id=MLB1613");
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual(banheiros);
  });

  it("400 para id inválido", async () => {
    const r = await get("id=xyz");
    expect(r.status).toBe(400);
  });

  it("502 com status real quando o ML falha", async () => {
    categoria.mockRejectedValue(new Error("Falha ao consultar a categoria no Mercado Livre (HTTP 503): fora"));
    const r = await get("id=MLB1613");
    expect(r.status).toBe(502);
    expect(await r.json()).toMatchObject({ statusOrigem: 503 });
  });
});
