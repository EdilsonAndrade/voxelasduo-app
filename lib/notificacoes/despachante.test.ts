import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const ok = () => Promise.resolve(new Response(JSON.stringify({ recebido: true })));
  return {
    processarPagamentoMercadoPago: vi.fn(ok),
    processarPedidoMercadoLivre: vi.fn(ok),
    processarPerguntaMercadoLivre: vi.fn(ok),
    processarReclamacaoMercadoLivre: vi.fn(ok),
    processarMensagemMercadoLivre: vi.fn(ok),
    processarEnvioMercadoLivre: vi.fn(ok),
  };
});

vi.mock("./pagamento", () => ({ processarPagamentoMercadoPago: mocks.processarPagamentoMercadoPago }));
vi.mock("./mercadoLivre/pedidos", () => ({ processarPedidoMercadoLivre: mocks.processarPedidoMercadoLivre }));
vi.mock("./mercadoLivre/perguntas", () => ({ processarPerguntaMercadoLivre: mocks.processarPerguntaMercadoLivre }));
vi.mock("./mercadoLivre/reclamacoes", () => ({
  processarReclamacaoMercadoLivre: mocks.processarReclamacaoMercadoLivre,
}));
vi.mock("./mercadoLivre/mensagens", () => ({ processarMensagemMercadoLivre: mocks.processarMensagemMercadoLivre }));
vi.mock("./mercadoLivre/envios", () => ({ processarEnvioMercadoLivre: mocks.processarEnvioMercadoLivre }));

const { despacharNotificacao } = await import("./despachante");

const SECRET = "segredo-de-teste";

function assinar(dataId: string, requestId: string, ts = "1700000000", secret = SECRET): string {
  const hash = createHmac("sha256", secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
  return `ts=${ts},v1=${hash}`;
}

function requisicao(url: string, corpo?: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
}

describe("despacharNotificacao", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCADOPAGO_WEBHOOK_SECRET = SECRET;
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  it("pagamento MP (Webhook) com assinatura válida → processa o pagamento", async () => {
    const resposta = await despacharNotificacao(
      requisicao("/api/notificacoes?data.id=123&type=payment", { type: "payment", data: { id: "123" } }, {
        "x-signature": assinar("123", "req-1"),
        "x-request-id": "req-1",
      })
    );
    expect(resposta.status).toBe(200);
    expect(mocks.processarPagamentoMercadoPago).toHaveBeenCalledWith("123");
  });

  it("pagamento MP com assinatura inválida → 401 e não processa", async () => {
    const resposta = await despacharNotificacao(
      requisicao("/api/notificacoes?data.id=123&type=payment", { type: "payment", data: { id: "123" } }, {
        "x-signature": assinar("123", "req-1", "1700000000", "outro-segredo"),
        "x-request-id": "req-1",
      })
    );
    expect(resposta.status).toBe(401);
    expect(mocks.processarPagamentoMercadoPago).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it("pagamento MP no formato IPN (sem assinatura) → aceito", async () => {
    const resposta = await despacharNotificacao(requisicao("/api/pagamentos/webhook?id=999&topic=payment"));
    expect(resposta.status).toBe(200);
    expect(mocks.processarPagamentoMercadoPago).toHaveBeenCalledWith("999");
  });

  it("merchant_order do MP → ignorado com 200", async () => {
    const resposta = await despacharNotificacao(requisicao("/api/notificacoes?id=5&topic=merchant_order"));
    expect(resposta.status).toBe(200);
    expect(mocks.processarPagamentoMercadoPago).not.toHaveBeenCalled();
  });

  it.each([
    ["orders_v2", "processarPedidoMercadoLivre"],
    ["questions", "processarPerguntaMercadoLivre"],
    ["claims", "processarReclamacaoMercadoLivre"],
    ["messages", "processarMensagemMercadoLivre"],
    ["shipments", "processarEnvioMercadoLivre"],
  ] as const)("ML %s → %s, sem exigir assinatura", async (topic, processador) => {
    const payload = { resource: "/x/1", topic, application_id: 1 };
    const resposta = await despacharNotificacao(requisicao("/api/pagamentos/webhook", payload));
    expect(resposta.status).toBe(200);
    expect(mocks[processador]).toHaveBeenCalledWith(payload);
    expect(mocks.processarPagamentoMercadoPago).not.toHaveBeenCalled();
  });

  it("ML sem topic numa rota antiga usa o tópico padrão", async () => {
    await despacharNotificacao(
      requisicao("/api/webhooks/mercado-livre/envios", { resource: "/shipments/1", application_id: 1 }),
      { topicoPadrao: "envios" }
    );
    expect(mocks.processarEnvioMercadoLivre).toHaveBeenCalled();
  });

  it("ML com tópico não tratado → 200 sem processar", async () => {
    const resposta = await despacharNotificacao(requisicao("/api/notificacoes", { resource: "/items/1", topic: "items" }));
    expect(resposta.status).toBe(200);
    expect(Object.values(mocks).every((fn) => fn.mock.calls.length === 0)).toBe(true);
  });

  it("corpo ilegível → 200 sem processar", async () => {
    const resposta = await despacharNotificacao(
      new Request("http://localhost/api/notificacoes", { method: "POST", body: "não é json" })
    );
    expect(resposta.status).toBe(200);
  });
});
