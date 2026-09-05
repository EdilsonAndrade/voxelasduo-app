import { afterEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";

vi.mock("./auth", () => ({
  obterAccessTokenValido: vi.fn().mockResolvedValue("token-valido"),
}));
vi.mock("./categorias", () => ({
  resolverCategoriaMercadoLivre: vi.fn(),
}));

const { enviarImagem, criarAnuncio, despublicarAnuncio } = await import("./anuncios");
const { resolverCategoriaMercadoLivre } = await import("./categorias");

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

describe("enviarImagem", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envia a URL pública da foto e retorna o id da imagem", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "img-123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const id = await enviarImagem("https://exemplo.com/foto1.jpg");

    expect(id).toBe("img-123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadolibre.com/pictures/items/upload",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token-valido" }),
      })
    );
  });

  it("lança erro quando o upload falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await expect(enviarImagem("https://exemplo.com/foto1.jpg")).rejects.toThrow("HTTP 400");
  });
});

describe("criarAnuncio", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("categoria sem mapeamento: lança erro sem chamar a API", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue(undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(criarAnuncio(produtoBase)).rejects.toThrow("sem mapeamento");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cria o anúncio com título, categoria, preço em reais, estoque, fotos e descrição", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue("MLB12345");
    const fetchMock = vi
      .fn()
      // enviarImagem x2 (uma por foto)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "img-1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "img-2" }) })
      // POST /items
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "MLB999" }) })
      // POST /items/{id}/description
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const itemId = await criarAnuncio(produtoBase);

    expect(itemId).toBe("MLB999");

    const chamadaItem = fetchMock.mock.calls[2];
    expect(chamadaItem[0]).toBe("https://api.mercadolibre.com/items");
    const corpoItem = JSON.parse(chamadaItem[1].body as string);
    expect(corpoItem).toMatchObject({
      title: "Vaso Geométrico",
      category_id: "MLB12345",
      price: 129.9,
      currency_id: "BRL",
      available_quantity: 5,
      pictures: [{ id: "img-1" }, { id: "img-2" }],
    });

    const chamadaDescricao = fetchMock.mock.calls[3];
    expect(chamadaDescricao[0]).toBe("https://api.mercadolibre.com/items/MLB999/description");
  });

  it("falha ao criar o item: lança erro sem tentar definir descrição", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue("MLB12345");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "img-1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "img-2" }) })
      .mockResolvedValueOnce({ ok: false, status: 400 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(criarAnuncio(produtoBase)).rejects.toThrow("HTTP 400");
    expect(fetchMock).toHaveBeenCalledTimes(3);
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
