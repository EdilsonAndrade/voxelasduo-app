import { describe, expect, it, vi } from "vitest";
import type { CategoriaNavegavel } from "@/lib/models/produtosAlta";
import type { DependenciasAlta } from "./dependencias";
import { buscarPorNome, listarMaisProcurados, listarMaisVendidos, RESULTADOS_BUSCA } from "./listas";

const banheiros: CategoriaNavegavel = { id: "MLB1613", nome: "Banheiros", caminho: [], filhas: [] };

function deps(parcial: Partial<DependenciasAlta>): DependenciasAlta {
  return {
    maisVendidos: vi.fn(),
    produto: vi.fn(),
    tendencias: vi.fn(),
    buscarCatalogo: vi.fn(),
    descobrirDominios: vi.fn(),
    categoria: vi.fn(),
    ...parcial,
  };
}

describe("listarMaisVendidos", () => {
  it("resolve nome/foto só de PRODUCT e mantém a ordem; falha de um produto vira card substituto", async () => {
    const produto = vi.fn().mockImplementation(async (id: string) => {
      if (id === "MLB1") return { id, nome: "Porta Papel Higiênico Inox Adesivo 3M ViMad", foto: "https://f/1.jpg" };
      throw new Error("HTTP 500");
    });
    const d = deps({
      maisVendidos: vi.fn().mockResolvedValue([
        { posicao: 1, id: "MLB1", tipo: "PRODUCT" },
        { posicao: 2, id: "MLB2", tipo: "PRODUCT" },
        { posicao: 3, id: "MLB4266838277", tipo: "ITEM" },
      ]),
      produto,
    });

    const itens = await listarMaisVendidos(banheiros, d);

    expect(itens.map((i) => i.posicao)).toEqual([1, 2, 3]);
    expect(itens[0]).toMatchObject({
      chave: "PRODUCT:MLB1",
      origem: "vendido",
      nome: "Porta Papel Higiênico Inox Adesivo 3M ViMad",
      foto: "https://f/1.jpg",
      categoriaNome: "Banheiros",
      links: {
        mercadoLivre: "https://www.mercadolivre.com.br/p/MLB1",
        shopee: "https://shopee.com.br/search?keyword=Porta%20Papel%20Higi%C3%AAnico%20Inox%20Adesivo",
      },
    });
    expect(itens[1].nome).toBeUndefined();
    expect(itens[1].links.shopee).toBeUndefined();
    expect(itens[2].links.mercadoLivre).toBe("https://produto.mercadolivre.com.br/MLB-4266838277");
    expect(produto).not.toHaveBeenCalledWith("MLB4266838277");
  });

  it("propaga falha do ranking", async () => {
    const d = deps({ maisVendidos: vi.fn().mockRejectedValue(new Error("HTTP 403")) });
    await expect(listarMaisVendidos(banheiros, d)).rejects.toThrow("HTTP 403");
  });
});

describe("listarMaisProcurados", () => {
  it("usa os 20 primeiros termos, posição pela ordem e foto do 1º produto do termo", async () => {
    const termos = Array.from({ length: 30 }, (_, i) => ({ termo: `termo ${i + 1}`, url: "" }));
    const buscarCatalogo = vi.fn().mockImplementation(async (termo: string) =>
      termo === "termo 2" ? [] : [{ id: "MLB9", nome: `produto de ${termo}`, foto: "https://f/9.jpg" }]
    );
    const d = deps({ tendencias: vi.fn().mockResolvedValue(termos), buscarCatalogo });

    const itens = await listarMaisProcurados(banheiros, d);

    expect(itens).toHaveLength(20);
    expect(itens[0]).toMatchObject({
      chave: "TERMO:termo 1",
      origem: "procurado",
      posicao: 1,
      termo: "termo 1",
      foto: "https://f/9.jpg",
      links: { mercadoLivre: "https://lista.mercadolivre.com.br/termo-1" },
    });
    expect(itens[1]).toMatchObject({ posicao: 2, termo: "termo 2", foto: undefined });
    expect(buscarCatalogo).toHaveBeenCalledWith("termo 1", { limite: 1 });
  });
});

describe("buscarPorNome", () => {
  it("sem categoria busca no catálogo todo", async () => {
    const buscarCatalogo = vi.fn().mockResolvedValue([{ id: "MLB5", nome: "Suporte", foto: "https://f/5.jpg" }]);
    const itens = await buscarPorNome("papel", undefined, deps({ buscarCatalogo }));

    expect(buscarCatalogo).toHaveBeenCalledWith("papel", { limite: RESULTADOS_BUSCA });
    expect(itens[0]).toMatchObject({ chave: "PRODUCT:MLB5", origem: "busca", posicao: null, categoriaId: undefined });
  });

  it("com categoria fica só com os tipos de produto dentro dela", async () => {
    const d = deps({
      descobrirDominios: vi.fn().mockResolvedValue([
        { dominioId: "MLB-TOILET_PAPERS", categoriaId: "MLB252555" },
        { dominioId: "MLB-TOILET_PAPER_HOLDERS", categoriaId: "MLB186368" },
        { dominioId: "MLB-TOILET_PAPER_HOLDERS", categoriaId: "MLB186368" },
      ]),
      categoria: vi.fn().mockImplementation(async (id: string) =>
        id === "MLB186368"
          ? { id, nome: "Suportes para Papel Higiênico", caminho: [{ id: "MLB1613", nome: "Banheiros" }], filhas: [] }
          : { id, nome: "Papéis Higiênicos", caminho: [{ id: "MLB1246", nome: "Beleza" }], filhas: [] }
      ),
      buscarCatalogo: vi.fn().mockResolvedValue([
        { id: "MLB7", nome: "Porta Papel" },
        { id: "MLB7", nome: "Porta Papel" },
      ]),
    });

    const itens = await buscarPorNome("papel higienico", banheiros, d);

    expect(d.buscarCatalogo).toHaveBeenCalledTimes(1);
    expect(d.buscarCatalogo).toHaveBeenCalledWith("papel higienico", {
      limite: RESULTADOS_BUSCA,
      dominioId: "MLB-TOILET_PAPER_HOLDERS",
    });
    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({ categoriaId: "MLB186368", categoriaNome: "Suportes para Papel Higiênico" });
  });

  it("nenhum tipo de produto dentro da categoria → lista vazia", async () => {
    const d = deps({
      descobrirDominios: vi.fn().mockResolvedValue([{ dominioId: "X", categoriaId: "MLB1" }]),
      categoria: vi.fn().mockResolvedValue({ id: "MLB1", nome: "Outra", caminho: [], filhas: [] }),
    });
    expect(await buscarPorNome("xyz", banheiros, d)).toEqual([]);
    expect(d.buscarCatalogo).not.toHaveBeenCalled();
  });
});
