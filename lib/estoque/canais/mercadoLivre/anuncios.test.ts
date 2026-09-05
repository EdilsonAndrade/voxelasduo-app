import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";

vi.mock("./auth", () => ({
  obterAccessTokenValido: vi.fn().mockResolvedValue("token-valido"),
}));
vi.mock("./categorias", () => ({
  resolverCategoriaMercadoLivre: vi.fn(),
}));
vi.mock("./previsorCategoria", () => ({
  preverCategoriaMercadoLivre: vi.fn(),
}));

const { criarAnuncio, despublicarAnuncio } = await import("./anuncios");
const { resolverCategoriaMercadoLivre } = await import("./categorias");
const { preverCategoriaMercadoLivre } = await import("./previsorCategoria");

const produtoBase: Produto = {
  _id: undefined,
  nome: "Vaso Geométrico",
  slug: "vaso-geometrico",
  descricao: "Vaso impresso em 3D.",
  preco: 12990,
  fotos: ["https://exemplo.com/foto1.jpg", "https://exemplo.com/foto2.jpg"],
  estoque: 5,
  categoria: "decoracao",
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

describe("criarAnuncio", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("sem override e previsor sem correspondência: lança erro sem chamar a API", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue(undefined);
    vi.mocked(preverCategoriaMercadoLivre).mockResolvedValue(undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(criarAnuncio(produtoBase)).rejects.toThrow(
      "Não foi possível determinar uma categoria"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("usa o override manual quando presente, sem consultar o previsor", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue("MLB-OVERRIDE");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "MLB999" }) })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await criarAnuncio(produtoBase);

    expect(preverCategoriaMercadoLivre).not.toHaveBeenCalled();
    const corpoItem = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(corpoItem.category_id).toBe("MLB-OVERRIDE");
  });

  it("sem override: usa a categoria descoberta pelo previsor a partir do título", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue(undefined);
    vi.mocked(preverCategoriaMercadoLivre).mockResolvedValue("MLB12345");
    const fetchMock = vi
      .fn()
      // POST /items
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "MLB999" }) })
      // POST /items/{id}/description
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const itemId = await criarAnuncio(produtoBase);

    expect(itemId).toBe("MLB999");
    expect(preverCategoriaMercadoLivre).toHaveBeenCalledWith("Vaso Geométrico");

    const chamadaItem = fetchMock.mock.calls[0];
    expect(chamadaItem[0]).toBe("https://api.mercadolibre.com/items");
    const corpoItem = JSON.parse(chamadaItem[1].body as string);
    expect(corpoItem).toMatchObject({
      title: "Vaso Geométrico",
      category_id: "MLB12345",
      price: 129.9,
      currency_id: "BRL",
      available_quantity: 5,
      pictures: [
        { source: "https://exemplo.com/foto1.jpg" },
        { source: "https://exemplo.com/foto2.jpg" },
      ],
    });

    const chamadaDescricao = fetchMock.mock.calls[1];
    expect(chamadaDescricao[0]).toBe("https://api.mercadolibre.com/items/MLB999/description");
  });

  it("falha ao criar o item: lança erro sem tentar definir descrição", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue("MLB12345");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false, status: 400 }));

    await expect(criarAnuncio(produtoBase)).rejects.toThrow("HTTP 400");
  });
});

describe("despublicarAnuncio", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fecha o anúncio (status: closed)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await despublicarAnuncio("MLB999");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadolibre.com/items/MLB999",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({ Authorization: "Bearer token-valido" }),
        body: JSON.stringify({ status: "closed" }),
      })
    );
  });

  it("lança erro quando a API responde com falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await expect(despublicarAnuncio("MLB999")).rejects.toThrow("HTTP 400");
  });
});
