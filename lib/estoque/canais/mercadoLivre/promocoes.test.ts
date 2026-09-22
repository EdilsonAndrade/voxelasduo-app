import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({
  obterAccessTokenValido: vi.fn().mockResolvedValue("token-valido"),
}));

const { listarPromocoesElegiveis } = await import("./promocoes");

function respostaJson(status: number, corpo: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(corpo),
    json: async () => corpo,
  };
}

describe("listarPromocoesElegiveis", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("devolve lista vazia quando o vendedor não tem campanhas ativas (corpo vazio)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "" })
    );

    const resultado = await listarPromocoesElegiveis("MLB1", 123);

    expect(resultado).toEqual([]);
  });

  it("filtra campanhas cujos itens não incluem o produto", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/seller-promotions/promotions?")) {
        return Promise.resolve(
          respostaJson(200, [{ id: "C-1", type: "DEAL", name: "Oferta" }])
        );
      }
      if (url.includes("/promotions/C-1/items")) {
        return Promise.resolve(respostaJson(200, [{ id: "MLB999", offer_price: 39.9 }]));
      }
      throw new Error(`URL inesperada: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await listarPromocoesElegiveis("MLB1", 123);

    expect(resultado).toEqual([]);
  });

  it("mapeia campanhas cujos itens incluem o produto, usando offer_price", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/seller-promotions/promotions?")) {
        return Promise.resolve(
          respostaJson(200, [{ id: "C-1", type: "DEAL", name: "Oferta Relâmpago" }])
        );
      }
      if (url.includes("/promotions/C-1/items")) {
        return Promise.resolve(respostaJson(200, [{ id: "MLB1", offer_price: 35 }]));
      }
      throw new Error(`URL inesperada: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await listarPromocoesElegiveis("MLB1", 123);

    expect(resultado).toEqual([
      { promotionId: "C-1", tipo: "DEAL", nome: "Oferta Relâmpago", precoPromocionalCentavos: 3500 },
    ]);
  });

  it("cai para price quando offer_price está ausente", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/seller-promotions/promotions?")) {
        return Promise.resolve(respostaJson(200, [{ id: "C-1", type: "DEAL" }]));
      }
      if (url.includes("/promotions/C-1/items")) {
        return Promise.resolve(respostaJson(200, [{ id: "MLB1", price: 40 }]));
      }
      throw new Error(`URL inesperada: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await listarPromocoesElegiveis("MLB1", 123);

    expect(resultado).toEqual([
      { promotionId: "C-1", tipo: "DEAL", nome: undefined, precoPromocionalCentavos: 4000 },
    ]);
  });

  it("descarta item sem nenhum campo de preço reconhecido, sem quebrar a lista", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/seller-promotions/promotions?")) {
        return Promise.resolve(
          respostaJson(200, [
            { id: "C-1", type: "DEAL" },
            { id: "C-2", type: "MARKETPLACE_CAMPAIGN", name: "Campanha" },
          ])
        );
      }
      if (url.includes("/promotions/C-1/items")) {
        return Promise.resolve(respostaJson(200, [{ id: "MLB1" }])); // sem offer_price nem price
      }
      if (url.includes("/promotions/C-2/items")) {
        return Promise.resolve(respostaJson(200, [{ id: "MLB1", offer_price: 42 }]));
      }
      throw new Error(`URL inesperada: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await listarPromocoesElegiveis("MLB1", 123);

    expect(resultado).toEqual([
      { promotionId: "C-2", tipo: "MARKETPLACE_CAMPAIGN", nome: "Campanha", precoPromocionalCentavos: 4200 },
    ]);
  });

  it("uma campanha cujos itens falham na consulta é descartada, sem derrubar as demais", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/seller-promotions/promotions?")) {
        return Promise.resolve(
          respostaJson(200, [
            { id: "C-1", type: "DEAL" },
            { id: "C-2", type: "SELLER_CAMPAIGN" },
          ])
        );
      }
      if (url.includes("/promotions/C-1/items")) {
        return Promise.resolve({ ok: false, status: 404, text: async () => "" });
      }
      if (url.includes("/promotions/C-2/items")) {
        return Promise.resolve(respostaJson(200, [{ id: "MLB1", offer_price: 20 }]));
      }
      throw new Error(`URL inesperada: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await listarPromocoesElegiveis("MLB1", 123);

    expect(resultado).toEqual([
      { promotionId: "C-2", tipo: "SELLER_CAMPAIGN", nome: undefined, precoPromocionalCentavos: 2000 },
    ]);
  });

  it("propaga o erro (com corpo da resposta) quando a lista de campanhas falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "unauthorized" })
    );

    await expect(listarPromocoesElegiveis("MLB1", 123)).rejects.toThrow(/HTTP 401/);
  });
});
