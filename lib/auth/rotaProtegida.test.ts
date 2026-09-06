import { describe, expect, it } from "vitest";
import { rotaExigeAutenticacao } from "./rotaProtegida";

describe("rotaExigeAutenticacao", () => {
  it("não protege a própria tela de login", () => {
    expect(rotaExigeAutenticacao("/admin/login", "GET")).toEqual({ protegida: false });
  });

  it("protege qualquer rota /admin/** com redirecionamento", () => {
    expect(rotaExigeAutenticacao("/admin", "GET")).toEqual({
      protegida: true,
      tipoResposta: "redirect",
    });
    expect(rotaExigeAutenticacao("/admin/produtos", "GET")).toEqual({
      protegida: true,
      tipoResposta: "redirect",
    });
    expect(rotaExigeAutenticacao("/admin/pedidos", "GET")).toEqual({
      protegida: true,
      tipoResposta: "redirect",
    });
    expect(rotaExigeAutenticacao("/admin/produtos/novo", "POST")).toEqual({
      protegida: true,
      tipoResposta: "redirect",
    });
  });

  it("não protege POST /api/pedidos (checkout público)", () => {
    expect(rotaExigeAutenticacao("/api/pedidos", "POST")).toEqual({ protegida: false });
  });

  it("protege GET /api/pedidos (listagem administrativa) com resposta json", () => {
    expect(rotaExigeAutenticacao("/api/pedidos", "GET")).toEqual({
      protegida: true,
      tipoResposta: "json",
    });
  });

  it("protege /api/pedidos/[id] (detalhe/atualização) em qualquer método", () => {
    expect(rotaExigeAutenticacao("/api/pedidos/abc123", "GET")).toEqual({
      protegida: true,
      tipoResposta: "json",
    });
    expect(rotaExigeAutenticacao("/api/pedidos/abc123", "PATCH")).toEqual({
      protegida: true,
      tipoResposta: "json",
    });
  });

  it("protege toda a família /api/produtos/** em qualquer método", () => {
    expect(rotaExigeAutenticacao("/api/produtos", "GET")).toEqual({
      protegida: true,
      tipoResposta: "json",
    });
    expect(rotaExigeAutenticacao("/api/produtos", "POST")).toEqual({
      protegida: true,
      tipoResposta: "json",
    });
    expect(rotaExigeAutenticacao("/api/produtos/abc123", "DELETE")).toEqual({
      protegida: true,
      tipoResposta: "json",
    });
    expect(rotaExigeAutenticacao("/api/produtos/upload", "POST")).toEqual({
      protegida: true,
      tipoResposta: "json",
    });
    expect(rotaExigeAutenticacao("/api/produtos/abc123/mercado-livre/publicar", "POST")).toEqual({
      protegida: true,
      tipoResposta: "json",
    });
  });

  it("não protege rotas fora do escopo desta tarefa (checkout, pagamentos, webhooks, cron)", () => {
    expect(rotaExigeAutenticacao("/produtos", "GET")).toEqual({ protegida: false });
    expect(rotaExigeAutenticacao("/api/pagamentos", "POST")).toEqual({ protegida: false });
    expect(rotaExigeAutenticacao("/api/pagamentos/webhook", "POST")).toEqual({
      protegida: false,
    });
    expect(rotaExigeAutenticacao("/api/webhooks/mercado-livre/pedidos", "POST")).toEqual({
      protegida: false,
    });
    expect(rotaExigeAutenticacao("/api/estoque/sincronizar", "POST")).toEqual({
      protegida: false,
    });
    expect(rotaExigeAutenticacao("/api/estoque/mercado-livre/callback", "GET")).toEqual({
      protegida: false,
    });
    expect(rotaExigeAutenticacao("/api/health", "GET")).toEqual({ protegida: false });
  });
});
