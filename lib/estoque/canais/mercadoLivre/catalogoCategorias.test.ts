import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({
  obterAccessTokenValido: vi.fn().mockResolvedValue("token-valido"),
}));

let catalogo: typeof import("./catalogoCategorias");

function respostaJson(corpo: unknown) {
  return { ok: true, json: async () => corpo };
}

describe("catalogoCategorias", () => {
  beforeEach(async () => {
    // O cache é do módulo — recarrega para cada teste começar do zero.
    vi.resetModules();
    catalogo = await import("./catalogoCategorias");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("listarCategoriasRaiz: mapeia as categorias de nível 1 e reaproveita o cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      respostaJson([{ id: "MLB1574", name: "Casa, Móveis e Decoração" }])
    );
    vi.stubGlobal("fetch", fetchMock);

    const primeira = await catalogo.listarCategoriasRaiz();
    await catalogo.listarCategoriasRaiz();

    expect(primeira).toEqual([{ id: "MLB1574", nome: "Casa, Móveis e Decoração", folha: false }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.mercadolibre.com/sites/MLB/categories");
  });

  it("obterCategoria: com filhas não é folha e traz o caminho", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        respostaJson({
          id: "MLB1574",
          name: "Decoração",
          path_from_root: [
            { id: "MLB1574", name: "Casa" },
            { id: "MLB1", name: "Decoração" },
          ],
          children_categories: [{ id: "MLB2", name: "Estatuetas" }],
        })
      )
    );

    const { categoria, filhas } = await catalogo.obterCategoria("MLB1574");

    expect(categoria).toEqual({ id: "MLB1574", nome: "Decoração", folha: false, caminho: "Casa > Decoração" });
    expect(filhas).toEqual([{ id: "MLB2", nome: "Estatuetas", folha: false }]);
  });

  it("obterCategoria: sem filhas é folha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        respostaJson({ id: "MLB2", name: "Estatuetas", path_from_root: [{ id: "MLB2", name: "Estatuetas" }], children_categories: [] })
      )
    );

    const { categoria, filhas } = await catalogo.obterCategoria("MLB2");

    expect(categoria.folha).toBe(true);
    expect(filhas).toEqual([]);
  });

  it("obterCategoria: lança erro com o corpo quando a API falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => "nao existe" })
    );

    await expect(catalogo.obterCategoria("MLB0")).rejects.toThrow("(HTTP 404): nao existe");
  });

  it("buscarCategorias: termo curto não chama a API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await catalogo.buscarCategorias(" a ")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("buscarCategorias: devolve folhas com caminho e cai para o nome se a consulta do caminho falhar", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("domain_discovery")) {
        return respostaJson([
          { category_id: "MLB10", category_name: "Estatuetas" },
          { category_id: "MLB10", category_name: "Estatuetas" },
          { category_id: "MLB20", category_name: "Chaveiros" },
        ]);
      }
      if (url.endsWith("/categories/MLB10")) {
        return respostaJson({
          id: "MLB10",
          name: "Estatuetas",
          path_from_root: [{ id: "MLB1", name: "Casa" }, { id: "MLB10", name: "Estatuetas" }],
          children_categories: [],
        });
      }
      return { ok: false, status: 500, text: async () => "" };
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultados = await catalogo.buscarCategorias("estatueta");

    expect(resultados).toEqual([
      { id: "MLB10", nome: "Estatuetas", folha: true, caminho: "Casa > Estatuetas" },
      { id: "MLB20", nome: "Chaveiros", folha: true },
    ]);
    expect(fetchMock.mock.calls[0][0]).toContain("domain_discovery/search?limit=8&q=estatueta");
  });
});
