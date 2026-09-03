import { describe, expect, it } from "vitest";
import { validarCheckout, type CheckoutPayload } from "./validation";

const payloadValido: CheckoutPayload = {
  idempotencia: "token-unico",
  cliente: {
    nome: "Maria Silva",
    email: "maria@exemplo.com",
    telefone: "(11) 99999-8888",
    endereco: {
      logradouro: "Rua das Flores",
      numero: "123",
      complemento: "Apto 4B",
      bairro: "Centro",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01001-000",
    },
  },
  itens: [{ produtoId: "665f1", quantidade: 2 }],
};

describe("validarCheckout", () => {
  it("aceita um payload completo e válido", () => {
    expect(validarCheckout(payloadValido)).toEqual({});
  });

  it("aceita telefone e complemento ausentes", () => {
    const { telefone, ...resto } = payloadValido.cliente!;
    void telefone;
    const payload = { ...payloadValido, cliente: { ...resto } };
    expect(validarCheckout(payload)).toEqual({});
  });

  it("rejeita campos de cliente ausentes", () => {
    const erros = validarCheckout({
      ...payloadValido,
      cliente: { nome: "", email: "invalido", endereco: payloadValido.cliente!.endereco },
    });
    expect(erros).toHaveProperty("cliente.nome");
    expect(erros).toHaveProperty("cliente.email");
  });

  it("rejeita email em formato inválido", () => {
    const erros = validarCheckout({
      ...payloadValido,
      cliente: { ...payloadValido.cliente!, email: "nao-e-email" },
    });
    expect(erros).toHaveProperty("cliente.email");
  });

  it("rejeita telefone sem DDD completo", () => {
    const erros = validarCheckout({
      ...payloadValido,
      cliente: { ...payloadValido.cliente!, telefone: "123" },
    });
    expect(erros).toHaveProperty("cliente.telefone");
  });

  it("rejeita endereço incompleto", () => {
    const erros = validarCheckout({
      ...payloadValido,
      cliente: {
        ...payloadValido.cliente!,
        endereco: {
          logradouro: "",
          numero: "123",
          bairro: "Centro",
          cidade: "São Paulo",
          estado: "SP",
          cep: "01001000",
        },
      },
    });
    expect(erros).toHaveProperty("cliente.endereco.logradouro");
  });

  it("rejeita estado que não seja sigla de 2 letras", () => {
    const erros = validarCheckout({
      ...payloadValido,
      cliente: {
        ...payloadValido.cliente!,
        endereco: { ...payloadValido.cliente!.endereco!, estado: "São Paulo" },
      },
    });
    expect(erros).toHaveProperty("cliente.endereco.estado");
  });

  it("rejeita CEP com menos de 8 dígitos", () => {
    const erros = validarCheckout({
      ...payloadValido,
      cliente: {
        ...payloadValido.cliente!,
        endereco: { ...payloadValido.cliente!.endereco!, cep: "01001" },
      },
    });
    expect(erros).toHaveProperty("cliente.endereco.cep");
  });

  it("rejeita carrinho vazio ou ausente", () => {
    expect(validarCheckout({ ...payloadValido, itens: [] })).toHaveProperty("itens");
    expect(validarCheckout({ ...payloadValido, itens: undefined })).toHaveProperty("itens");
  });

  it("rejeita itens com produto ou quantidade inválidos", () => {
    const erros = validarCheckout({
      ...payloadValido,
      itens: [{ produtoId: "", quantidade: 0 }],
    });
    expect(erros).toHaveProperty("itens[0].produtoId");
    expect(erros).toHaveProperty("itens[0].quantidade");
  });

  it("rejeita ausência de idempotencia", () => {
    expect(validarCheckout({ ...payloadValido, idempotencia: "" })).toHaveProperty(
      "idempotencia"
    );
  });
});
