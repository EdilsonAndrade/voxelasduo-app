import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const categorias = vi.hoisted(() => ({
  createIndex: vi.fn().mockResolvedValue("ok"),
  find: vi.fn(),
  findOne: vi.fn(),
  insertOne: vi.fn(),
  updateOne: vi.fn(),
  updateMany: vi.fn(),
  deleteOne: vi.fn(),
  bulkWrite: vi.fn(),
  findOneAndUpdate: vi.fn(),
}));

const produtos = vi.hoisted(() => ({
  find: vi.fn(),
  distinct: vi.fn(),
}));

const moverProdutoDeCategoria = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/mongodb", () => ({
  DB_NAME: "teste",
  default: vi.fn().mockResolvedValue({
    db: () => ({ collection: (nome: string) => (nome === "produtos" ? produtos : categorias) }),
  }),
}));

vi.mock("@/lib/produtos/repository", () => ({ moverProdutoDeCategoria }));

const {
  CategoriaEquivalenteError,
  CategoriaPadraoError,
  criarCategoria,
  listarCategoriasComProdutos,
  OrdemCategoriasInvalidaError,
  removerCategoria,
  renomearCategoria,
  reordenarCategorias,
  resolverRedirecionamentoCategoria,
} = await import("./repository");

function cursor(documentos: unknown[]) {
  const c = {
    sort: () => c,
    limit: () => c,
    next: async () => documentos[0] ?? null,
    toArray: async () => documentos,
  };
  return c;
}

describe("repositório de categorias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    categorias.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
  });

  it("cria no fim da lista com slug gerado do nome", async () => {
    categorias.findOne.mockResolvedValue(null);
    categorias.find.mockReturnValue(cursor([{ ordem: 5 }]));

    const categoria = await criarCategoria("  Natal Mágico ");

    expect(categoria).toMatchObject({ nome: "Natal Mágico", slug: "natal-magico", ordem: 6, aliases: [] });
    expect(categorias.updateMany).toHaveBeenCalledWith(
      { aliases: "natal-magico" },
      { $pull: { aliases: "natal-magico" } }
    );
  });

  it("recusa nome equivalente a uma categoria existente", async () => {
    categorias.findOne.mockResolvedValue({ nome: "Acessórios", slug: "acessorios" });

    await expect(criarCategoria("acessorios")).rejects.toBeInstanceOf(CategoriaEquivalenteError);
    expect(categorias.insertOne).not.toHaveBeenCalled();
  });

  it("renomear ignora a própria categoria na checagem e não altera o slug", async () => {
    const id = new ObjectId();
    categorias.findOne.mockResolvedValue(null);
    categorias.findOneAndUpdate.mockResolvedValue({ nome: "Religiosos" });

    await renomearCategoria(id.toString(), "Religiosos");

    expect(categorias.findOne).toHaveBeenCalledWith({ slug: "religiosos", _id: { $ne: id } });
    const [, update] = categorias.findOneAndUpdate.mock.calls[0];
    expect(update.$set).not.toHaveProperty("slug");
  });

  it("não remove Diversos", async () => {
    categorias.findOne.mockResolvedValue({ _id: new ObjectId(), slug: "diversos", padrao: true, aliases: [] });

    await expect(removerCategoria(new ObjectId().toString())).rejects.toBeInstanceOf(CategoriaPadraoError);
  });

  it("ao remover, move os produtos para Diversos e transfere slug e aliases", async () => {
    const id = new ObjectId();
    categorias.findOne.mockResolvedValue({ _id: id, slug: "natal", aliases: ["Natal"] });
    const itens = [{ _id: new ObjectId(), categoria: "natal", slug: "a" }, { _id: new ObjectId(), categoria: "natal", slug: "b" }];
    produtos.find.mockReturnValue(cursor(itens));

    const resultado = await removerCategoria(id.toString());

    expect(resultado).toEqual({ produtosMovidos: 2 });
    expect(moverProdutoDeCategoria).toHaveBeenCalledTimes(2);
    expect(moverProdutoDeCategoria).toHaveBeenCalledWith(itens[0], "diversos");
    expect(categorias.updateOne).toHaveBeenLastCalledWith(
      { slug: "diversos" },
      expect.objectContaining({ $addToSet: { aliases: { $each: ["natal", "Natal"] } } })
    );
    expect(categorias.deleteOne).toHaveBeenCalledWith({ _id: id });
  });

  it("recusa reordenação incompleta ou repetida", async () => {
    const a = new ObjectId();
    const b = new ObjectId();
    categorias.find.mockReturnValue(cursor([{ _id: a }, { _id: b }]));

    await expect(reordenarCategorias([a.toString()])).rejects.toBeInstanceOf(OrdemCategoriasInvalidaError);
    await expect(reordenarCategorias([a.toString(), a.toString()])).rejects.toBeInstanceOf(
      OrdemCategoriasInvalidaError
    );
    await reordenarCategorias([b.toString(), a.toString()]);
    expect(categorias.bulkWrite).toHaveBeenCalledTimes(1);
  });

  it("vitrine lista só categorias com produtos, na ordem cadastrada", async () => {
    categorias.find.mockReturnValue(
      cursor([
        { slug: "organizadores", nome: "Organizadores" },
        { slug: "religioso", nome: "Religioso" },
        { slug: "acessorios", nome: "Acessórios" },
      ])
    );
    produtos.distinct.mockResolvedValue(["acessorios", "organizadores"]);

    expect(await listarCategoriasComProdutos()).toEqual([
      { slug: "organizadores", nome: "Organizadores" },
      { slug: "acessorios", nome: "Acessórios" },
    ]);
  });

  describe("resolverRedirecionamentoCategoria", () => {
    it("resolve por alias", async () => {
      categorias.findOne.mockResolvedValueOnce({ slug: "acessorios" });
      expect(await resolverRedirecionamentoCategoria("acessórios")).toBe("acessorios");
    });

    it("resolve variação equivalente sem alias", async () => {
      categorias.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ slug: "decoracao" });
      expect(await resolverRedirecionamentoCategoria("Decoração")).toBe("decoracao");
    });

    it("retorna null quando não há destino", async () => {
      categorias.findOne.mockResolvedValue(null);
      expect(await resolverRedirecionamentoCategoria("inexistente")).toBeNull();
    });
  });
});
