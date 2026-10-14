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
    expect(c.valores.custo).toMatchObject({ tempoImpressaoHoras: "4.28", pesoPecaGramas: "135", precoCarreteReais: "100.00" });
    expect(c.valores.producao).toMatchObject({ pecasPorMesa: "1", horasMesaCheia: "4.28", horasPorDia: "20" });
    expect(c.valores.margemMinimaPrecoPercentual).toBe("25");
  });

  it("com várias mesas deixa a produção em branco e avisa no nome", () => {
    const c = montarCalculoDoModelo({ termo: "vaso", modelo: modelo(3) });
    expect(c.nome).toContain("3 mesas");
    expect(c.valores.producao.pecasPorMesa).toBe("");
  });

  it("passa na validação do cálculo salvo", () => {
    const { dados, erro } = validarCalculoPreco(montarCalculoDoModelo({ termo: "vaso", modelo: modelo(1) }));
    expect(erro).toBeUndefined();
    expect(dados?.nome).toBe("Vaso");
  });
});
