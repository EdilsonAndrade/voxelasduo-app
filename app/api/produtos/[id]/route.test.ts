import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";

const { buscarProdutoPorId, atualizarProduto, removerProduto, slugDisponivel } = vi.hoisted(
  () => ({
    buscarProdutoPorId: vi.fn(),
    atualizarProduto: vi.fn(),
    removerProduto: vi.fn(),
    slugDisponivel: vi.fn(),
  })
);
const { gerarSlug } = vi.hoisted(() => ({ gerarSlug: vi.fn() }));
const { removerFotoProduto } = vi.hoisted(() => ({ removerFotoProduto: vi.fn() }));
const { validarProduto } = vi.hoisted(() => ({ validarProduto: vi.fn().mockReturnValue({}) }));
const { sincronizarAnuncioProduto } = vi.hoisted(() => ({
  sincronizarAnuncioProduto: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/produtos/repository", () => ({
  buscarProdutoPorId,
  atualizarProduto,
  removerProduto,
  slugDisponivel,
}));
vi.mock("@/lib/produtos/slug", () => ({ gerarSlug }));
vi.mock("@/lib/storage/blob", () => ({ removerFotoProduto }));
vi.mock("@/lib/produtos/validation", () => ({ validarProduto }));
vi.mock("@/lib/estoque/sincronizacao", () => ({ sincronizarAnuncioProduto }));

const { PATCH } = await import("./route");

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

    expect(sincronizarAnuncioProduto).toHaveBeenCalledWith(produtoBase._id!.toString(), undefined);
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

  it("não dispara quando o campo alterado não é preço nem estoque", async () => {
    await PATCH(requisicao({ nome: "Novo nome" }), params(produtoBase._id!.toString()));

    expect(sincronizarAnuncioProduto).not.toHaveBeenCalled();
  });
});
