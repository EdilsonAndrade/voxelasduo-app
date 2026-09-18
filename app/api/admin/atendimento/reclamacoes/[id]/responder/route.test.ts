import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReclamacaoMercadoLivre } from "@/lib/models/atendimento";

const { responderReclamacaoMercadoLivre } = vi.hoisted(() => ({
  responderReclamacaoMercadoLivre: vi.fn(),
}));
const { buscarReclamacaoPorId } = vi.hoisted(() => ({ buscarReclamacaoPorId: vi.fn() }));

vi.mock("@/lib/estoque/canais/mercadoLivre/reclamacoes", () => ({ responderReclamacaoMercadoLivre }));
vi.mock("@/lib/atendimento/repository", () => ({ buscarReclamacaoPorId }));

const { POST } = await import("./route");

function requisicao(id: string, body: unknown) {
  const request = new Request(`http://localhost/api/admin/atendimento/reclamacoes/${id}/responder`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

const reclamacaoMock: ReclamacaoMercadoLivre = {
  _id: new ObjectId(),
  reclamacaoId: "555",
  pedidoExternoId: "999",
  motivo: "product_not_as_described",
  status: "aberta",
  linkOrigem: "https://www.mercadolivre.com.br/vendas/999/detalhe",
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

describe("POST /api/admin/atendimento/reclamacoes/[id]/responder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404 quando a reclamação não existe", async () => {
    buscarReclamacaoPorId.mockResolvedValue(null);

    const resposta = await requisicao(reclamacaoMock._id!.toString(), { texto: "Vamos resolver" });

    expect(resposta.status).toBe(404);
  });

  it("sucesso: responde no Mercado Livre e não marca como resolvida (só a notificação de fechamento faz isso)", async () => {
    buscarReclamacaoPorId.mockResolvedValue(reclamacaoMock);

    const resposta = await requisicao(reclamacaoMock._id!.toString(), { texto: "Vamos resolver" });
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo).toEqual({ ok: true, resolvido: false });
    expect(responderReclamacaoMercadoLivre).toHaveBeenCalledWith("555", "Vamos resolver");
  });

  it("falha na API do Mercado Livre: 502 (FR-015)", async () => {
    buscarReclamacaoPorId.mockResolvedValue(reclamacaoMock);
    responderReclamacaoMercadoLivre.mockRejectedValue(new Error("HTTP 500"));

    const resposta = await requisicao(reclamacaoMock._id!.toString(), { texto: "Vamos resolver" });

    expect(resposta.status).toBe(502);
  });
});
