import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";

const { buscarProdutoPorId, atualizarProduto, removerProduto, moverProdutoDeCategoria } = vi.hoisted(
  () => ({
    buscarProdutoPorId: vi.fn(),
    atualizarProduto: vi.fn(),
    removerProduto: vi.fn(),
    moverProdutoDeCategoria: vi.fn(),
  })
);
const { slugCategoriaValido } = vi.hoisted(() => ({ slugCategoriaValido: vi.fn() }));
const { gerarSlug } = vi.hoisted(() => ({ gerarSlug: vi.fn() }));
const { removerFotoProduto } = vi.hoisted(() => ({ removerFotoProduto: vi.fn() }));
const { validarProduto } = vi.hoisted(() => ({ validarProduto: vi.fn().mockReturnValue({}) }));
const { sincronizarAnuncioProduto } = vi.hoisted(() => ({
  sincronizarAnuncioProduto: vi.fn().mockResolvedValue(undefined),
}));
const { despublicarAnuncio } = vi.hoisted(() => ({ despublicarAnuncio: vi.fn() }));

vi.mock("@/lib/produtos/repository", () => ({
  buscarProdutoPorId,
  atualizarProduto,
  removerProduto,
  moverProdutoDeCategoria,
}));
vi.mock("@/lib/categorias/repository", () => ({ slugCategoriaValido }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/produtos/slug", () => ({ gerarSlug }));
vi.mock("@/lib/storage/blob", () => ({ removerFotoProduto }));
vi.mock("@/lib/produtos/validation", () => ({ validarProduto }));
vi.mock("@/lib/estoque/sincronizacao", () => ({ sincronizarAnuncioProduto }));
vi.mock("@/lib/estoque/canais/mercadoLivre/anuncios", () => ({ despublicarAnuncio }));

const { PATCH, DELETE } = await import("./route");

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function requisicao(body: unknown): Request {
  return new Request("http://localhost", { method: "PATCH", body: JSON.stringify(body) });
}

const produtoBase: Produto = {
  _id: new ObjectId(),
  nome: "Vaso Geométrico",
  slug: "vaso-geometrico",
  descricao: "...",
  preco: 5000,
  fotos: [],
  estoque: 8,
  categoria: "decoracao",
  integracoes: { mercadoLivreId: "MLB999" },
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

describe("PATCH /api/produtos/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buscarProdutoPorId.mockResolvedValue(produtoBase);
    atualizarProduto.mockResolvedValue(produtoBase);
  });

  it("dispara sincronizarAnuncioProduto quando há anúncio associado e o preço muda", async () => {
    await PATCH(requisicao({ preco: 6000 }), params(produtoBase._id!.toString()));

    expect(sincronizarAnuncioProduto).toHaveBeenCalledWith(produtoBase._id!.toString(), undefined, {
      sincronizarDescricao: false,
    });
  });

  it("dispara sincronizarAnuncioProduto quando há anúncio associado e o estoque muda", async () => {
    await PATCH(requisicao({ estoque: 3 }), params(produtoBase._id!.toString()));

    expect(sincronizarAnuncioProduto).toHaveBeenCalled();
  });

  it("não dispara quando não há anúncio associado ao produto", async () => {
    buscarProdutoPorId.mockResolvedValue({ ...produtoBase, integracoes: undefined });
    atualizarProduto.mockResolvedValue({ ...produtoBase, integracoes: undefined });

    await PATCH(requisicao({ preco: 6000 }), params(produtoBase._id!.toString()));

    expect(sincronizarAnuncioProduto).not.toHaveBeenCalled();
  });

  it("dispara sincronizarAnuncioProduto quando só precosCanais muda (EDI-108)", async () => {
    await PATCH(
      requisicao({ precosCanais: { mercadoLivre: 6490 } }),
      params(produtoBase._id!.toString())
    );

    expect(sincronizarAnuncioProduto).toHaveBeenCalled();
  });

  it("não dispara quando o campo alterado não é preço, estoque, precosCanais nem descrição", async () => {
    await PATCH(requisicao({ nome: "Novo nome" }), params(produtoBase._id!.toString()));

    expect(sincronizarAnuncioProduto).not.toHaveBeenCalled();
  });

  it("dispara com sincronizarDescricao quando a descrição muda", async () => {
    await PATCH(
      requisicao({ descricao: "Descrição nova" }),
      params(produtoBase._id!.toString())
    );

    expect(sincronizarAnuncioProduto).toHaveBeenCalledWith(produtoBase._id!.toString(), undefined, {
      sincronizarDescricao: true,
    });
  });

  it("dispara sem sincronizarDescricao quando só preço/estoque mudam", async () => {
    await PATCH(requisicao({ preco: 6000 }), params(produtoBase._id!.toString()));

    expect(sincronizarAnuncioProduto).toHaveBeenCalledWith(produtoBase._id!.toString(), undefined, {
      sincronizarDescricao: false,
    });
  });

  it("não dispara quando a descrição enviada é igual à atual", async () => {
    await PATCH(
      requisicao({ descricao: produtoBase.descricao }),
      params(produtoBase._id!.toString())
    );

    expect(sincronizarAnuncioProduto).not.toHaveBeenCalled();
  });

  it("persiste metaCatalogo sem disparar a sincronização do Mercado Livre (EDI-109)", async () => {
    const metaCatalogo = { publicar: true, titulo: "Vaso 🔥" };

    await PATCH(requisicao({ metaCatalogo }), params(produtoBase._id!.toString()));

    expect(atualizarProduto).toHaveBeenCalledWith(produtoBase._id!.toString(), { metaCatalogo });
    expect(sincronizarAnuncioProduto).not.toHaveBeenCalled();
  });

  describe("troca de categoria (EDI-123)", () => {
    it("move o produto para a categoria escolhida, sem gravar categoria solta no $set", async () => {
      slugCategoriaValido.mockResolvedValue(true);

      const resposta = await PATCH(requisicao({ categoria: "religioso" }), params(produtoBase._id!.toString()));

      expect(resposta.status).toBe(200);
      expect(moverProdutoDeCategoria).toHaveBeenCalledWith(produtoBase, "religioso", "vaso-geometrico");
      expect(atualizarProduto).toHaveBeenCalledWith(produtoBase._id!.toString(), {});
    });

    it("categoria vazia vai para Diversos", async () => {
      slugCategoriaValido.mockResolvedValue(true);

      await PATCH(requisicao({ categoria: "  " }), params(produtoBase._id!.toString()));

      expect(moverProdutoDeCategoria).toHaveBeenCalledWith(produtoBase, "diversos", "vaso-geometrico");
    });

    it("400 com categoria não cadastrada", async () => {
      slugCategoriaValido.mockResolvedValue(false);

      const resposta = await PATCH(requisicao({ categoria: "inventada" }), params(produtoBase._id!.toString()));

      expect(resposta.status).toBe(400);
      expect(await resposta.json()).toMatchObject({ campos: { categoria: expect.any(String) } });
      expect(moverProdutoDeCategoria).not.toHaveBeenCalled();
    });

    it("mesma categoria e mesmo nome: não move", async () => {
      slugCategoriaValido.mockResolvedValue(true);

      await PATCH(requisicao({ categoria: "decoracao", preco: 100 }), params(produtoBase._id!.toString()));

      expect(moverProdutoDeCategoria).not.toHaveBeenCalled();
    });

    it("mudar o nome gera novo slug e registra o endereço antigo via mover", async () => {
      gerarSlug.mockReturnValue("vaso-novo");

      await PATCH(requisicao({ nome: "Vaso Novo" }), params(produtoBase._id!.toString()));

      expect(moverProdutoDeCategoria).toHaveBeenCalledWith(produtoBase, "decoracao", "vaso-novo");
    });
  });
});

