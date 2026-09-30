import { describe, expect, it } from "vitest";
import { planejarMigracao } from "./migracao";

const CADASTRADAS = new Set(["organizadores", "acessorios", "decoracao", "presentes", "religioso", "diversos"]);

describe("planejarMigracao", () => {
  it("unifica variações de digitação na categoria cadastrada", () => {
    expect(planejarMigracao(["acessorios", "acessórios", "Organizadores", "decoração"], CADASTRADAS)).toEqual([
      { de: "acessórios", para: "acessorios" },
      { de: "Organizadores", para: "organizadores" },
      { de: "decoração", para: "decoracao" },
    ]);
  });

  it("valor sem correspondência vai para Diversos", () => {
    expect(planejarMigracao(["brinquedos", ""], CADASTRADAS)).toEqual([
      { de: "brinquedos", para: "diversos" },
      { de: "", para: "diversos" },
    ]);
  });

  it("é idempotente: valores que já são slugs cadastrados não geram passos", () => {
    expect(planejarMigracao(["acessorios", "diversos", "religioso"], CADASTRADAS)).toEqual([]);
  });
});
