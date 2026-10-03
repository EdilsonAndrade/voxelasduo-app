import { describe, expect, it } from "vitest";
import { estaPublicado, faltaFotoParaPublicar, FILTRO_PUBLICADO } from "./publicacao";

describe("estaPublicado", () => {
  it("trata o campo ausente como publicado (produtos anteriores ao campo)", () => {
    expect(estaPublicado({})).toBe(true);
    expect(estaPublicado({ publicado: undefined })).toBe(true);
  });

  it("só considera rascunho quando publicado é false", () => {
    expect(estaPublicado({ publicado: false })).toBe(false);
    expect(estaPublicado({ publicado: true })).toBe(true);
  });
});

describe("FILTRO_PUBLICADO", () => {
  it("usa $ne: false para não excluir quem não tem o campo", () => {
    expect(FILTRO_PUBLICADO).toEqual({ publicado: { $ne: false } });
  });
});

describe("faltaFotoParaPublicar", () => {
  it("não cobra foto de rascunho", () => {
    expect(faltaFotoParaPublicar({ publicado: false, fotos: [] })).toBe(false);
    expect(faltaFotoParaPublicar({ publicado: false })).toBe(false);
  });

  it("cobra foto de quem vai ao ar, inclusive com o campo ausente", () => {
    expect(faltaFotoParaPublicar({ publicado: true, fotos: [] })).toBe(true);
    expect(faltaFotoParaPublicar({ fotos: [] })).toBe(true);
    expect(faltaFotoParaPublicar({})).toBe(true);
  });

  it("aceita quem vai ao ar com ao menos uma foto", () => {
    expect(faltaFotoParaPublicar({ publicado: true, fotos: ["https://blob/x.jpg"] })).toBe(false);
  });
});
