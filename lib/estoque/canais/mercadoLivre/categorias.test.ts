import { describe, expect, it } from "vitest";
import { montarConsultaPrevisor, resolverCategoriaMercadoLivre } from "./categorias";

describe("montarConsultaPrevisor", () => {
  it("acrescenta o qualificador da categoria do site ao nome do produto", () => {
    expect(montarConsultaPrevisor("decoracao", "Chaveiro VoXElas Duo")).toBe(
      "Chaveiro VoXElas Duo decoração"
    );
  });

  it("categoria sem qualificador configurado: usa só o nome do produto", () => {
    expect(montarConsultaPrevisor("categoria-desconhecida", "Produto X")).toBe("Produto X");
  });
});

describe("resolverCategoriaMercadoLivre", () => {
  it("sem override configurado, retorna undefined", () => {
    expect(resolverCategoriaMercadoLivre("decoracao")).toBeUndefined();
  });
});
