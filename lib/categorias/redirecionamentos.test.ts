import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const colecao = vi.hoisted(() => ({
  createIndex: vi.fn().mockResolvedValue("ok"),
  updateOne: vi.fn(),
  findOne: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/db/mongodb", () => ({
  DB_NAME: "teste",
  default: vi.fn().mockResolvedValue({ db: () => ({ collection: () => colecao }) }),
}));

const {
  buscarRedirecionamentoProduto,
  registrarRedirecionamentoProduto,
  removerRedirecionamentosDoProduto,
} = await import("./redirecionamentos");

describe("redirecionamentos de produto", () => {
  beforeEach(() => vi.clearAllMocks());

  it("não grava quando o endereço não mudou", async () => {
    await registrarRedirecionamentoProduto(
      { categoria: "acessorios", slug: "terco" },
      { categoria: "acessorios", slug: "terco" },
      new ObjectId()
    );
    expect(colecao.updateOne).not.toHaveBeenCalled();
  });

  it("grava o endereço antigo apontando para o produto (upsert)", async () => {
    const produtoId = new ObjectId();
    await registrarRedirecionamentoProduto(
      { categoria: "acessórios", slug: "terco" },
      { categoria: "religioso", slug: "terco" },
      produtoId
    );
    expect(colecao.updateOne).toHaveBeenCalledWith(
      { categoria: "acessórios", slug: "terco" },
      { $set: expect.objectContaining({ produtoId }) },
      { upsert: true }
    );
  });

  it("A→B→C: os endereços A e B apontam para o produto, que resolve na URL atual em um salto", async () => {
    const produtoId = new ObjectId();
    colecao.findOne.mockResolvedValue({ categoria: "a", slug: "x", produtoId });
    expect(await buscarRedirecionamentoProduto("a", "x")).toEqual(produtoId);
  });

  it("retorna null sem redirecionamento", async () => {
    colecao.findOne.mockResolvedValue(null);
    expect(await buscarRedirecionamentoProduto("nada", "x")).toBeNull();
  });

  it("remove os redirecionamentos de um produto excluído", async () => {
    const produtoId = new ObjectId();
    await removerRedirecionamentosDoProduto(produtoId);
    expect(colecao.deleteMany).toHaveBeenCalledWith({ produtoId });
  });
});
