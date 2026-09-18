import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PerguntaMercadoLivre } from "@/lib/models/atendimento";

const { responderPerguntaMercadoLivre } = vi.hoisted(() => ({
  responderPerguntaMercadoLivre: vi.fn(),
}));
const { buscarPerguntaPorId, marcarPerguntaRespondida } = vi.hoisted(() => ({
  buscarPerguntaPorId: vi.fn(),
  marcarPerguntaRespondida: vi.fn(),
}));

vi.mock("@/lib/estoque/canais/mercadoLivre/perguntas", () => ({ responderPerguntaMercadoLivre }));
vi.mock("@/lib/atendimento/repository", () => ({ buscarPerguntaPorId, marcarPerguntaRespondida }));

const { POST } = await import("./route");

function requisicao(id: string, body: unknown) {
  const request = new Request(`http://localhost/api/admin/atendimento/perguntas/${id}/responder`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

const perguntaMock: PerguntaMercadoLivre = {
  _id: new ObjectId(),
  perguntaId: "123456789",
  itemId: "MLB123",
  texto: "Tem em azul?",
  status: "pendente",
  linkOrigem: "https://produto.mercadolivre.com.br/MLB-123",
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

describe("POST /api/admin/atendimento/perguntas/[id]/responder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("400 sem texto", async () => {
    const resposta = await requisicao(perguntaMock._id!.toString(), { texto: "  " });

    expect(resposta.status).toBe(400);
    expect(responderPerguntaMercadoLivre).not.toHaveBeenCalled();
  });

  it("404 quando a pergunta não existe", async () => {
    buscarPerguntaPorId.mockResolvedValue(null);

    const resposta = await requisicao(perguntaMock._id!.toString(), { texto: "Sim!" });

    expect(resposta.status).toBe(404);
  });

  it("sucesso: responde no Mercado Livre e marca como respondida", async () => {
    buscarPerguntaPorId.mockResolvedValue(perguntaMock);

    const resposta = await requisicao(perguntaMock._id!.toString(), { texto: "Sim, temos!" });
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo).toEqual({ ok: true, resolvido: true });
    expect(responderPerguntaMercadoLivre).toHaveBeenCalledWith("123456789", "Sim, temos!");
    expect(marcarPerguntaRespondida).toHaveBeenCalledWith("123456789");
  });

  it("falha na API do Mercado Livre: 502 e mantém pendente (FR-015)", async () => {
    buscarPerguntaPorId.mockResolvedValue(perguntaMock);
    responderPerguntaMercadoLivre.mockRejectedValue(new Error("HTTP 500"));

    const resposta = await requisicao(perguntaMock._id!.toString(), { texto: "Sim!" });

    expect(resposta.status).toBe(502);
    expect(marcarPerguntaRespondida).not.toHaveBeenCalled();
  });
});
