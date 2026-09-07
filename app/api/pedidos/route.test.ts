import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pedido } from "@/lib/models/pedido";
import type { Produto } from "@/lib/models/produto";

const { listarPedidos, buscarProdutosPorIds, criarPedido, auth } = vi.hoisted(() => ({
  listarPedidos: vi.fn(),
  buscarProdutosPorIds: vi.fn(),
  criarPedido: vi.fn(),
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/pedidos/repository", () => ({
  PEDIDOS_POR_PAGINA: 20,
  listarPedidos,
  buscarProdutosPorIds,
  criarPedido,
}));

// Evita importar o pacote `next-auth` de verdade neste teste unitário
// (Tarefa 10/EDI-84 — `auth()` de clienteConfig.ts é lido opcionalmente no POST).
vi.mock("@/lib/auth/clienteConfig", () => ({ auth }));

const { GET, POST } = await import("./route");

function pedido(overrides: Partial<Pedido> = {}): Pedido {
  const produtoId = new ObjectId();
  return {
    _id: new ObjectId(),
    itens: [{ produtoId, quantidade: 1, precoUnitario: 1000 }],
    cliente: { nome: "Ana", email: "ana@example.com", endereco: {} as Pedido["cliente"]["endereco"] },
    status: "pago",
    canalOrigem: "site",
    valorTotal: 1000,
    pagamento: { tentativas: [] },
    criadoEm: new Date("2026-09-06T10:00:00.000Z"),
    atualizadoEm: new Date("2026-09-06T10:00:00.000Z"),
    ...overrides,
  };
}

function payloadCheckoutValido(overrides: Partial<{ produtoId: string; idempotencia: string }> = {}) {
  return {
    idempotencia: overrides.idempotencia ?? "idem-1",
    cliente: {
      nome: "Ana",
      email: "ana@example.com",
      endereco: {
        logradouro: "Rua 1",
        numero: "10",
        bairro: "Centro",
        cidade: "São Paulo",
        estado: "SP",
        cep: "01001000",
      },
    },
    itens: [{ produtoId: overrides.produtoId ?? new ObjectId().toString(), quantidade: 1 }],
  };
}

describe("GET /api/pedidos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue(null);
    buscarProdutosPorIds.mockResolvedValue(new Map<string, Produto>());
  });

  it("lista pedidos de site e Mercado Livre juntos, sem erro quando vazio", async () => {
    listarPedidos.mockResolvedValue({ pedidos: [], total: 0 });

    const resposta = await GET(new Request("http://localhost/api/pedidos"));
    const corpo = await resposta.json();

    expect(corpo.pedidos).toEqual([]);
    expect(corpo.paginaAtual).toBe(1);
    expect(corpo.totalPaginas).toBe(1);
  });

  it("repassa filtros de canal e status válidos para o repository", async () => {
    listarPedidos.mockResolvedValue({ pedidos: [], total: 0 });

    await GET(new Request("http://localhost/api/pedidos?canal=mercado_livre&status=enviado&pagina=2"));

    expect(listarPedidos).toHaveBeenCalledWith({
      canal: "mercado_livre",
      status: "enviado",
      pagina: 2,
    });
  });

  it("ignora valores de canal/status fora do enum", async () => {
    listarPedidos.mockResolvedValue({ pedidos: [], total: 0 });

    await GET(new Request("http://localhost/api/pedidos?canal=xpto&status=xpto"));

    expect(listarPedidos).toHaveBeenCalledWith({
      canal: undefined,
      status: undefined,
      pagina: undefined,
    });
  });

  it("marca temItemSemCorrespondencia quando o produto do item não existe mais", async () => {
    const umPedido = pedido({ canalOrigem: "mercado_livre" });
    listarPedidos.mockResolvedValue({ pedidos: [umPedido], total: 1 });
    buscarProdutosPorIds.mockResolvedValue(new Map<string, Produto>());

    const resposta = await GET(new Request("http://localhost/api/pedidos"));
    const corpo = await resposta.json();

    expect(corpo.pedidos).toHaveLength(1);
    expect(corpo.pedidos[0].temItemSemCorrespondencia).toBe(true);
    expect(corpo.pedidos[0].canalOrigem).toBe("mercado_livre");
  });
});

describe("POST /api/pedidos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue(null);
  });

  it("cria o pedido sem clienteId quando não há sessão (guest checkout)", async () => {
    criarPedido.mockResolvedValue({ pedido: pedido(), duplicado: false, itensDetalhados: [] });

    await POST(
      new Request("http://localhost/api/pedidos", {
        method: "POST",
        body: JSON.stringify(payloadCheckoutValido()),
      })
    );

    expect(criarPedido).toHaveBeenCalledWith(
      expect.objectContaining({ clienteId: undefined })
    );
  });

  it("associa o clienteId ao pedido quando há sessão de cliente válida", async () => {
    const clienteId = new ObjectId();
    auth.mockResolvedValue({ user: { id: clienteId.toString() } });
    criarPedido.mockResolvedValue({ pedido: pedido(), duplicado: false, itensDetalhados: [] });

    await POST(
      new Request("http://localhost/api/pedidos", {
        method: "POST",
        body: JSON.stringify(payloadCheckoutValido()),
      })
    );

    expect(criarPedido).toHaveBeenCalledWith(
      expect.objectContaining({ clienteId: expect.any(ObjectId) })
    );
    const chamada = criarPedido.mock.calls[0][0];
    expect(chamada.clienteId.toString()).toBe(clienteId.toString());
  });
});
