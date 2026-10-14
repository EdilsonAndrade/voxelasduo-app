import { describe, expect, it } from "vitest";
import {
  classificarPotencial,
  escolherPerfil,
  licencaPermiteVenda,
  nivelConcorrencia,
} from "./classificacao";
import type { DesignBruto, PerfilBruto } from "./makerworld";

const FILTROS = { umaCor: true, compativelA1: true };

function perfil(parcial: Partial<PerfilBruto> & { impressora?: string; outras?: string[] }): PerfilBruto {
  const { impressora = "N2S", outras = [], ...resto } = parcial;
  return {
    id: 1,
    profileId: 10,
    title: "0.2mm layer",
    prediction: 3600,
    weight: 50,
    materialColorCnt: 1,
    needAms: false,
    printCount: 100,
    ratingScoreTotal: 10,
    extention: {
      modelInfo: {
        compatibility: { devModelName: impressora },
        otherCompatibility: outras.map((devModelName) => ({ devModelName })),
        plates: [{}],
      },
      otherCompatibilityModelInfo: [],
    },
    ...resto,
  };
}

function design(instances: PerfilBruto[], license = "BY"): DesignBruto {
  return {
    id: 99,
    title: "Porta caneta",
    slug: "porta-caneta",
    coverUrl: "https://capa",
    license,
    downloadCount: 5000,
    designCreator: { name: "Autor" },
    instances,
  };
}

describe("licencaPermiteVenda", () => {
  it("aceita só CC0, BY e BY-SA", () => {
    expect(licencaPermiteVenda("CC0")).toBe(true);
    expect(licencaPermiteVenda("BY-SA")).toBe(true);
    expect(licencaPermiteVenda("BY-NC")).toBe(false);
    expect(licencaPermiteVenda("Standard Digital File License")).toBe(false);
    expect(licencaPermiteVenda(undefined)).toBe(false);
  });
});

describe("nivelConcorrencia", () => {
  it("separa em baixa, média e alta pelos produtos de catálogo", () => {
    expect(nivelConcorrencia(999).nivel).toBe("baixa");
    expect(nivelConcorrencia(1000).nivel).toBe("media");
    expect(nivelConcorrencia(4999).nivel).toBe("media");
    expect(nivelConcorrencia(10000)).toEqual({ nivel: "alta", produtosCatalogo: 10000 });
    expect(nivelConcorrencia(null).nivel).toBe("indisponivel");
  });
});

describe("classificarPotencial", () => {
  it("top 10 com modelo popular é alto", () => {
    const p = classificarPotencial({ posicao: 4, categoriaNome: "Organização", maxDownloads: 14703 });
    expect(p.nivel).toBe("alto");
    expect(p.motivo).toContain("4º mais buscado em Organização");
  });

  it("top 10 sem modelo popular, ou 11–20 com modelo popular, é médio", () => {
    expect(classificarPotencial({ posicao: 9, categoriaNome: "x", maxDownloads: 400 }).nivel).toBe("medio");
    expect(classificarPotencial({ posicao: 15, categoriaNome: "x", maxDownloads: 3000 }).nivel).toBe("medio");
  });

  it("11–20 sem modelo popular é baixo", () => {
    expect(classificarPotencial({ posicao: 15, categoriaNome: "x", maxDownloads: 2999 }).nivel).toBe("baixo");
  });
});

describe("escolherPerfil", () => {
  it("recusa licença que não permite venda", () => {
    expect(escolherPerfil(design([perfil({})], "BY-NC-SA"), FILTROS)).toBeNull();
  });

  it("com 'só 1 cor' descarta perfis de 2 cores ou com AMS", () => {
    const d = design([perfil({ materialColorCnt: 2 }), perfil({ needAms: true })]);
    expect(escolherPerfil(d, FILTROS)).toBeNull();
    expect(escolherPerfil(d, { umaCor: false, compativelA1: true })).not.toBeNull();
  });

  it("escolhe o perfil mais impresso e monta o link no perfil", () => {
    const d = design([
      perfil({ id: 1, profileId: 11, printCount: 5 }),
      perfil({ id: 2, profileId: 22, printCount: 50, prediction: 7200, weight: 80 }),
    ]);
    const m = escolherPerfil(d, FILTROS)!;
    expect(m.perfil).toMatchObject({ id: 2, profileId: 22, segundos: 7200, gramas: 80, mesas: 1, impressora: "N2S" });
    expect(m.url).toBe("https://makerworld.com/pt/models/99-porta-caneta#profileId-22");
    expect(m.licenca).toBe("BY");
  });

  it("perfil de outra impressora usa o fatiamento para A1 quando existe", () => {
    const p = perfil({ impressora: "C12", prediction: 46364, weight: 437 });
    p.extention!.otherCompatibilityModelInfo = [
      { devModelName: "N2S", prediction: 50000, weight: 440, modelInfo: { plates: [{}, {}, {}] } },
    ];
    const m = escolherPerfil(design([p]), FILTROS)!;
    expect(m.perfil).toMatchObject({ segundos: 50000, gramas: 440, mesas: 3, impressora: "N2S" });
  });

  it("perfil de outra impressora sem A1 na compatibilidade fica de fora com filtro A1", () => {
    const p = perfil({ impressora: "C12", outras: ["BL-P001"] });
    expect(escolherPerfil(design([p]), FILTROS)).toBeNull();
    expect(escolherPerfil(design([p]), { umaCor: true, compativelA1: false })).not.toBeNull();
  });

  it("aceita perfil de outra impressora que lista a A1 como compatível", () => {
    const p = perfil({ impressora: "C12", outras: ["N2S"] });
    expect(escolherPerfil(design([p]), FILTROS)?.perfil.impressora).toBe("C12");
  });

  it("descarta perfil sem tempo ou sem gramas", () => {
    expect(escolherPerfil(design([perfil({ prediction: 0 })]), FILTROS)).toBeNull();
    expect(escolherPerfil(design([perfil({ weight: undefined })]), FILTROS)).toBeNull();
  });
});
