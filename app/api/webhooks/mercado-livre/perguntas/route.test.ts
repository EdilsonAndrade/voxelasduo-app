import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";

const { buscarPerguntaMercadoLivre } = vi.hoisted(() => ({
  buscarPerguntaMercadoLivre: vi.fn(),
}));
const { buscarProdutoPorMercadoLivreId } = vi.hoisted(() => ({
  buscarProdutoPorMercadoLivreId: vi.fn(),
}));
const { upsertPerguntaPendente } = vi.hoisted(() => ({ upsertPerguntaPendente: vi.fn() }));

vi.mock("@/lib/estoque/canais/mercadoLivre/perguntas", () => ({ buscarPerguntaMercadoLivre }));
vi.mock("@/lib/produtos/repository", () => ({ buscarProdutoPorMercadoLivreId }));
vi.mock("@/lib/atendimento/repository", () => ({ upsertPerguntaPendente }));

const { POST } = await import("./route");

function requisicao(body: unknown): Request {
  return new Request("http://localhost/api/webhooks/mercado-livre/perguntas", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const notificacaoBase = { resource: "/questions/123456789", application_id: "app-123" };

const produtoMock: Produto = {
  _id: new ObjectId(),
  nome: "Vaso",
  slug: "vaso",
  descricao: "...",
  preco: 5000,
  fotos: [],
  estoque: 10,
  categoria: "decoracao",
  integracoes: { mercadoLivreId: "MLB123", mercadoLivrePermalink: "https://produto.mercadolivre.com.br/MLB-123" },
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

describe("POST /api/webhooks/mercado-livre/perguntas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCADOLIVRE_CLIENT_ID = "app-123";
  });

  it("application_id inválido: não processa", async () => {
    const resposta = await POST(requisicao({ ...notificacaoBase, application_id: "outro-app" }));

    expect(resposta.status).toBe(200);
    expect(buscarPerguntaMercadoLivre).not.toHaveBeenCalled();
  });

  it("pergunta nova: persiste como pendente com o link do anúncio", async () => {
    buscarPerguntaMercadoLivre.mockResolvedValue({
      perguntaId: "123456789",
      itemId: "MLB123",
      texto: "Tem em azul?",
      respondida: false,
    });
    buscarProdutoPorMercadoLivreId.mockResolvedValue(produtoMock);

    const resposta = await POST(requisicao(notificacaoBase));

    expect(resposta.status).toBe(200);
    expect(upsertPerguntaPendente).toHaveBeenCalledWith({
      perguntaId: "123456789",
      itemId: "MLB123",
      produtoId: produtoMock._id,
      texto: "Tem em azul?",
      status: "pendente",
      linkOrigem: "https://produto.mercadolivre.com.br/MLB-123",
    });
  });

  it("pergunta já respondida (ex.: reenvio após resposta): persiste como respondida", async () => {
    buscarPerguntaMercadoLivre.mockResolvedValue({
      perguntaId: "123456789",
      itemId: "MLB123",
      texto: "Tem em azul?",
      respondida: true,
    });
    buscarProdutoPorMercadoLivreId.mockResolvedValue(produtoMock);

    await POST(requisicao(notificacaoBase));

    expect(upsertPerguntaPendente).toHaveBeenCalledWith(
      expect.objectContaining({ status: "respondida" })
    );
  });

  it("sem produto correspondente no catálogo: usa o link de fallback", async () => {
    buscarPerguntaMercadoLivre.mockResolvedValue({
      perguntaId: "123456789",
      itemId: "MLB-desconhecido",
      texto: "Tem em azul?",
      respondida: false,
    });
    buscarProdutoPorMercadoLivreId.mockResolvedValue(null);

    await POST(requisicao(notificacaoBase));

    expect(upsertPerguntaPendente).toHaveBeenCalledWith(
      expect.objectContaining({ linkOrigem: "https://www.mercadolivre.com.br/perguntas/lista" })
    );
  });

  it("falha transitória ao consultar a pergunta: responde 500 para o Mercado Livre reenviar", async () => {
    buscarPerguntaMercadoLivre.mockRejectedValue(new Error("HTTP 500"));

    const resposta = await POST(requisicao(notificacaoBase));

    expect(resposta.status).toBe(500);
    expect(upsertPerguntaPendente).not.toHaveBeenCalled();
  });
});
