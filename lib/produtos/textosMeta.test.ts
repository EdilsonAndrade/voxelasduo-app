import { describe, expect, it } from "vitest";
import { montarTextoMarketplace, resolverTextosMeta } from "./textosMeta";

describe("resolverTextosMeta", () => {
  it("prefere os textos próprios do Facebook", () => {
    expect(
      resolverTextosMeta({
        nome: "Kit Soldados",
        descricao: "Descrição do site",
        metaTitulo: " Kit Soldados 🎄 ",
        metaDescricao: "Chamar no chat",
      })
    ).toEqual({ titulo: "Kit Soldados 🎄", descricao: "Chamar no chat" });
  });

  it("em branco, usa nome e descrição do site; sem descrição, usa o nome", () => {
    expect(resolverTextosMeta({ nome: "Kit", descricao: "Do site", metaTitulo: " " })).toEqual({
      titulo: "Kit",
      descricao: "Do site",
    });
    expect(resolverTextosMeta({ nome: "Kit", descricao: "  " })).toEqual({ titulo: "Kit", descricao: "Kit" });
  });
});

describe("montarTextoMarketplace", () => {
  it("monta título, preço em reais e descrição", () => {
    const texto = montarTextoMarketplace({
      nome: "Kit Soldados",
      descricao: "Do site",
      metaDescricao: "Chamar no chat",
      precoCentavos: 7400,
    });
    expect(texto.titulo).toBe("Kit Soldados");
    expect(texto.preco.replace(/\s/g, " ")).toBe("R$ 74,00");
    expect(texto.descricao).toBe("Chamar no chat");
  });
});
