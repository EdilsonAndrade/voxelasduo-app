import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const colecao = vi.hoisted(() => ({
  createIndex: vi.fn().mockResolvedValue("ok"),
  find: vi.fn(),
  insertOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  bulkWrite: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/lib/db/mongodb", () => ({
  DB_NAME: "teste",
  default: vi.fn().mockResolvedValue({ db: () => ({ collection: () => colecao }) }),
}));

const {
  atualizarSecao,
  criarSecao,
  OrdemInvalidaError,
  removerProdutoDeTodosCarrosseis,
  reordenarSecoes,
} = await import("./repository");

/** Cursor mínimo encadeável (`find().sort().limit().next()` / `.toArray()`). */
function cursor(documentos: unknown[]) {
  const c = {
    sort: () => c,
    limit: () => c,
    next: async () => documentos[0] ?? null,
    toArray: async () => documentos,
  };
  return c;
}

describe("repositório de seções da home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    colecao.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
  });

  it("cria a primeira seção com ordem 0 e carrossel com lista de produtos vazia", async () => {
    colecao.find.mockReturnValue(cursor([]));

    const secao = await criarSecao({ tipo: "carrossel", ativa: false, titulo: "Favoritos", limite: 12 });

    expect(secao).toMatchObject({ ordem: 0, produtoIds: [], tipo: "carrossel" });
  });

  it("cria nova seção no fim da home (maior ordem + 1)", async () => {
    colecao.find.mockReturnValue(cursor([{ ordem: 4 }]));

    const secao = await criarSecao({ tipo: "textoDestaque", ativa: false, titulo: "Frete grátis" });

    expect(secao.ordem).toBe(5);
    expect(secao).not.toHaveProperty("produtoIds");
  });

  it("ao editar, remove ($unset) os campos que ficaram vazios e nunca grava o tipo", async () => {
    colecao.findOneAndUpdate.mockResolvedValue({});
    const id = new ObjectId().toString();

    await atualizarSecao(id, {
      tipo: "bannerHero",
      ativa: true,
      imagemDesktop: "https://x/a.webp",
      alinhamentoHorizontal: "esquerda",
      alinhamentoVertical: "base",
    });

    const [, update] = colecao.findOneAndUpdate.mock.calls[0];
    expect(update.$set).not.toHaveProperty("tipo");
    expect(update.$set).toMatchObject({ ativa: true, imagemDesktop: "https://x/a.webp" });
    expect(Object.keys(update.$unset)).toEqual(
      expect.arrayContaining(["titulo", "subtitulo", "texto", "botao", "imagemMobile"])
    );
    expect(update.$unset).not.toHaveProperty("imagemDesktop");
  });

  it("id inválido na edição devolve null sem tocar no banco", async () => {
    expect(await atualizarSecao("nao-e-id", { tipo: "carrossel", ativa: false })).toBeNull();
    expect(colecao.findOneAndUpdate).not.toHaveBeenCalled();
  });

  describe("reordenarSecoes", () => {
    const a = new ObjectId();
    const b = new ObjectId();

    beforeEach(() => {
      colecao.find.mockReturnValue(cursor([{ _id: a }, { _id: b }]));
    });

    it("grava a posição de cada seção conforme a lista", async () => {
      await reordenarSecoes([b.toString(), a.toString()]);

      const operacoes = colecao.bulkWrite.mock.calls[0][0];
      expect(operacoes[0].updateOne.filter._id.toString()).toBe(b.toString());
      expect(operacoes[0].updateOne.update.$set.ordem).toBe(0);
      expect(operacoes[1].updateOne.update.$set.ordem).toBe(1);
    });

    it.each([
      ["faltando seção", () => [a.toString()]],
      ["repetida", () => [a.toString(), a.toString()]],
      ["id desconhecido", () => [a.toString(), new ObjectId().toString()]],
    ])("rejeita lista %s", async (_caso, ids) => {
      await expect(reordenarSecoes(ids())).rejects.toBeInstanceOf(OrdemInvalidaError);
      expect(colecao.bulkWrite).not.toHaveBeenCalled();
    });
  });

  it("remove o produto excluído de todos os carrosséis", async () => {
    const produtoId = new ObjectId();

    await removerProdutoDeTodosCarrosseis(produtoId);

    expect(colecao.updateMany).toHaveBeenCalledWith(
      { tipo: "carrossel", produtoIds: produtoId },
      { $pull: { produtoIds: produtoId } }
    );
  });
});
