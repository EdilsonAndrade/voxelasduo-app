import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MensagemPosVendaMercadoLivre } from "@/lib/models/atendimento";

const { responderMensagemMercadoLivre } = vi.hoisted(() => ({
  responderMensagemMercadoLivre: vi.fn(),
}));
const { buscarMensagemPorId, marcarMensagemRespondida } = vi.hoisted(() => ({
  buscarMensagemPorId: vi.fn(),
  marcarMensagemRespondida: vi.fn(),
}));

vi.mock("@/lib/estoque/canais/mercadoLivre/mensagens", () => ({ responderMensagemMercadoLivre }));
vi.mock("@/lib/atendimento/repository", () => ({ buscarMensagemPorId, marcarMensagemRespondida }));

const { POST } = await import("./route");

function requisicao(id: string, body: unknown) {
  const request = new Request(`http://localhost/api/admin/atendimento/mensagens/${id}/responder`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

const mensagemMock: MensagemPosVendaMercadoLivre = {
  _id: new ObjectId(),
  mensagemId: "msg-2",
  pedidoExternoId: "pack-999",
  texto: "Chegou quando?",
  status: "pendente",
  linkOrigem: "https://www.mercadolivre.com.br/vendas/pack-999/detalhe",
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

describe("POST /api/admin/atendimento/mensagens/[id]/responder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404 quando a mensagem não existe", async () => {
    buscarMensagemPorId.mockResolvedValue(null);

    const resposta = await requisicao(mensagemMock._id!.toString(), { texto: "Chega amanhã!" });

    expect(resposta.status).toBe(404);
  });

  it("sucesso: responde no Mercado Livre e marca como respondida", async () => {
    buscarMensagemPorId.mockResolvedValue(mensagemMock);

    const resposta = await requisicao(mensagemMock._id!.toString(), { texto: "Chega amanhã!" });
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo).toEqual({ ok: true, resolvido: true });
    expect(responderMensagemMercadoLivre).toHaveBeenCalledWith("pack-999", "Chega amanhã!");
    expect(marcarMensagemRespondida).toHaveBeenCalledWith("msg-2");
  });

  it("falha na API do Mercado Livre: 502 e mantém pendente (FR-015)", async () => {
    buscarMensagemPorId.mockResolvedValue(mensagemMock);
    responderMensagemMercadoLivre.mockRejectedValue(new Error("HTTP 500"));

    const resposta = await requisicao(mensagemMock._id!.toString(), { texto: "Chega amanhã!" });

    expect(resposta.status).toBe(502);
    expect(marcarMensagemRespondida).not.toHaveBeenCalled();
  });
});
