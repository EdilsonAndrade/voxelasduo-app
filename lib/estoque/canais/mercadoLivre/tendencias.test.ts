import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({
  obterAccessTokenValido: vi.fn().mockResolvedValue("token-valido"),
}));

const {
  buscarMaisVendidosCategoria,
  obterProdutoCatalogo,
  buscarTendenciasCategoria,
  contarProdutosCatalogo,
  buscarProdutosCatalogo,
  descobrirDominios,
  obterCategoriaNavegavel,
} = await import("./tendencias");

function respostaJson(corpo: unknown) {
  return vi.fn().mockResolvedValue({ ok: true, json: async () => corpo });
}

afterEach(() => vi.unstubAllGlobals());

describe("buscarMaisVendidosCategoria", () => {
  it("devolve posição, id e tipo (tipo desconhecido vira ITEM)", async () => {
    vi.stubGlobal(
      "fetch",
      respostaJson({
        content: [
          { id: "MLB1", position: 1, type: "PRODUCT" },
          { id: "MLBU2", position: 2, type: "USER_PRODUCT" },
          { id: "MLB3", position: 3, type: "OUTRO" },
        ],
      })
    );

    expect(await buscarMaisVendidosCategoria("MLB1613")).toEqual([
      { posicao: 1, id: "MLB1", tipo: "PRODUCT" },
      { posicao: 2, id: "MLBU2", tipo: "USER_PRODUCT" },
      { posicao: 3, id: "MLB3", tipo: "ITEM" },
    ]);
  });

  it("lista vazia quando a categoria não tem destaques", async () => {
    vi.stubGlobal("fetch", respostaJson({ content: [] }));
    expect(await buscarMaisVendidosCategoria("MLB1613")).toEqual([]);
  });

  it("propaga o status real quando o Mercado Livre falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("forbidden", { status: 403 })));
    await expect(buscarMaisVendidosCategoria("MLB1613")).rejects.toThrow(/HTTP 403/);
  });
});

describe("obterProdutoCatalogo", () => {
  it("devolve nome, foto em https e domínio", async () => {
    const fetchMock = respostaJson({
      id: "MLB1",
      name: "Suporte Papel",
      domain_id: "MLB-TOILET_PAPER_HOLDERS",
      pictures: [{ url: "http://http2.mlstatic.com/a.jpg" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await obterProdutoCatalogo("MLB1")).toEqual({
      id: "MLB1",
      nome: "Suporte Papel",
      foto: "https://http2.mlstatic.com/a.jpg",
      dominioId: "MLB-TOILET_PAPER_HOLDERS",
    });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.mercadolibre.com/products/MLB1");
  });
});

describe("buscarTendenciasCategoria", () => {
  it("consulta as tendências da categoria e mantém a ordem", async () => {
    const fetchMock = respostaJson([
      { keyword: "organizador de gaveta", url: "u1" },
      { keyword: "divisoria gaveta", url: "u2" },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const termos = await buscarTendenciasCategoria("MLB436414");

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.mercadolibre.com/trends/MLB/MLB436414");
    expect(termos.map((t) => t.termo)).toEqual(["organizador de gaveta", "divisoria gaveta"]);
  });

  it("propaga o status real do Mercado Livre", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("forbidden", { status: 403 })));
    await expect(buscarTendenciasCategoria("MLB1")).rejects.toThrow("HTTP 403");
  });
});

describe("contarProdutosCatalogo", () => {
  it("devolve paging.total da busca de catálogo", async () => {
    const fetchMock = respostaJson({ paging: { total: 4640 } });
    vi.stubGlobal("fetch", fetchMock);

    expect(await contarProdutosCatalogo("organizador de gaveta modular")).toBe(4640);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/products/search");
    expect(url.searchParams.get("q")).toBe("organizador de gaveta modular");
    expect(url.searchParams.get("site_id")).toBe("MLB");
  });
});

describe("buscarProdutosCatalogo", () => {
  it("busca pelo termo com limite e domínio opcional", async () => {
    const fetchMock = respostaJson({
      results: [{ id: "MLB9", name: "Porta Papel", pictures: [{ url: "https://x/y.jpg" }] }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const produtos = await buscarProdutosCatalogo("papel higienico", { limite: 12, dominioId: "MLB-TOILET_PAPER_HOLDERS" });

    expect(produtos).toEqual([{ id: "MLB9", nome: "Porta Papel", foto: "https://x/y.jpg", dominioId: undefined }]);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("limit")).toBe("12");
    expect(url.searchParams.get("domain_id")).toBe("MLB-TOILET_PAPER_HOLDERS");
  });
});

describe("descobrirDominios", () => {
  it("mapeia domínio e categoria sugeridos", async () => {
    vi.stubGlobal("fetch", respostaJson([{ domain_id: "MLB-TOILET_PAPERS", category_id: "MLB252555" }]));
    expect(await descobrirDominios("papel")).toEqual([{ dominioId: "MLB-TOILET_PAPERS", categoriaId: "MLB252555" }]);
  });
});

describe("obterCategoriaNavegavel", () => {
  it("devolve caminho e filhas", async () => {
    vi.stubGlobal(
      "fetch",
      respostaJson({
        id: "MLB1613",
        name: "Banheiros",
        path_from_root: [
          { id: "MLB1574", name: "Casa" },
          { id: "MLB1613", name: "Banheiros" },
        ],
        children_categories: [{ id: "MLB1616", name: "Acessórios para Banhos" }],
      })
    );

    expect(await obterCategoriaNavegavel("MLB1613")).toEqual({
      id: "MLB1613",
      nome: "Banheiros",
      caminho: [
        { id: "MLB1574", nome: "Casa" },
        { id: "MLB1613", nome: "Banheiros" },
      ],
      filhas: [{ id: "MLB1616", nome: "Acessórios para Banhos" }],
    });
  });
});
