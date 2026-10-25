import { describe, expect, it } from "vitest";
import { identificarNotificacao } from "./identificar";

function query(texto = ""): URLSearchParams {
  return new URLSearchParams(texto);
}

describe("identificarNotificacao", () => {
  it.each([
    ["orders_v2", "pedidos"],
    ["questions", "perguntas"],
    ["claims", "reclamacoes"],
    ["claims_actions", "reclamacoes"],
    ["messages", "mensagens"],
    ["shipments", "envios"],
  ])("ML com topic %s → %s", (topic, topico) => {
    const resultado = identificarNotificacao({
      query: query(),
      corpo: { resource: "/x/1", topic, application_id: 123 },
    });
    expect(resultado).toMatchObject({ origem: "mercado_livre", topico });
  });

  it("ML com topic não tratado → topico null", () => {
    const resultado = identificarNotificacao({
      query: query(),
      corpo: { resource: "/items/MLB1", topic: "items" },
    });
    expect(resultado).toMatchObject({ origem: "mercado_livre", topico: null, topicoOriginal: "items" });
  });

  it("ML sem topic usa o tópico padrão da rota antiga", () => {
    const resultado = identificarNotificacao({
      query: query(),
      corpo: { resource: "/questions/1", application_id: "app" },
      topicoPadrao: "perguntas",
    });
    expect(resultado).toMatchObject({ origem: "mercado_livre", topico: "perguntas" });
  });

  it("topic explícito prevalece sobre o tópico padrão (URL única configurada numa rota antiga)", () => {
    const resultado = identificarNotificacao({
      query: query(),
      corpo: { resource: "/orders/1", topic: "orders_v2" },
      topicoPadrao: "perguntas",
    });
    expect(resultado).toMatchObject({ origem: "mercado_livre", topico: "pedidos" });
  });

  it("MP formato Webhook (query data.id + type)", () => {
    const resultado = identificarNotificacao({
      query: query("data.id=185473117082&type=payment"),
      corpo: { action: "payment.updated", type: "payment", data: { id: "185473117082" } },
    });
    expect(resultado).toEqual({ origem: "mercado_pago", tipo: "payment", id: "185473117082" });
  });

  it("MP formato Webhook só no corpo", () => {
    const resultado = identificarNotificacao({
      query: query(),
      corpo: { type: "payment", data: { id: 123 } },
    });
    expect(resultado).toEqual({ origem: "mercado_pago", tipo: "payment", id: "123" });
  });

  it("MP formato IPN (query id + topic)", () => {
    const resultado = identificarNotificacao({ query: query("id=999&topic=payment"), corpo: {} });
    expect(resultado).toEqual({ origem: "mercado_pago", tipo: "payment", id: "999" });
  });

  it("MP merchant_order é identificado com o tipo original", () => {
    const resultado = identificarNotificacao({ query: query("id=5&topic=merchant_order"), corpo: null });
    expect(resultado).toEqual({ origem: "mercado_pago", tipo: "merchant_order", id: "5" });
  });

  it("corpo vazio e sem query → desconhecida", () => {
    expect(identificarNotificacao({ query: query(), corpo: null })).toEqual({ origem: "desconhecida" });
  });
});
