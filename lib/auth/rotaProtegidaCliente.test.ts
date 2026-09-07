import { describe, expect, it } from "vitest";
import { rotaClienteExigeAutenticacao } from "./rotaProtegidaCliente";

describe("rotaClienteExigeAutenticacao", () => {
  it("protege /minha-conta e subrotas com redirecionamento", () => {
    expect(rotaClienteExigeAutenticacao("/minha-conta", "GET")).toEqual({
      protegida: true,
      tipoResposta: "redirect",
    });
    expect(rotaClienteExigeAutenticacao("/minha-conta/pedidos", "GET")).toEqual({
      protegida: true,
      tipoResposta: "redirect",
    });
    expect(rotaClienteExigeAutenticacao("/minha-conta/pedidos/abc123", "GET")).toEqual({
      protegida: true,
      tipoResposta: "redirect",
    });
  });

  it("protege GET /api/clientes/pedidos com resposta json", () => {
    expect(rotaClienteExigeAutenticacao("/api/clientes/pedidos", "GET")).toEqual({
      protegida: true,
      tipoResposta: "json",
    });
  });

  it("protege /api/clientes/me e subrotas (ex: enderecos) com resposta json", () => {
    expect(rotaClienteExigeAutenticacao("/api/clientes/me", "PATCH")).toEqual({
      protegida: true,
      tipoResposta: "json",
    });
    expect(rotaClienteExigeAutenticacao("/api/clientes/me/enderecos", "GET")).toEqual({
      protegida: true,
      tipoResposta: "json",
    });
  });

  it("não protege o cadastro (POST /api/clientes)", () => {
    expect(rotaClienteExigeAutenticacao("/api/clientes", "POST")).toEqual({ protegida: false });
  });

  it("não protege recuperação/redefinição de senha", () => {
    expect(rotaClienteExigeAutenticacao("/api/clientes/recuperar-senha", "POST")).toEqual({
      protegida: false,
    });
    expect(rotaClienteExigeAutenticacao("/api/clientes/redefinir-senha", "POST")).toEqual({
      protegida: false,
    });
  });

  it("não protege as páginas públicas de entrada (entrar, cadastro)", () => {
    expect(rotaClienteExigeAutenticacao("/entrar", "GET")).toEqual({ protegida: false });
    expect(rotaClienteExigeAutenticacao("/cadastro", "GET")).toEqual({ protegida: false });
  });

  it("não protege o checkout (POST /api/pedidos) nem rotas fora do escopo desta tarefa", () => {
    expect(rotaClienteExigeAutenticacao("/api/pedidos", "POST")).toEqual({ protegida: false });
    expect(rotaClienteExigeAutenticacao("/produtos", "GET")).toEqual({ protegida: false });
  });
});
