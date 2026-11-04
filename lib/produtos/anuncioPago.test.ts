import { describe, expect, it } from "vitest";
import { percentualDoAnuncio, validarAnuncioPago } from "./anuncioPago";

describe("percentualDoAnuncio", () => {
  it("ROAS 8 ligado reserva 12,5% do preço", () => {
    expect(percentualDoAnuncio({ ativo: true, roasMeta: 8 })).toBe(12.5);
  });

  it("desligado ou ausente não reserva nada", () => {
    expect(percentualDoAnuncio({ ativo: false, roasMeta: 8 })).toBe(0);
    expect(percentualDoAnuncio(undefined)).toBe(0);
  });

  it("ROAS inválido não reserva nada", () => {
    expect(percentualDoAnuncio({ ativo: true, roasMeta: 0 })).toBe(0);
  });
});

describe("validarAnuncioPago", () => {
  it("aceita ligado e desligado com ROAS válido", () => {
    expect(validarAnuncioPago({ ativo: true, roasMeta: 8 })).toBeNull();
    expect(validarAnuncioPago({ ativo: false, roasMeta: 4.5 })).toBeNull();
  });

  it.each([0, -2, 101, "8", Number.NaN])("recusa ROAS %s", (roasMeta) => {
    expect(validarAnuncioPago({ ativo: true, roasMeta })).toMatch(/ROAS meta inválido/);
  });

  it("recusa formato e ativo inválidos", () => {
    expect(validarAnuncioPago("sim")).toMatch(/formato/);
    expect(validarAnuncioPago({ roasMeta: 8 })).toMatch(/ligado/);
  });
});
