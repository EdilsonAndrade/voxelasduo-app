import { describe, expect, it } from "vitest";
import { validarConfigFrete } from "./validation";

describe("validarConfigFrete", () => {
  it("aceita valores inteiros em centavos, inclusive zero", () => {
    expect(validarConfigFrete({ pacCentavos: 1990, sedexCentavos: 0 })).toEqual({});
  });

  it("rejeita ausente, negativo, fracionado ou texto", () => {
    expect(validarConfigFrete({})).toEqual({
      pacCentavos: expect.any(String),
      sedexCentavos: expect.any(String),
    });
    expect(validarConfigFrete({ pacCentavos: -1, sedexCentavos: 2550 })).toHaveProperty("pacCentavos");
    expect(validarConfigFrete({ pacCentavos: 1990, sedexCentavos: 25.5 })).toHaveProperty("sedexCentavos");
    expect(validarConfigFrete({ pacCentavos: "1990", sedexCentavos: 2550 })).toHaveProperty("pacCentavos");
    expect(validarConfigFrete(null)).toHaveProperty("pacCentavos");
  });
});
