import { describe, expect, it } from "vitest";
import {
  ajustarPrecoEvento,
  arredondarPara90Acima,
  percentualAjusteValido,
  centavosParaTexto,
  erroPrecoMercadoLivre,
  erroPrecoSite,
  letraIndice,
  margemPercentual,
  ordenarPorNome,
  textoParaCentavos,
} from "./precoLista";

describe("textoParaCentavos", () => {
  it("aceita vírgula, ponto, R$ e milhar", () => {
    expect(textoParaCentavos("49,90")).toBe(4990);
    expect(textoParaCentavos("49.90")).toBe(4990);
    expect(textoParaCentavos("R$ 49,9")).toBe(4990);
    expect(textoParaCentavos("1.299,90")).toBe(129990);
    expect(textoParaCentavos("50")).toBe(5000);
  });

  it("vazio = null; texto inválido = NaN", () => {
    expect(textoParaCentavos("  ")).toBeNull();
    expect(textoParaCentavos("abc")).toBeNaN();
    expect(textoParaCentavos("-10")).toBeNaN();
    expect(textoParaCentavos("10,999")).toBeNaN();
  });
});

describe("centavosParaTexto", () => {
  it("formata com vírgula e vazio para ausente", () => {
    expect(centavosParaTexto(4990)).toBe("49,90");
    expect(centavosParaTexto(null)).toBe("");
    expect(centavosParaTexto(undefined)).toBe("");
  });
});

describe("validação", () => {
  it("preço do site é obrigatório e maior que zero", () => {
    expect(erroPrecoSite(null)).not.toBeNull();
    expect(erroPrecoSite(Number.NaN)).not.toBeNull();
    expect(erroPrecoSite(0)).not.toBeNull();
    expect(erroPrecoSite(100)).toBeNull();
  });

  it("preço do Mercado Livre pode ficar vazio", () => {
    expect(erroPrecoMercadoLivre(null)).toBeNull();
    expect(erroPrecoMercadoLivre(0)).not.toBeNull();
    expect(erroPrecoMercadoLivre(Number.NaN)).not.toBeNull();
    expect(erroPrecoMercadoLivre(100)).toBeNull();
  });
});

describe("margemPercentual", () => {
  it("calcula sobre o preço e ignora sem custo", () => {
    expect(margemPercentual(10000, 4000)).toBe(60);
    expect(margemPercentual(10000, 12000)).toBe(-20);
    expect(margemPercentual(10000, null)).toBeNull();
    expect(margemPercentual(null, 4000)).toBeNull();
    expect(margemPercentual(Number.NaN, 4000)).toBeNull();
  });
});

describe("ordenarPorNome", () => {
  it("ignora maiúsculas e acentos e não muta a entrada", () => {
    const entrada = [{ nome: "vaso" }, { nome: "Árvore" }, { nome: "abajur" }, { nome: "Boneco" }];
    expect(ordenarPorNome(entrada).map((p) => p.nome)).toEqual(["abajur", "Árvore", "Boneco", "vaso"]);
    expect(entrada[0].nome).toBe("vaso");
  });
});

describe("letraIndice", () => {
  it("usa a inicial sem acento ou # para não letras", () => {
    expect(letraIndice("Árvore")).toBe("A");
    expect(letraIndice("  chaveiro")).toBe("C");
    expect(letraIndice("3D Dragão")).toBe("#");
  });
});

describe("ajuste do evento", () => {
  it("arredonda para cima terminando em ,90", () => {
    expect(arredondarPara90Acima(14286)).toBe(14290);
    expect(arredondarPara90Acima(14290)).toBe(14290);
    expect(arredondarPara90Acima(14295)).toBe(14390);
    expect(arredondarPara90Acima(5)).toBe(90);
  });

  it("divide por (1 − %) e, descontada a comissão, cobre o preço de antes", () => {
    expect(ajustarPrecoEvento(10000, 30)).toBe(14290);
    for (const preco of [990, 4990, 12345, 29990]) {
      const evento = ajustarPrecoEvento(preco, 30);
      expect(evento * 0.7).toBeGreaterThanOrEqual(preco);
      expect(evento % 100).toBe(90);
    }
  });

  it("aceita percentual de 1 a 90", () => {
    expect(percentualAjusteValido(30)).toBe(true);
    expect(percentualAjusteValido(0)).toBe(false);
    expect(percentualAjusteValido(91)).toBe(false);
    expect(percentualAjusteValido(Number.NaN)).toBe(false);
  });
});
