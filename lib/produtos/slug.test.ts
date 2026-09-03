import { describe, expect, it } from "vitest";
import { gerarSlug } from "./slug";

describe("gerarSlug", () => {
  it("normaliza acentos e maiúsculas", () => {
    expect(gerarSlug("Vaso Voronoi Decoração")).toBe("vaso-voronoi-decoracao");
  });

  it("colapsa espaços múltiplos e remove pontuação", () => {
    expect(gerarSlug("  Dragão Articulado! Mini  ")).toBe("dragao-articulado-mini");
  });

  it("troca espaços simples por hífen", () => {
    expect(gerarSlug("Suporte de Celular Modular")).toBe("suporte-de-celular-modular");
  });
});