describe("DELETE /api/produtos/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("404 quando o produto não existe", async () => {
    buscarProdutoPorId.mockResolvedValue(null);

    const resposta = await DELETE(new Request("http://localhost"), params(produtoBase._id!.toString()));

    expect(resposta.status).toBe(404);
    expect(despublicarAnuncio).not.toHaveBeenCalled();
    expect(removerProduto).not.toHaveBeenCalled();
  });

  it("sem anúncio publicado: remove direto, sem chamar o Mercado Livre", async () => {
    buscarProdutoPorId.mockResolvedValue({ ...produtoBase, integracoes: undefined });

    const resposta = await DELETE(new Request("http://localhost"), params(produtoBase._id!.toString()));

    expect(resposta.status).toBe(204);
    expect(despublicarAnuncio).not.toHaveBeenCalled();
    expect(removerProduto).toHaveBeenCalledWith(produtoBase._id!.toString());
  });

  it("com anúncio publicado: despublica no Mercado Livre antes de remover", async () => {
    buscarProdutoPorId.mockResolvedValue(produtoBase);
    despublicarAnuncio.mockResolvedValue(undefined);

    const resposta = await DELETE(new Request("http://localhost"), params(produtoBase._id!.toString()));

    expect(resposta.status).toBe(204);
    expect(despublicarAnuncio).toHaveBeenCalledWith("MLB999");
    expect(removerProduto).toHaveBeenCalledWith(produtoBase._id!.toString());
  });

  it("422 e não remove quando a despublicação no Mercado Livre falha", async () => {
    buscarProdutoPorId.mockResolvedValue(produtoBase);
    despublicarAnuncio.mockRejectedValue(new Error("HTTP 500"));

    const resposta = await DELETE(new Request("http://localhost"), params(produtoBase._id!.toString()));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(422);
    expect(corpo.erro).toContain("HTTP 500");
    expect(removerProduto).not.toHaveBeenCalled();
  });
});
