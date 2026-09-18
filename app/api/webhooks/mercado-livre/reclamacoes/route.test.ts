import { beforeEach, describe, expect, it, vi } from "vitest";

const { buscarReclamacaoMercadoLivre } = vi.hoisted(() => ({
  buscarReclamacaoMercadoLivre: vi.fn(),
}));
const { upsertReclamacaoPendente } = vi.hoisted(() => ({ upsertReclamacaoPendente: vi.fn() }));

vi.mock("@/lib/estoque/canais/mercadoLivre/reclamacoes", () => ({ buscarReclamacaoMercadoLivre }));
vi.mock("@/lib/atendimento/repository", () => ({ upsertReclamacaoPendente }));

const { POST } = await import("./route");

function requisicao(body: unknown): Request {
  return new Request("http://localhost/api/webhooks/mercado-livre/reclamacoes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const notificacaoBase = { resource: "/post-purchase/v1/claims/555", application_id: "app-123" };

describe("POST /api/webhooks/mercado-livre/reclamacoes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCADOLIVRE_CLIENT_ID = "app-123";
  });

  it("application_id inválido: não processa", async () => {
    const resposta = await POST(requisicao({ ...notificacaoBase, application_id: "outro-app" }));

    expect(resposta.status).toBe(200);
    expect(buscarReclamacaoMercadoLivre).not.toHaveBeenCalled();
  });

  it("reclamação aberta: persiste vinculada ao pedido e com link para a venda", async () => {
    buscarReclamacaoMercadoLivre.mockResolvedValue({
      reclamacaoId: "555",
      pedidoExternoId: "999",
      motivo: "product_not_as_described",
      aberta: true,
    });

    const resposta = await POST(requisicao(notificacaoBase));

    expect(resposta.status).toBe(200);
    expect(upsertReclamacaoPendente).toHaveBeenCalledWith({
      reclamacaoId: "555",
      pedidoExternoId: "999",
      motivo: "product_not_as_described",
      status: "aberta",
      linkOrigem: "https://www.mercadolivre.com.br/vendas/999/detalhe",
    });
  });

  it("reclamação fechada: persiste como fechada", async () => {
    buscarReclamacaoMercadoLivre.mockResolvedValue({
      reclamacaoId: "555",
      pedidoExternoId: "999",
      motivo: "product_not_as_described",
      aberta: false,
    });

    await POST(requisicao(notificacaoBase));

    expect(upsertReclamacaoPendente).toHaveBeenCalledWith(expect.objectContaining({ status: "fechada" }));
  });

  it("falha transitória ao consultar a reclamação: responde 500 para o Mercado Livre reenviar", async () => {
    buscarReclamacaoMercadoLivre.mockRejectedValue(new Error("HTTP 500"));

    const resposta = await POST(requisicao(notificacaoBase));

    expect(resposta.status).toBe(500);
    expect(upsertReclamacaoPendente).not.toHaveBeenCalled();
  });
});
