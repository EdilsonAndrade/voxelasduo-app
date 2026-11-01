import { describe, expect, it } from "vitest";
import { descreverFrete } from "./apresentacao";

describe("descreverFrete", () => {
  it("mostra serviço e valor", () => {
    expect(descreverFrete({ servico: "sedex", valorCentavos: 2550, origem: "fixo" }).replace(/\s/g, " ")).toBe(
      "SEDEX — R$ 25,50"
    );
  });

  it("mostra grátis para combinar com a loja", () => {
    expect(descreverFrete({ servico: "combinar", valorCentavos: 0, origem: "gratis" })).toBe(
      "Combinar com a loja — Grátis"
    );
  });
});
