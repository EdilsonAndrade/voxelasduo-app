import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pedido } from "@/lib/models/pedido";

const { abaterEstoqueAtomico } = vi.hoisted(() => ({ abaterEstoqueAtomico: vi.fn() }));
const { sincronizarEstoqueProduto } = vi.hoisted(() => ({
  sincronizarEstoqueProduto: vi.fn().mockResolvedValue(undefined),
}));
const { insertOne, createIndex } = vi.hoisted(() => ({
  insertOne: vi.fn().mockResolvedValue({ insertedId: "mock-id" }),
  createIndex: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/produtos/repository", () => ({ abaterEstoqueAtomico }));
vi.mock("./sincronizacao", () => ({ sincronizarEstoqueProduto }));
vi.mock("@/lib/db/mongodb", () => ({
  default: vi.fn().mockResolvedValue({
    db: () => ({ collection: () => ({ insertOne, createIndex }) }),
  }),
  DB_NAME: "voxelasduo",
}));

const { abaterEstoquePedido } = await import("./abatimento");

function criarPedido(itens: { produtoId: ObjectId; quantidade: number }[]): Pedido {
  return {
    _id: new ObjectId(),
    itens: itens.map((item) => ({ ...item, precoUnitario: 1000 })),
    cliente: {
      nome: "Maria",
      email: "maria@exemplo.com",
      endereco: {
        logradouro: "Rua A",
        numero: "1",
        bairro: "Centro",
        cidade: "SP",
        estado: "SP",
        cep: "00000-000",
      },
    },
    status: "pago",
    canalOrigem: "site",
    valorTotal: 1000,
    pagamento: { tentativas: [] },
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  };
}

describe("abaterEstoquePedido", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sincronizarEstoqueProduto.mockResolvedValue(undefined);
  });

  it("abate com sucesso e dispara a sincronização do produto", async () => {
    const produtoId = new ObjectId();
    abaterEstoqueAtomico.mockResolvedValue({ sucesso: true, produto: { _id: produtoId } });
    const pedido = criarPedido([{ produtoId, quantidade: 2 }]);

    await abaterEstoquePedido(pedido);

    expect(abaterEstoqueAtomico).toHaveBeenCalledWith(produtoId.toString(), 2);
    expect(sincronizarEstoqueProduto).toHaveBeenCalledWith(produtoId.toString(), pedido._id);
    expect(insertOne).not.toHaveBeenCalled();
  });

  it("estoque insuficiente: registra inconsistência e não sincroniza, sem lançar exceção", async () => {
    const produtoId = new ObjectId();
    abaterEstoqueAtomico.mockResolvedValue({ sucesso: false, motivoFalha: "estoque_insuficiente" });
    const pedido = criarPedido([{ produtoId, quantidade: 5 }]);

    await expect(abaterEstoquePedido(pedido)).resolves.toBeUndefined();

    expect(sincronizarEstoqueProduto).not.toHaveBeenCalled();
    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ produtoId, motivo: "estoque_insuficiente" })
    );
  });

  it("produto removido: registra inconsistência com o motivo correto", async () => {
    const produtoId = new ObjectId();
    abaterEstoqueAtomico.mockResolvedValue({ sucesso: false, motivoFalha: "produto_removido" });
    const pedido = criarPedido([{ produtoId, quantidade: 1 }]);

    await abaterEstoquePedido(pedido);

    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ produtoId, motivo: "produto_removido" })
    );
  });

  it("processa os demais itens mesmo se um item falhar", async () => {
    const produtoOk = new ObjectId();
    const produtoFalha = new ObjectId();
    abaterEstoqueAtomico.mockImplementation(async (id: string) =>
      id === produtoFalha.toString()
        ? { sucesso: false, motivoFalha: "estoque_insuficiente" }
        : { sucesso: true, produto: { _id: produtoOk } }
    );
    const pedido = criarPedido([
      { produtoId: produtoFalha, quantidade: 3 },
      { produtoId: produtoOk, quantidade: 1 },
    ]);

    await abaterEstoquePedido(pedido);

    expect(sincronizarEstoqueProduto).toHaveBeenCalledWith(produtoOk.toString(), pedido._id);
    expect(insertOne).toHaveBeenCalledTimes(1);
  });
});
