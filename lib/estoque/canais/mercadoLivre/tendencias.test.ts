import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({
  obterAccessTokenValido: vi.fn().mockResolvedValue("token-valido"),
}));
vi.mock("./previsorCategoria", () => ({
  preverCategoriaMercadoLivre: vi.fn(),
}));
vi.mock("./catalogoCategorias", () => ({
  obterCategoria: vi.fn(),
}));

const {
  preverCategoriaParaTendencia,
  buscarMaisVendidosCategoria,
  buscarTendenciasGerais,
} = await import("./tendencias");
const { preverCategoriaMercadoLivre } = await import("./previsorCategoria");
const { obterCategoria } = await import("./catalogoCategorias");

describe("preverCategoriaParaTendencia", () => {
  afterEach(() => vi.clearAllMocks());

  it("devolve o category_id e o nome quando o previsor encontra e a categoria é consultável", async () => {
    vi.mocked(preverCategoriaMercadoLivre).mockResolvedValue("MLB439316");
    vi.mocked(obterCategoria).mockResolvedValue({
      categoria: { id: "MLB439316", nome: "Chaveiros", folha: true },
      filhas: [],
    });

    const resultado = await preverCategoriaParaTendencia("chaveiro personalizado");

    expect(resultado).toEqual({ categoryId: "MLB439316", categoriaNome: "Chaveiros" });
    expect(preverCategoriaMercadoLivre).toHaveBeenCalledWith("chaveiro personalizado");
  });

  it("devolve undefined quando o previsor não encontra categoria", async () => {
    vi.mocked(preverCategoriaMercadoLivre).mockResolvedValue(undefined);

    const resultado = await preverCategoriaParaTendencia("asdkjaslkdjaslkd");

    expect(resultado).toBeUndefined();
    expect(obterCategoria).not.toHaveBeenCalled();
  });

  it("devolve só o category_id (sem nome) quando obterCategoria falha", async () => {
    vi.mocked(preverCategoriaMercadoLivre).mockResolvedValue("MLB439316");
    vi.mocked(obterCategoria).mockRejectedValue(new Error("falha"));

    const resultado = await preverCategoriaParaTendencia("chaveiro");

    expect(resultado).toEqual({ categoryId: "MLB439316" });
  });
});

describe("buscarMaisVendidosCategoria", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("resolve nome só para itens PRODUCT; ITEM/USER_PRODUCT ficam sem nome, sem quebrar a lista", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/highlights/")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            content: [
              { id: "MLB1", position: 1, type: "PRODUCT" },
              { id: "MLB2", position: 2, type: "ITEM" },
              { id: "MLB3", position: 3, type: "USER_PRODUCT" },
            ],
          }),
        });
      }
      if (url.includes("/products/MLB1")) {
        return Promise.resolve({ ok: true, json: async () => ({ name: "Chaveiro Estrela" }) });
      }
      // ITEM de terceiro é bloqueado (403) — não deveria ser chamado, mas se for, simula o bloqueio real.
      return Promise.resolve({ ok: false, status: 403, text: async () => "forbidden" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const ranking = await buscarMaisVendidosCategoria("MLB439316");

    expect(ranking).toEqual([
      { posicao: 1, id: "MLB1", tipo: "PRODUCT", nome: "Chaveiro Estrela" },
      { posicao: 2, id: "MLB2", tipo: "ITEM", nome: undefined },
      { posicao: 3, id: "MLB3", tipo: "USER_PRODUCT", nome: undefined },
    ]);
    // Nunca tenta resolver nome de ITEM/USER_PRODUCT (bloqueado/não suportado).
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/products/MLB2"),
      expect.anything()
    );
  });

  it("devolve lista vazia quando a categoria não tem destaques", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ content: [] }) })
    );

    const ranking = await buscarMaisVendidosCategoria("MLB439316");

    expect(ranking).toEqual([]);
  });

  it("propaga o erro (com corpo da resposta) quando o Mercado Livre falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "forbidden" })
    );

    await expect(buscarMaisVendidosCategoria("MLB439316")).rejects.toThrow(/HTTP 403/);
  });
});

describe("buscarTendenciasGerais", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("mapeia keyword/url da resposta do Mercado Livre", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { keyword: "cadeira gamer", url: "https://lista.mercadolivre.com.br/cadeira-gamer" },
        ],
      })
    );

    const tendencias = await buscarTendenciasGerais();

    expect(tendencias).toEqual([
      { termo: "cadeira gamer", url: "https://lista.mercadolivre.com.br/cadeira-gamer" },
    ]);
  });

  it("propaga o erro quando o Mercado Livre falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "" })
    );

    await expect(buscarTendenciasGerais()).rejects.toThrow(/HTTP 500/);
  });
});
