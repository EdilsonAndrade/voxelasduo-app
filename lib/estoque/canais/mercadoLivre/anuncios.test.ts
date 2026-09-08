import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";

vi.mock("./auth", () => ({
  obterAccessTokenValido: vi.fn().mockResolvedValue("token-valido"),
}));
vi.mock("./categorias", async (importOriginal) => {
  const real = await importOriginal<typeof import("./categorias")>();
  return {
    ...real,
    resolverCategoriaMercadoLivre: vi.fn(),
  };
});
vi.mock("./previsorCategoria", () => ({
  preverCategoriaMercadoLivre: vi.fn(),
}));
vi.mock("./atributos", () => ({
  buscarAtributosObrigatorios: vi.fn().mockResolvedValue([]),
  valorPadraoAtributo: vi.fn((atributo) => ({ id: atributo.id, value_name: "valor-padrao" })),
  atributosEmbalagem: vi.fn().mockReturnValue([]),
}));

const { criarAnuncio, despublicarAnuncio, atualizarAtributosAnuncio } = await import("./anuncios");
const { resolverCategoriaMercadoLivre } = await import("./categorias");
const { preverCategoriaMercadoLivre } = await import("./previsorCategoria");
const { buscarAtributosObrigatorios, atributosEmbalagem } = await import("./atributos");

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
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "MLB999", permalink: "https://produto.mercadolivre.com.br/MLB-999" }),
      })
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
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "MLB999",
          permalink: "https://produto.mercadolivre.com.br/MLB-999-vaso-geometrico",
        }),
      })
      // POST /items/{id}/description
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const anuncio = await criarAnuncio(produtoBase);

    expect(anuncio).toEqual({
      id: "MLB999",
      permalink: "https://produto.mercadolivre.com.br/MLB-999-vaso-geometrico",
    });
    expect(preverCategoriaMercadoLivre).toHaveBeenCalledWith("Vaso Geométrico decoração");

    const chamadaItem = fetchMock.mock.calls[0];
    expect(chamadaItem[0]).toBe("https://api.mercadolibre.com/items");
    const corpoItem = JSON.parse(chamadaItem[1].body as string);
    // Modelo "User Products": `family_name` no lugar de `title` (research.md #4).
    expect(corpoItem.title).toBeUndefined();
    expect(corpoItem).toMatchObject({
      family_name: "Vaso Geométrico",
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

  it("inclui atributos obrigatórios da categoria no corpo do item (ex: domínio 'decorations')", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue("MLB12345");
    vi.mocked(buscarAtributosObrigatorios).mockResolvedValue([
      { id: "BRAND", value_type: "list" },
    ]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "MLB999", permalink: "https://produto.mercadolivre.com.br/MLB-999" }),
      })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await criarAnuncio(produtoBase);

    const corpoItem = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(corpoItem.attributes).toEqual([{ id: "BRAND", value_name: "valor-padrao" }]);
  });

  it("falha ao criar o item: lança erro sem tentar definir descrição", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue("MLB12345");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false, status: 400 }));

    await expect(criarAnuncio(produtoBase)).rejects.toThrow("HTTP 400");
  });

  it("inclui atributos de embalagem no corpo do item quando produto.embalagemEnvio está definido (EDI-96)", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue("MLB12345");
    vi.mocked(atributosEmbalagem).mockReturnValue([
      { id: "SELLER_PACKAGE_WEIGHT", value_name: "250 g" },
      { id: "SELLER_PACKAGE_HEIGHT", value_name: "10 cm" },
    ]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "MLB999", permalink: "https://produto.mercadolivre.com.br/MLB-999" }),
      })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const produtoComEmbalagem: Produto = {
      ...produtoBase,
      embalagemEnvio: { pesoGramas: 250, alturaCm: 10, larguraCm: 15, comprimentoCm: 20 },
    };

    await criarAnuncio(produtoComEmbalagem);

    expect(atributosEmbalagem).toHaveBeenCalledWith(produtoComEmbalagem.embalagemEnvio);
    const corpoItem = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(corpoItem.attributes).toEqual(
      expect.arrayContaining([
        { id: "SELLER_PACKAGE_WEIGHT", value_name: "250 g" },
        { id: "SELLER_PACKAGE_HEIGHT", value_name: "10 cm" },
      ])
    );
  });

  it("sem embalagemEnvio: não inclui atributos de embalagem e não bloqueia a publicação", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue("MLB12345");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "MLB999", permalink: "https://produto.mercadolivre.com.br/MLB-999" }),
      })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await criarAnuncio(produtoBase);

    expect(atributosEmbalagem).not.toHaveBeenCalled();
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

describe("atualizarAtributosAnuncio", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("resolve a categoria, monta os atributos corrigidos e envia via PUT (EDI-95/EDI-96)", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue("MLB12345");
    vi.mocked(buscarAtributosObrigatorios).mockResolvedValue([
      { id: "BRAND", value_type: "string" },
    ]);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await atualizarAtributosAnuncio("MLB999", produtoBase);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadolibre.com/items/MLB999",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({ Authorization: "Bearer token-valido" }),
      })
    );
    const corpo = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(corpo.attributes).toEqual([{ id: "BRAND", value_name: "valor-padrao" }]);
  });

  it("sem override: resolve a categoria pelo previsor, igual à publicação", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue(undefined);
    vi.mocked(preverCategoriaMercadoLivre).mockResolvedValue("MLB999888");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    await atualizarAtributosAnuncio("MLB999", produtoBase);

    expect(buscarAtributosObrigatorios).toHaveBeenCalledWith("MLB999888");
  });

  it("sem categoria resolvível: lança erro sem chamar a API", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue(undefined);
    vi.mocked(preverCategoriaMercadoLivre).mockResolvedValue(undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(atualizarAtributosAnuncio("MLB999", produtoBase)).rejects.toThrow(
      "Não foi possível determinar uma categoria"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lança erro quando a API responde com falha", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue("MLB12345");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400 }));

    await expect(atualizarAtributosAnuncio("MLB999", produtoBase)).rejects.toThrow("HTTP 400");
  });

  it("inclui atributos de embalagem quando produto.embalagemEnvio está definido", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue("MLB12345");
    vi.mocked(atributosEmbalagem).mockReturnValue([
      { id: "SELLER_PACKAGE_WEIGHT", value_name: "250 g" },
    ]);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const produtoComEmbalagem: Produto = {
      ...produtoBase,
      embalagemEnvio: { pesoGramas: 250, alturaCm: 10, larguraCm: 10, comprimentoCm: 10 },
    };

    await atualizarAtributosAnuncio("MLB999", produtoComEmbalagem);

    expect(atributosEmbalagem).toHaveBeenCalledWith(produtoComEmbalagem.embalagemEnvio);
    const corpo = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(corpo.attributes).toEqual(
      expect.arrayContaining([{ id: "SELLER_PACKAGE_WEIGHT", value_name: "250 g" }])
    );
  });

  it("sem embalagemEnvio: não inclui atributos de embalagem", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue("MLB12345");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await atualizarAtributosAnuncio("MLB999", produtoBase);

    expect(atributosEmbalagem).not.toHaveBeenCalled();
  });
});
