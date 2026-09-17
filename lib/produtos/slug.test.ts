import { describe, expect, it } from "vitest";
import { decodificarSegmentoRota, gerarSlug } from "./slug";

describe("decodificarSegmentoRota", () => {
  it("decodifica categoria com acento vinda de params (percent-encoded pelo Next.js)", () => {
    expect(decodificarSegmentoRota("decora%C3%A7%C3%A3o")).toBe("decoração");
  });

  it("decodifica espaço codificado", () => {
    expect(decodificarSegmentoRota("casa%20e%20jardim")).toBe("casa e jardim");
  });

  it("mantém inalterado um segmento que não precisa de decodificação", () => {
    expect(decodificarSegmentoRota("Organizadores")).toBe("Organizadores");
  });

  it("devolve o valor original quando a URL tem um % solto, sem lançar erro", () => {
    expect(decodificarSegmentoRota("100%")).toBe("100%");
  });
});

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
