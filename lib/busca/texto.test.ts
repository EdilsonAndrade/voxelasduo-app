import { describe, expect, it } from "vitest";
import { combinaBusca } from "./texto";

describe("combinaBusca", () => {
  it("aceita tudo com a busca vazia", () => {
    expect(combinaBusca("  ", "Gato")).toBe(true);
  });

  it("ignora acentos, maiúsculas e a ordem das palavras", () => {
    expect(combinaBusca("cafe xicara", "Xícara de Café", "Cozinha")).toBe(true);
    expect(combinaBusca("cozinha", "Xícara de Café", "Cozinha")).toBe(true);
  });

  it("exige todas as palavras", () => {
    expect(combinaBusca("gato azul", "Gato rosa")).toBe(false);
  });
});
