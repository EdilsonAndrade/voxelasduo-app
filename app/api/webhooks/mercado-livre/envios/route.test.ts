import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pedido } from "@/lib/models/pedido";

const { buscarEnvioMercadoLivre } = vi.hoisted(() => ({ buscarEnvioMercadoLivre: vi.fn() }));
const { buscarPedidoPorOrigemExterna } = vi.hoisted(() => ({
  buscarPedidoPorOrigemExterna: vi.fn(),
}));
const { atualizarRastreioPedido, atualizarStatusPedido, atualizarAguardandoLiberacaoPedido } =
  vi.hoisted(() => ({
    atualizarRastreioPedido: vi.fn(),
    atualizarStatusPedido: vi.fn(),
    atualizarAguardandoLiberacaoPedido: vi.fn(),
  }));

vi.mock("@/lib/estoque/canais/mercadoLivre/envios", () => ({ buscarEnvioMercadoLivre }));
vi.mock("@/lib/pedidos/repository", () => ({ buscarPedidoPorOrigemExterna }));
vi.mock("@/lib/pedidos/atualizarStatus", () => ({
  atualizarRastreioPedido,
  atualizarStatusPedido,
  atualizarAguardandoLiberacaoPedido,
}));

const { POST } = await import("./route");

function requisicao(body: unknown): Request {
  return new Request("http://localhost/api/webhooks/mercado-livre/envios", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const notificacaoBase = { resource: "/shipments/999", application_id: "app-123" };
const pedidoMock = { _id: new ObjectId() } as Pedido;

describe("POST /api/webhooks/mercado-livre/envios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCADOLIVRE_CLIENT_ID = "app-123";
  });

  it("application_id inválido: não processa", async () => {
    const resposta = await POST(requisicao({ ...notificacaoBase, application_id: "outro-app" }));

    expect(resposta.status).toBe(200);
    expect(buscarEnvioMercadoLivre).not.toHaveBeenCalled();
  });

  it("envio despachado: atualiza rastreio e status para enviado", async () => {
    buscarEnvioMercadoLivre.mockResolvedValue({
      shipmentId: "999",
      orderId: "12345",
      trackingNumber: "BR123456789",
      despachado: true,
      entregue: false,
    });
    buscarPedidoPorOrigemExterna.mockResolvedValue(pedidoMock);

    const resposta = await POST(requisicao(notificacaoBase));

    expect(resposta.status).toBe(200);
    expect(atualizarRastreioPedido).toHaveBeenCalledWith(pedidoMock._id!.toString(), {
      codigo: "BR123456789",
      transportadora: "Mercado Envios",
    });
    expect(atualizarStatusPedido).toHaveBeenCalledWith(pedidoMock._id!.toString(), "enviado");
  });

  it("envio entregue: atualiza status para entregue", async () => {
    buscarEnvioMercadoLivre.mockResolvedValue({
      shipmentId: "999",
      orderId: "12345",
      trackingNumber: "BR123456789",
      despachado: false,
      entregue: true,
    });
    buscarPedidoPorOrigemExterna.mockResolvedValue(pedidoMock);

    await POST(requisicao(notificacaoBase));

    expect(atualizarStatusPedido).toHaveBeenCalledWith(pedidoMock._id!.toString(), "entregue");
  });

  it("sem tracking_number: não sobrescreve o rastreio", async () => {
    buscarEnvioMercadoLivre.mockResolvedValue({
      shipmentId: "999",
      orderId: "12345",
      trackingNumber: undefined,
      despachado: false,
      entregue: false,
    });
    buscarPedidoPorOrigemExterna.mockResolvedValue(pedidoMock);

    await POST(requisicao(notificacaoBase));

    expect(atualizarRastreioPedido).not.toHaveBeenCalled();
    expect(atualizarStatusPedido).not.toHaveBeenCalled();
  });

  it("sem pedido correspondente: ignora sem erro (FR-009)", async () => {
    buscarEnvioMercadoLivre.mockResolvedValue({
      shipmentId: "999",
      orderId: "12345",
      trackingNumber: "BR123456789",
      despachado: true,
      entregue: false,
    });
    buscarPedidoPorOrigemExterna.mockResolvedValue(null);

    const resposta = await POST(requisicao(notificacaoBase));

    expect(resposta.status).toBe(200);
    expect(atualizarRastreioPedido).not.toHaveBeenCalled();
  });

  it("envio represado (buffered): registra o aviso de aguardando liberação, sem mexer no status (FR-004)", async () => {
    const dataLiberacao = new Date("2026-10-01T00:00:00.000-03:00");
    buscarEnvioMercadoLivre.mockResolvedValue({
      shipmentId: "999",
      orderId: "12345",
      trackingNumber: undefined,
      despachado: false,
      entregue: false,
      aguardandoLiberacaoAte: dataLiberacao,
    });
    buscarPedidoPorOrigemExterna.mockResolvedValue(pedidoMock);

    await POST(requisicao(notificacaoBase));

    expect(atualizarAguardandoLiberacaoPedido).toHaveBeenCalledWith(
      pedidoMock._id!.toString(),
      dataLiberacao
    );
    expect(atualizarStatusPedido).not.toHaveBeenCalled();
  });

  it("envio sai do estado represado: limpa o aviso de aguardando liberação", async () => {
    buscarEnvioMercadoLivre.mockResolvedValue({
      shipmentId: "999",
      orderId: "12345",
      trackingNumber: "BR123456789",
      despachado: true,
      entregue: false,
      aguardandoLiberacaoAte: undefined,
    });
    buscarPedidoPorOrigemExterna.mockResolvedValue(pedidoMock);

    await POST(requisicao(notificacaoBase));

    expect(atualizarAguardandoLiberacaoPedido).toHaveBeenCalledWith(pedidoMock._id!.toString(), null);
  });

  it("falha transitória ao consultar o envio: responde 500 para o Mercado Livre reenviar", async () => {
    buscarEnvioMercadoLivre.mockRejectedValue(new Error("HTTP 500"));

    const resposta = await POST(requisicao(notificacaoBase));

    expect(resposta.status).toBe(500);
    expect(buscarPedidoPorOrigemExterna).not.toHaveBeenCalled();
  });

  it("notificação após edição manual: aplica o dado mais recente do Mercado Livre normalmente (US2/FR-008)", async () => {
    buscarEnvioMercadoLivre.mockResolvedValue({
      shipmentId: "999",
      orderId: "12345",
      trackingNumber: "BR999888777",
      despachado: true,
      entregue: false,
    });
    buscarPedidoPorOrigemExterna.mockResolvedValue(pedidoMock);

    await POST(requisicao(notificacaoBase));

    expect(atualizarRastreioPedido).toHaveBeenCalledWith(pedidoMock._id!.toString(), {
      codigo: "BR999888777",
      transportadora: "Mercado Envios",
    });
  });
});
