import { describe, expect, it } from "vitest";
import { ErroCategoriaInvalida, respostaDeErroProdutosAlta } from "./erros";

describe("respostaDeErroProdutosAlta", () => {
  it("400 para categoria inválida", () => {
    expect(respostaDeErroProdutosAlta(new ErroCategoriaInvalida())).toMatchObject({
      status: 400,
      corpo: { erro: "categoria_invalida" },
    });
  });

  it("401 quando o token não renova", () => {
    const r = respostaDeErroProdutosAlta(new Error("Falha ao renovar token do Mercado Livre (HTTP 400)."));
    expect(r).toMatchObject({ status: 401, corpo: { erro: "token_invalido" } });
  });

  it("429 com o status real quando o ML limita", () => {
    const r = respostaDeErroProdutosAlta(new Error("Falha ao consultar (HTTP 429): too many requests"));
    expect(r).toMatchObject({ status: 429, corpo: { erro: "limite_mercado_livre", statusOrigem: 429 } });
  });

  it("502 com a mensagem e o status real nas demais falhas", () => {
    const r = respostaDeErroProdutosAlta(new Error("Falha ao consultar (HTTP 500): boom"));
    expect(r).toEqual({
      status: 502,
      corpo: { erro: "falha_mercado_livre", mensagem: "Falha ao consultar (HTTP 500): boom", statusOrigem: 500 },
    });
  });
});
