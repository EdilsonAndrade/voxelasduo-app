import { describe, expect, it } from "vitest";
import { montarCalculoDoModelo } from "./calculo";
import type { ModeloSugerido } from "@/lib/models/nicho";
import { validarCalculoPreco } from "@/lib/produtos/calculosPreco";

function modelo(mesas: number): ModeloSugerido {
  return {
    id: 1,
    nome: "Modern Pencil Holder",
    slug: "modern-pencil-holder",
    capa: "",
    autor: "",
    licenca: "BY",
    downloads: 5000,
    url: "https://makerworld.com/pt/models/1-modern-pencil-holder#profileId-2",
    perfil: { id: 3, profileId: 2, nome: "", segundos: 15396, gramas: 135.4, mesas, cores: 1, impressora: "N2S", impressoes: 1 },
  };
}

describe("montarCalculoDoModelo", () => {
  it("preenche tempo em horas, gramas, link e produção de uma mesa", () => {
    const c = montarCalculoDoModelo({ termo: "porta caneta", modelo: modelo(1), linkShopee: " https://shopee.com.br/x-i.1.2 " });

    expect(c.nome).toBe("Porta caneta");
    expect(c.linkModelo3d).toBe("https://makerworld.com/pt/models/1-modern-pencil-holder#profileId-2");
    expect(c.linkShopee).toBe("https://shopee.com.br/x-i.1.2");
    expect(c.linkMercadoLivre).toBeUndefined();
    expect(c.valores.versao).toBe(2);
    expect(c.valores.impressao).toMatchObject({ tempoHoras: "4", tempoMinutos: "17", pesoGramas: "135", pecasPorMesa: "1" });
    expect(c.valores.producao).toMatchObject({ horasPorDia: "20" });
    expect(c.valores.margemMinimaPrecoPercentual).toBe("25");
  });

  it("com várias mesas avisa no nome", () => {
    const c = montarCalculoDoModelo({ termo: "vaso", modelo: modelo(3) });
    expect(c.nome).toContain("3 mesas");
  });

  it("passa na validação do cálculo salvo", () => {
    const { dados, erro } = validarCalculoPreco(montarCalculoDoModelo({ termo: "vaso", modelo: modelo(1) }));
    expect(erro).toBeUndefined();
    expect(dados?.nome).toBe("Vaso");
  });
});
