import { describe, expect, it } from "vitest";
import { validarEncomenda, validarImagensEncomenda } from "./validacao";

const payloadValido = {
  nome: "Maria",
  email: "maria@exemplo.com",
  telefone: "(19) 98157-5723",
  descricao: "Quero um chaveiro do meu gato em 3D.",
};

describe("validarEncomenda", () => {
  it("não retorna erros para um payload válido", () => {
    expect(validarEncomenda(payloadValido)).toEqual({});
  });

  it("exige nome", () => {
    expect(validarEncomenda({ ...payloadValido, nome: undefined }).nome).toBeDefined();
    expect(validarEncomenda({ ...payloadValido, nome: "  " }).nome).toBeDefined();
  });

  it("exige e-mail em formato válido", () => {
    expect(validarEncomenda({ ...payloadValido, email: "invalido" }).email).toBeDefined();
    expect(validarEncomenda({ ...payloadValido, email: undefined }).email).toBeDefined();
  });

  it("exige telefone obrigatório com DDD", () => {
    expect(validarEncomenda({ ...payloadValido, telefone: undefined }).telefone).toBeDefined();
    expect(validarEncomenda({ ...payloadValido, telefone: "" }).telefone).toBeDefined();
    expect(validarEncomenda({ ...payloadValido, telefone: "123" }).telefone).toBeDefined();
    expect(validarEncomenda({ ...payloadValido, telefone: "19981575723" }).telefone).toBeUndefined();
  });

  it("exige descrição com tamanho mínimo e máximo", () => {
    expect(validarEncomenda({ ...payloadValido, descricao: undefined }).descricao).toBeDefined();
    expect(validarEncomenda({ ...payloadValido, descricao: "curto" }).descricao).toBeDefined();
    expect(validarEncomenda({ ...payloadValido, descricao: "a".repeat(2001) }).descricao).toBeDefined();
  });

  it("rejeita valores que não são texto", () => {
    expect(validarEncomenda({ nome: 1, email: {}, telefone: [], descricao: null })).toEqual({
      nome: expect.any(String),
      email: expect.any(String),
      telefone: expect.any(String),
      descricao: expect.any(String),
    });
  });
});

describe("validarImagensEncomenda", () => {
  const png = (tamanho = 10) => ({ type: "image/png", size: tamanho });

  it("aceita nenhuma imagem e até 3 imagens válidas", () => {
    expect(validarImagensEncomenda([])).toBeUndefined();
    expect(validarImagensEncomenda([png(), png(), { type: "image/webp", size: 10 }])).toBeUndefined();
  });

  it("recusa mais de 3 imagens", () => {
    expect(validarImagensEncomenda([png(), png(), png(), png()])).toMatch(/no máximo 3/);
  });

  it("recusa formato que não é JPEG, PNG ou WebP", () => {
    expect(validarImagensEncomenda([{ type: "application/pdf", size: 10 }])).toMatch(/Formato/);
  });

  it("recusa imagem acima de 5MB", () => {
    expect(validarImagensEncomenda([png(5 * 1024 * 1024 + 1)])).toMatch(/5MB/);
  });
});
