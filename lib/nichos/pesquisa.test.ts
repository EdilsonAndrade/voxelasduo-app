import { describe, expect, it, vi } from "vitest";
import { chaveDoTermo, pesquisarCategoria, pesquisarTermo, type DependenciasPesquisa } from "./pesquisa";
import type { DesignBruto, HitMakerWorld } from "./makerworld";

const FILTROS = { umaCor: true, compativelA1: true };
const CATEGORIA = { id: "MLB436414", nome: "Organização", grupo: "Casa" };

function designDe(id: number, umaCor = true): DesignBruto {
  return {
    id,
    title: `Modelo ${id}`,
    slug: `modelo-${id}`,
    license: "BY",
    downloadCount: id,
    instances: [
      {
        id: id * 10,
        profileId: id * 100,
        prediction: 3600,
        weight: 40,
        materialColorCnt: umaCor ? 1 : 2,
        needAms: !umaCor,
        printCount: 1,
        extention: { modelInfo: { compatibility: { devModelName: "N2S" }, plates: [{}] } },
      },
    ],
  };
}

/** `hitsPorTermo`: downloads de cada hit — o id do modelo é o próprio número de downloads. */
function deps(termos: string[], hitsPorTermo: Record<string, number[]>, umaCor = true): DependenciasPesquisa {
  return {
    tendenciasCategoria: vi.fn().mockResolvedValue(termos.map((termo) => ({ termo }))),
    contarProdutosCatalogo: vi.fn().mockResolvedValue(2000),
    makerWorld: {
      buscarModelos: vi.fn(async (termo: string) =>
        (hitsPorTermo[termo] ?? []).map((d): HitMakerWorld => ({ id: d, title: "", slug: "", license: "BY", downloadCount: d }))
      ),
      buscarDesign: vi.fn(async (id: number) => designDe(id, umaCor)),
    },
  };
}

describe("chaveDoTermo", () => {
  it("trata plural, preposição e acento como o mesmo termo", () => {
    expect(chaveDoTermo("Organizador de Gavetas")).toBe(chaveDoTermo("organizador gaveta"));
    expect(chaveDoTermo("decoração")).toBe(chaveDoTermo("decoracao"));
  });
});

describe("pesquisarCategoria", () => {
  it("monta oportunidades com potencial, concorrência e modelos, alto primeiro", async () => {
    const d = deps(["porta caneta", "vaso"], { "porta caneta": [500], vaso: [14703, 800] });

    const r = await pesquisarCategoria(CATEGORIA, FILTROS, d);

    expect(r.oportunidades.map((o) => o.termo)).toEqual(["vaso", "porta caneta"]);
    expect(r.oportunidades[0]).toMatchObject({
      posicao: 2,
      potencial: { nivel: "alto" },
      concorrencia: { nivel: "media", produtosCatalogo: 2000 },
    });
    expect(r.oportunidades[0].modelos.map((m) => m.id)).toEqual([14703, 800]);
    expect(r.oportunidades[1].potencial.nivel).toBe("medio");
  });

  it("descarta termos sem modelo relevante (poucos downloads) e oculta potencial baixo", async () => {
    const termos = Array.from({ length: 15 }, (_, i) => `termo ${i + 1}`);
    const hits: Record<string, number[]> = { "termo 1": [100], "termo 15": [400] };

    const d = deps(termos, hits);
    const r = await pesquisarCategoria(CATEGORIA, FILTROS, d);

    expect(r.oportunidades).toEqual([]);
    expect(r.ocultas).toBe(1); // termo 15: 15º e modelo pouco popular
    expect(r.descartados).toBe(14);
    expect(d.contarProdutosCatalogo).not.toHaveBeenCalled();
  });

  it("com 'só 1 cor' ignora modelos multicor", async () => {
    const r = await pesquisarCategoria(CATEGORIA, FILTROS, deps(["vaso"], { vaso: [5000] }, false));
    expect(r.oportunidades).toEqual([]);
    expect(r.descartados).toBe(1);
  });

  it("não repete o mesmo nicho escrito de outro jeito", async () => {
    const d = deps(["organizador de gaveta", "organizador gavetas"], { "organizador de gaveta": [5000], "organizador gavetas": [5000] });
    const r = await pesquisarCategoria(CATEGORIA, FILTROS, d);
    expect(r.oportunidades).toHaveLength(1);
    expect(d.makerWorld.buscarModelos).toHaveBeenCalledTimes(1);
  });

  it("falha da busca do MakerWorld derruba a pesquisa", async () => {
    const d = deps(["vaso"], {});
    vi.mocked(d.makerWorld.buscarModelos).mockRejectedValue(new Error("HTTP 429"));
    await expect(pesquisarCategoria(CATEGORIA, FILTROS, d)).rejects.toThrow("HTTP 429");
  });
});

describe("pesquisarTermo", () => {
  it("devolve modelos e concorrência sem potencial avaliado", async () => {
    const r = await pesquisarTermo("porta caneta", FILTROS, deps([], { "porta caneta": [900] }));
    expect(r.oportunidade).toMatchObject({ posicao: null, potencial: { nivel: "nao_avaliado" }, concorrencia: { nivel: "media" } });
    expect(r.oportunidade.modelos).toHaveLength(1);
  });

  it("falha na contagem do ML deixa a concorrência indisponível", async () => {
    const d = deps([], { x: [900] });
    vi.mocked(d.contarProdutosCatalogo).mockRejectedValue(new Error("HTTP 500"));
    const r = await pesquisarTermo("x", FILTROS, d);
    expect(r.oportunidade.concorrencia.nivel).toBe("indisponivel");
  });
});

describe("bloqueio do MakerWorld", () => {
  it("bloqueio no detalhe derruba a pesquisa; outra falha no detalhe só pula o modelo", async () => {
    const { ErroMakerWorld } = await import("./makerworld");
    const d = deps(["vaso"], { vaso: [5000, 4000] });
    vi.mocked(d.makerWorld.buscarDesign).mockRejectedValueOnce(new ErroMakerWorld(404, "não achou"));
    const r = await pesquisarCategoria(CATEGORIA, FILTROS, d);
    expect(r.oportunidades[0].modelos.map((m) => m.id)).toEqual([4000]);

    vi.mocked(d.makerWorld.buscarDesign).mockRejectedValue(new ErroMakerWorld(403, "bloqueou", true));
    await expect(pesquisarCategoria(CATEGORIA, FILTROS, d)).rejects.toThrow("bloqueou");
  });
});

describe("relevância da busca", () => {
  it("ignora hit de casamento fraco mesmo com muitos downloads", async () => {
    const d = deps(["arara de roupa"], {});
    vi.mocked(d.makerWorld.buscarModelos).mockResolvedValue([
      { id: 981, title: "Tiara", slug: "t", license: "BY", downloadCount: 981, ext: JSON.stringify({ rk: "10.1|5|5" }) },
      { id: 700, title: "Clothes rack", slug: "c", license: "BY", downloadCount: 700, ext: JSON.stringify({ rk: "100.1|0|0" }) },
    ]);
    const r = await pesquisarCategoria(CATEGORIA, FILTROS, d);
    expect(r.oportunidades[0].modelos.map((m) => m.id)).toEqual([700]);
  });
});
