import { describe, expect, it } from "vitest";
import { fotosParaAnuncio, LIMITE_FOTOS_MERCADO_LIVRE } from "./fotos";

describe("fotosParaAnuncio", () => {
  it("com menos de 6 fotos: retorna todas, na mesma ordem", () => {
    const fotos = ["a.jpg", "b.jpg", "c.jpg"];
    expect(fotosParaAnuncio(fotos)).toEqual(fotos);
  });

  it("com exatamente 6 fotos: retorna todas, na mesma ordem", () => {
    const fotos = ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg"];
    expect(fotosParaAnuncio(fotos)).toEqual(fotos);
  });

  it("com mais de 6 fotos: retorna só as 6 primeiras, na mesma ordem", () => {
    const fotos = ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg", "7.jpg", "8.jpg"];
    expect(fotosParaAnuncio(fotos)).toEqual(fotos.slice(0, LIMITE_FOTOS_MERCADO_LIVRE));
    expect(fotosParaAnuncio(fotos)).toHaveLength(6);
  });
});
