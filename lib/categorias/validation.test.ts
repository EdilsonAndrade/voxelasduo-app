import { describe, expect, it } from "vitest";
import { nomesEquivalentes, validarNomeCategoria } from "./validation";

describe("nomesEquivalentes", () => {
  it("ignora acentos, maiúsculas e espaços extras", () => {
    expect(nomesEquivalentes("acessorios", "Acessórios")).toBe(true);
    expect(nomesEquivalentes("  acessórios ", "ACESSORIOS")).toBe(true);
  });

  it("distingue nomes diferentes", () => {
    expect(nomesEquivalentes("Decoração", "Religioso")).toBe(false);
  });
});

describe("validarNomeCategoria", () => {
  it("aceita um nome comum", () => {
    expect(validarNomeCategoria("Religioso")).toBeUndefined();
  });

  it("rejeita vazio, só espaços ou não string", () => {
    expect(validarNomeCategoria("")).toBeDefined();
    expect(validarNomeCategoria("   ")).toBeDefined();
    expect(validarNomeCategoria(undefined)).toBeDefined();
  });

  it("rejeita nome só com símbolos", () => {
    expect(validarNomeCategoria("!!!")).toBe("Use ao menos uma letra ou número no nome.");
  });

  it("rejeita nome acima do limite", () => {
    expect(validarNomeCategoria("a".repeat(61))).toBeDefined();
  });
});
