import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";

const { buscarProdutoPorId, atualizarProduto } = vi.hoisted(() => ({
  buscarProdutoPorId: vi.fn(),
  atualizarProduto: vi.fn(),
}));
const { criarAnuncio, despublicarAnuncio } = vi.hoisted(() => ({
  criarAnuncio: vi.fn(),
  despublicarAnuncio: vi.fn(),
}));
const { registrarFalhaPublicacao } = vi.hoisted(() => ({
  registrarFalhaPublicacao: vi.fn(),
}));

vi.mock("@/lib/produtos/repository", () => ({ buscarProdutoPorId, atualizarProduto }));
vi.mock("@/lib/estoque/canais/mercadoLivre/anuncios", () => ({ criarAnuncio, despublicarAnuncio }));
vi.mock("@/lib/estoque/publicacoes", () => ({ registrarFalhaPublicacao }));

const { POST, DELETE } = await import("./route");

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const produtoBase: Produto = {
  _id: new ObjectId(),
  nome: "Vaso Geométrico",
  slug: "vaso-geometrico",
  descricao: "...",
  preco: 5000,
  fotos: ["https://exemplo.com/foto.jpg"],
  estoque: 8,
  categoria: "decoracao",
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

describe("POST /api/produtos/[id]/mercado-livre/publicar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("404 quando o produto não existe", async () => {
    buscarProdutoPorId.mockResolvedValue(null);

    const resposta = await POST(new Request("http://localhost"), params(produtoBase._id!.toString()));

    expect(resposta.status).toBe(404);
    expect(criarAnuncio).not.toHaveBeenCalled();
  });

  it("409 quando o produto já tem integracoes.mercadoLivreId (evita duplicidade, FR-004)", async () => {
    buscarProdutoPorId.mockResolvedValue({
      ...produtoBase,
      integracoes: { mercadoLivreId: "MLB999" },
    });

    const resposta = await POST(new Request("http://localhost"), params(produtoBase._id!.toString()));

    expect(resposta.status).toBe(409);
    expect(criarAnuncio).not.toHaveBeenCalled();
  });

  it("201 com o mercadoLivreId criado, gravando em integracoes", async () => {
    buscarProdutoPorId.mockResolvedValue(produtoBase);
    criarAnuncio.mockResolvedValue("MLB999");

    const resposta = await POST(new Request("http://localhost"), params(produtoBase._id!.toString()));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(201);
    expect(corpo).toEqual({ mercadoLivreId: "MLB999" });
    expect(atualizarProduto).toHaveBeenCalledWith(produtoBase._id!.toString(), {
      integracoes: { mercadoLivreId: "MLB999" },
    });
    expect(registrarFalhaPublicacao).not.toHaveBeenCalled();
  });

  it("422 e registra falha quando a criação do anúncio lança erro", async () => {
    buscarProdutoPorId.mockResolvedValue(produtoBase);
    criarAnuncio.mockRejectedValue(new Error("categoria sem mapeamento"));

    const resposta = await POST(new Request("http://localhost"), params(produtoBase._id!.toString()));

    expect(resposta.status).toBe(422);
    expect(registrarFalhaPublicacao).toHaveBeenCalledWith(
      produtoBase._id,
      "mercado_livre",
      "criar",
      "categoria sem mapeamento"
    );
    expect(atualizarProduto).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/produtos/[id]/mercado-livre/publicar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("404 quando o produto não existe", async () => {
    buscarProdutoPorId.mockResolvedValue(null);

    const resposta = await DELETE(
      new Request("http://localhost"),
      params(produtoBase._id!.toString())
    );

    expect(resposta.status).toBe(404);
    expect(despublicarAnuncio).not.toHaveBeenCalled();
  });

  it("409 quando o produto não está publicado no Mercado Livre", async () => {
    buscarProdutoPorId.mockResolvedValue({ ...produtoBase, integracoes: undefined });

    const resposta = await DELETE(
      new Request("http://localhost"),
      params(produtoBase._id!.toString())
    );

    expect(resposta.status).toBe(409);
    expect(despublicarAnuncio).not.toHaveBeenCalled();
  });

  it("200 despublica e limpa integracoes.mercadoLivreId", async () => {
    buscarProdutoPorId.mockResolvedValue({
      ...produtoBase,
      integracoes: { mercadoLivreId: "MLB999", shopeeItemId: "SHP1" },
    });
    despublicarAnuncio.mockResolvedValue(undefined);

    const resposta = await DELETE(
      new Request("http://localhost"),
      params(produtoBase._id!.toString())
    );
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo).toEqual({ despublicado: true });
    expect(despublicarAnuncio).toHaveBeenCalledWith("MLB999");
    expect(atualizarProduto).toHaveBeenCalledWith(produtoBase._id!.toString(), {
      integracoes: { mercadoLivreId: undefined, shopeeItemId: "SHP1" },
    });
  });

  it("422 quando o Mercado Livre falha ao fechar o anúncio", async () => {
    buscarProdutoPorId.mockResolvedValue({
      ...produtoBase,
      integracoes: { mercadoLivreId: "MLB999" },
    });
    despublicarAnuncio.mockRejectedValue(new Error("HTTP 500"));

    const resposta = await DELETE(
      new Request("http://localhost"),
      params(produtoBase._id!.toString())
    );

    expect(resposta.status).toBe(422);
    expect(atualizarProduto).not.toHaveBeenCalled();
  });
});
