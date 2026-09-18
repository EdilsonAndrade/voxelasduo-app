import { beforeEach, describe, expect, it, vi } from "vitest";

const { buscarMensagemMercadoLivre } = vi.hoisted(() => ({
  buscarMensagemMercadoLivre: vi.fn(),
}));
const { upsertMensagemPendente } = vi.hoisted(() => ({ upsertMensagemPendente: vi.fn() }));

vi.mock("@/lib/estoque/canais/mercadoLivre/mensagens", () => ({ buscarMensagemMercadoLivre }));
vi.mock("@/lib/atendimento/repository", () => ({ upsertMensagemPendente }));

const { POST } = await import("./route");

function requisicao(body: unknown): Request {
  return new Request("http://localhost/api/webhooks/mercado-livre/mensagens", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const notificacaoBase = { resource: "/messages/packs/pack-999", application_id: "app-123" };

describe("POST /api/webhooks/mercado-livre/mensagens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCADOLIVRE_CLIENT_ID = "app-123";
  });

  it("application_id inválido: não processa", async () => {
    const resposta = await POST(requisicao({ ...notificacaoBase, application_id: "outro-app" }));

    expect(resposta.status).toBe(200);
    expect(buscarMensagemMercadoLivre).not.toHaveBeenCalled();
  });

  it("mensagem nova: persiste vinculada ao pedido e com link para a venda", async () => {
    buscarMensagemMercadoLivre.mockResolvedValue({
      mensagemId: "msg-2",
      pedidoExternoId: "pack-999",
      texto: "Chegou quando?",
      pendente: true,
    });

    const resposta = await POST(requisicao(notificacaoBase));

    expect(resposta.status).toBe(200);
    expect(upsertMensagemPendente).toHaveBeenCalledWith({
      mensagemId: "msg-2",
      pedidoExternoId: "pack-999",
      texto: "Chegou quando?",
      status: "pendente",
      linkOrigem: "https://www.mercadolivre.com.br/vendas/pack-999/detalhe",
    });
  });

  it("falha transitória ao consultar a mensagem: responde 500 para o Mercado Livre reenviar", async () => {
    buscarMensagemMercadoLivre.mockRejectedValue(new Error("HTTP 500"));

    const resposta = await POST(requisicao(notificacaoBase));

    expect(resposta.status).toBe(500);
    expect(upsertMensagemPendente).not.toHaveBeenCalled();
  });
});
