import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pedido } from "@/lib/models/pedido";
import type { Produto } from "@/lib/models/produto";

const { buscarPedidoPorId, buscarProdutosPorIds } = vi.hoisted(() => ({
  buscarPedidoPorId: vi.fn(),
  buscarProdutosPorIds: vi.fn(),
}));
const { atualizarStatusPedido } = vi.hoisted(() => ({ atualizarStatusPedido: vi.fn() }));

vi.mock("@/lib/pedidos/repository", () => ({ buscarPedidoPorId, buscarProdutosPorIds }));
vi.mock("@/lib/pedidos/atualizarStatus", () => ({ atualizarStatusPedido }));

const { GET, PATCH } = await import("./route");

function requestPatch(status: unknown) {
  return new Request("http://localhost", {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/pedidos/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 404 quando o pedido não existe", async () => {
    buscarPedidoPorId.mockResolvedValue(null);

    const resposta = await GET(new Request("http://localhost"), params(new ObjectId().toString()));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(404);
    expect(corpo).toEqual({ erro: "Pedido não encontrado." });
  });

  it("retorna o detalhe com itens e pagamento", async () => {
    const produtoId = new ObjectId();
    const umPedido: Pedido = {
      _id: new ObjectId(),
      itens: [{ produtoId, quantidade: 2, precoUnitario: 500 }],
      cliente: {
        nome: "Ana",
        email: "ana@example.com",
        endereco: {
          logradouro: "Rua A",
          numero: "10",
          bairro: "Centro",
          cidade: "SP",
          estado: "SP",
          cep: "00000-000",
        },
      },
      status: "pago",
      canalOrigem: "mercado_livre",
      valorTotal: 1000,
      pagamento: { tentativas: [], status: "aprovado", metodo: "pix" },
      criadoEm: new Date("2026-09-06T10:00:00.000Z"),
      atualizadoEm: new Date("2026-09-06T10:00:00.000Z"),
    };
    buscarPedidoPorId.mockResolvedValue(umPedido);
    buscarProdutosPorIds.mockResolvedValue(
      new Map([[produtoId.toString(), { nome: "Vaso" } as Produto]])
    );

    const resposta = await GET(new Request("http://localhost"), params(umPedido._id!.toString()));
    const corpo = await resposta.json();

    expect(corpo.pedido.itens).toEqual([
      {
        produtoId: produtoId.toString(),
        nome: "Vaso",
        quantidade: 2,
        precoUnitario: 500,
        semCorrespondencia: false,
      },
    ]);
    expect(corpo.pedido.pagamento.metodo).toBe("pix");
  });
});

describe("PATCH /api/pedidos/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 400 quando o status é inválido", async () => {
    const resposta = await PATCH(requestPatch("xpto"), params(new ObjectId().toString()));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(400);
    expect(corpo).toEqual({ erro: "Status inválido." });
    expect(atualizarStatusPedido).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o pedido não existe", async () => {
    atualizarStatusPedido.mockResolvedValue(null);

    const resposta = await PATCH(requestPatch("enviado"), params(new ObjectId().toString()));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(404);
    expect(corpo).toEqual({ erro: "Pedido não encontrado." });
  });

  it("atualiza o status e retorna o pedido", async () => {
    const id = new ObjectId();
    const atualizadoEm = new Date("2026-09-06T12:05:00.000Z");
    atualizarStatusPedido.mockResolvedValue({ _id: id, status: "enviado", atualizadoEm });

    const resposta = await PATCH(requestPatch("enviado"), params(id.toString()));
    const corpo = await resposta.json();

    expect(atualizarStatusPedido).toHaveBeenCalledWith(id.toString(), "enviado");
    expect(corpo.pedido).toEqual({
      id: id.toString(),
      status: "enviado",
      atualizadoEm: atualizadoEm.toISOString(),
    });
  });
});
