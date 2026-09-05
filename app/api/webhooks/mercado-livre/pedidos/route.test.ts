import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";
import type { Pedido } from "@/lib/models/pedido";

const { buscarPedidoMercadoLivre } = vi.hoisted(() => ({
  buscarPedidoMercadoLivre: vi.fn(),
}));
const { buscarProdutoPorMercadoLivreId } = vi.hoisted(() => ({
  buscarProdutoPorMercadoLivreId: vi.fn(),
}));
const { upsertPedidoExterno } = vi.hoisted(() => ({ upsertPedidoExterno: vi.fn() }));
const { abaterEstoquePedido, registrarItemExternoSemProduto } = vi.hoisted(() => ({
  abaterEstoquePedido: vi.fn(),
  registrarItemExternoSemProduto: vi.fn(),
}));

vi.mock("@/lib/estoque/canais/mercadoLivre/pedidos", () => ({ buscarPedidoMercadoLivre }));
vi.mock("@/lib/produtos/repository", () => ({ buscarProdutoPorMercadoLivreId }));
vi.mock("@/lib/pedidos/externos", () => ({ upsertPedidoExterno }));
vi.mock("@/lib/estoque/abatimento", () => ({
  abaterEstoquePedido,
  registrarItemExternoSemProduto,
}));

const { POST } = await import("./route");

function requisicao(body: unknown): Request {
  return new Request("http://localhost/api/webhooks/mercado-livre/pedidos", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const notificacaoBase = { resource: "/orders/999", application_id: "app-123" };

const produtoMock: Produto = {
  _id: new ObjectId(),
  nome: "Vaso",
  slug: "vaso",
  descricao: "...",
  preco: 5000,
  fotos: [],
  estoque: 10,
  categoria: "decoracao",
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

describe("POST /api/webhooks/mercado-livre/pedidos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCADOLIVRE_CLIENT_ID = "app-123";
  });

  it("application_id inválido: não processa", async () => {
    const resposta = await POST(requisicao({ ...notificacaoBase, application_id: "outro-app" }));

    expect(resposta.status).toBe(200);
    expect(buscarPedidoMercadoLivre).not.toHaveBeenCalled();
  });

  it("notificação nova: abate estoque via abaterEstoquePedido", async () => {
    buscarPedidoMercadoLivre.mockResolvedValue({
      itens: [{ itemId: "MLB123", quantidade: 2 }],
    });
    buscarProdutoPorMercadoLivreId.mockResolvedValue(produtoMock);
    const pedidoCriado = { _id: new ObjectId(), canalOrigem: "mercado_livre" } as Pedido;
    upsertPedidoExterno.mockResolvedValue({ pedido: pedidoCriado, criado: true });

    const resposta = await POST(requisicao(notificacaoBase));

    expect(resposta.status).toBe(200);
    expect(upsertPedidoExterno).toHaveBeenCalledWith({
      canal: "mercado_livre",
      pedidoExternoId: "999",
      itens: [{ produtoId: produtoMock._id, quantidade: 2, precoUnitario: 5000 }],
    });
    expect(abaterEstoquePedido).toHaveBeenCalledWith(pedidoCriado);
  });

  it("reenvio da mesma notificação: não abate de novo", async () => {
    buscarPedidoMercadoLivre.mockResolvedValue({
      itens: [{ itemId: "MLB123", quantidade: 2 }],
    });
    buscarProdutoPorMercadoLivreId.mockResolvedValue(produtoMock);
    upsertPedidoExterno.mockResolvedValue({
      pedido: { _id: new ObjectId() } as Pedido,
      criado: false,
    });

    await POST(requisicao(notificacaoBase));

    expect(abaterEstoquePedido).not.toHaveBeenCalled();
  });

  it("item sem produto correspondente: registra inconsistência e segue sem travar", async () => {
    buscarPedidoMercadoLivre.mockResolvedValue({
      itens: [{ itemId: "MLB-desconhecido", quantidade: 1 }],
    });
    buscarProdutoPorMercadoLivreId.mockResolvedValue(null);

    const resposta = await POST(requisicao(notificacaoBase));

    expect(resposta.status).toBe(200);
    expect(registrarItemExternoSemProduto).toHaveBeenCalledWith(
      "mercado_livre",
      "999",
      "MLB-desconhecido",
      1
    );
    expect(upsertPedidoExterno).not.toHaveBeenCalled();
  });

  it("falha transitória ao consultar o pedido: responde 500 para o Mercado Livre reenviar", async () => {
    buscarPedidoMercadoLivre.mockRejectedValue(new Error("HTTP 500"));

    const resposta = await POST(requisicao(notificacaoBase));

    expect(resposta.status).toBe(500);
  });
});
