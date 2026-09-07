import { describe, expect, it } from "vitest";
import { validarCadastroCliente } from "./validacaoCadastro";

describe("validarCadastroCliente", () => {
  it("não retorna erros para um payload válido", () => {
    expect(
      validarCadastroCliente({ nome: "Maria", email: "maria@exemplo.com", senha: "senha-forte" })
    ).toEqual({});
  });

  it("exige nome", () => {
    expect(validarCadastroCliente({ email: "maria@exemplo.com", senha: "senha-forte" }).nome).toBeDefined();
    expect(validarCadastroCliente({ nome: "  ", email: "maria@exemplo.com", senha: "senha-forte" }).nome).toBeDefined();
  });

  it("exige e-mail em formato válido", () => {
    expect(validarCadastroCliente({ nome: "Maria", email: "invalido", senha: "senha-forte" }).email).toBeDefined();
    expect(validarCadastroCliente({ nome: "Maria", senha: "senha-forte" }).email).toBeDefined();
  });

  it("exige senha com pelo menos 8 caracteres", () => {
    expect(
      validarCadastroCliente({ nome: "Maria", email: "maria@exemplo.com", senha: "1234567" }).senha
    ).toBeDefined();
    expect(validarCadastroCliente({ nome: "Maria", email: "maria@exemplo.com" }).senha).toBeDefined();
  });
});
