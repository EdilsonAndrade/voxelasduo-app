import { describe, expect, it } from "vitest";
import { calcularBackoff } from "./fila";

describe("calcularBackoff", () => {
  it("primeira tentativa: 1 minuto", () => {
    expect(calcularBackoff(1)).toBe(60 * 1000);
  });

  it("segunda tentativa: 5 minutos", () => {
    expect(calcularBackoff(2)).toBe(5 * 60 * 1000);
  });

  it("terceira tentativa: 30 minutos", () => {
    expect(calcularBackoff(3)).toBe(30 * 60 * 1000);
  });

  it("quarta tentativa: 2 horas", () => {
    expect(calcularBackoff(4)).toBe(2 * 60 * 60 * 1000);
  });

  it("quinta tentativa: 6 horas", () => {
    expect(calcularBackoff(5)).toBe(6 * 60 * 60 * 1000);
  });

  it("além do máximo definido, mantém o último patamar (6 horas)", () => {
    expect(calcularBackoff(9)).toBe(6 * 60 * 60 * 1000);
  });
});
