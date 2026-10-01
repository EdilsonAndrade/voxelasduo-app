import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";

const { aplicarAjusteEvento, restaurarAjusteEvento, buscarProdutoPorId } = vi.hoisted(() => ({
  aplicarAjusteEvento: vi.fn(),
  restaurarAjusteEvento: vi.fn(),
  buscarProdutoPorId: vi.fn(),
}));
const { sincronizarAnuncioProduto } = vi.hoisted(() => ({
  sincronizarAnuncioProduto: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/produtos/repository", () => ({
  aplicarAjusteEvento,
  restaurarAjusteEvento,
  buscarProdutoPorId,
}));
vi.mock("@/lib/estoque/sincronizacao", () => ({ sincronizarAnuncioProduto }));

const { POST, DELETE } = await import("./route");

const id = new ObjectId().toString();
const params = { params: Promise.resolve({ id }) };

function requisicao(body: unknown): Request {
  return new Request("http://localhost", { method: "POST", body: JSON.stringify(body) });
}

const produto: Produto = {
  _id: new ObjectId(id),
  nome: "Vaso",
  slug: "vaso",
  descricao: "...",
  preco: 14290,
  fotos: [],
  estoque: 3,
  categoria: "decoracao",
  integracoes: { mercadoLivreId: "MLB1" },
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/produtos/[id]/ajuste-evento", () => {
  it("grava o ajuste e sincroniza o Mercado Livre", async () => {
    aplicarAjusteEvento.mockResolvedValue(produto);
    const resposta = await POST(
      requisicao({ percentual: 30, preco: 14290, precosCanais: { mercadoLivre: 15990 } }),
      params
    );
    expect(resposta.status).toBe(200);
    expect(aplicarAjusteEvento).toHaveBeenCalledWith(id, {
      percentual: 30,
      preco: 14290,
      precosCanais: { mercadoLivre: 15990 },
    });
    expect(sincronizarAnuncioProduto).toHaveBeenCalledWith(id, undefined);
  });

  it("400 com percentual fora de 1–90 ou preço inválido", async () => {
    expect((await POST(requisicao({ percentual: 0, preco: 100 }), params)).status).toBe(400);
    expect((await POST(requisicao({ percentual: 95, preco: 100 }), params)).status).toBe(400);
    expect((await POST(requisicao({ percentual: 30 }), params)).status).toBe(400);
    expect((await POST(requisicao({ percentual: 30, preco: -5 }), params)).status).toBe(400);
    expect(
      (await POST(requisicao({ percentual: 30, preco: 100, precosCanais: { mercadoLivre: 0 } }), params)).status
    ).toBe(400);
    expect(aplicarAjusteEvento).not.toHaveBeenCalled();
  });

  it("409 quando já existe ajuste ativo; 404 quando o produto não existe", async () => {
    aplicarAjusteEvento.mockResolvedValue(null);
    buscarProdutoPorId.mockResolvedValueOnce(produto);
    expect((await POST(requisicao({ percentual: 30, preco: 100 }), params)).status).toBe(409);
    buscarProdutoPorId.mockResolvedValueOnce(null);
    expect((await POST(requisicao({ percentual: 30, preco: 100 }), params)).status).toBe(404);
    expect(sincronizarAnuncioProduto).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/produtos/[id]/ajuste-evento", () => {
  it("restaura e sincroniza o Mercado Livre", async () => {
    restaurarAjusteEvento.mockResolvedValue({ ...produto, preco: 10000 });
    const resposta = await DELETE(new Request("http://localhost", { method: "DELETE" }), params);
    expect(resposta.status).toBe(200);
    expect((await resposta.json()).produto.preco).toBe(10000);
    expect(sincronizarAnuncioProduto).toHaveBeenCalledWith(id, undefined);
  });

  it("409 sem ajuste ativo; 404 sem produto", async () => {
    restaurarAjusteEvento.mockResolvedValue(null);
    buscarProdutoPorId.mockResolvedValueOnce(produto);
    expect((await DELETE(new Request("http://localhost"), params)).status).toBe(409);
    buscarProdutoPorId.mockResolvedValueOnce(null);
    expect((await DELETE(new Request("http://localhost"), params)).status).toBe(404);
  });
});
