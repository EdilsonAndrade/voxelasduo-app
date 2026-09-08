import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const { consultarCustoVenda, resolverCategoriaParaSimulacao } = await import("./precos");
const { resolverCategoriaMercadoLivre } = await import("./categorias");
const { preverCategoriaMercadoLivre } = await import("./previsorCategoria");

describe("consultarCustoVenda", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("consulta /sites/MLB/listing_prices e mapeia a resposta (objeto único) para centavos", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        listing_type_id: "gold_special",
        listing_fee_amount: 0,
        sale_fee_amount: 11.31,
        sale_fee_details: { fixed_fee: 0, percentage_fee: 15.5 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await consultarCustoVenda({ categoryId: "MLB43132", precoReais: 73.05 });

    expect(resultado).toEqual({
      categoryId: "MLB43132",
      listingTypeId: "gold_special",
      listingFeeAmountCentavos: 0,
      saleFeeAmountCentavos: 1131,
      percentageFee: 15.5,
      fixedFeeCentavos: 0,
    });

    const [url, opcoes] = fetchMock.mock.calls[0];
    expect(url).toContain("https://api.mercadolibre.com/sites/MLB/listing_prices");
    expect(url).toContain("category_id=MLB43132");
    expect(url).toContain("price=73.05");
    expect(url).toContain("listing_type_id=gold_special");
    expect(opcoes.headers.Authorization).toBe("Bearer token-valido");
  });

  it("quando a resposta vem em array, usa o item do listing_type_id consultado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            listing_type_id: "free",
            listing_fee_amount: 0,
            sale_fee_amount: 0,
            sale_fee_details: { fixed_fee: 0, percentage_fee: 0 },
          },
          {
            listing_type_id: "gold_special",
            listing_fee_amount: 0,
            sale_fee_amount: 850,
            sale_fee_details: { fixed_fee: 200, percentage_fee: 13 },
          },
        ],
      })
    );

    const resultado = await consultarCustoVenda({ categoryId: "MLA1", precoReais: 5000 });
    expect(resultado.saleFeeAmountCentavos).toBe(85000);
    expect(resultado.percentageFee).toBe(13);
  });

  it("lança erro quando a API responde com falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await expect(
      consultarCustoVenda({ categoryId: "MLB1", precoReais: 10 })
    ).rejects.toThrow("HTTP 400");
  });
});

describe("resolverCategoriaParaSimulacao", () => {
  beforeEach(() => vi.clearAllMocks());

  it("usa o override manual quando presente, sem consultar o previsor", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue("MLB-OVERRIDE");

    const categoria = await resolverCategoriaParaSimulacao("Vaso Geométrico", "decoracao");

    expect(categoria).toBe("MLB-OVERRIDE");
    expect(preverCategoriaMercadoLivre).not.toHaveBeenCalled();
  });

  it("sem override: usa o previsor a partir do nome + qualificador da categoria", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue(undefined);
    vi.mocked(preverCategoriaMercadoLivre).mockResolvedValue("MLB12345");

    const categoria = await resolverCategoriaParaSimulacao("Vaso Geométrico", "decoracao");

    expect(categoria).toBe("MLB12345");
    expect(preverCategoriaMercadoLivre).toHaveBeenCalledWith("Vaso Geométrico decoração");
  });

  it("retorna undefined quando nem override nem previsor encontram categoria", async () => {
    vi.mocked(resolverCategoriaMercadoLivre).mockReturnValue(undefined);
    vi.mocked(preverCategoriaMercadoLivre).mockResolvedValue(undefined);

    const categoria = await resolverCategoriaParaSimulacao("Item Genérico", "outros");

    expect(categoria).toBeUndefined();
  });
});
