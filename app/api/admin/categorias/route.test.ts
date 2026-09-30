import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => {
  class CategoriaEquivalenteError extends Error {}
  class CategoriaPadraoError extends Error {}
  class OrdemCategoriasInvalidaError extends Error {}
  return {
    CategoriaEquivalenteError,
    CategoriaPadraoError,
    OrdemCategoriasInvalidaError,
    criarCategoria: vi.fn(),
    listarCategoriasAdmin: vi.fn(),
    paraCategoriaAdmin: vi.fn((c: { nome: string }) => ({ nome: c.nome })),
    renomearCategoria: vi.fn(),
    removerCategoria: vi.fn(),
    reordenarCategorias: vi.fn(),
  };
});

vi.mock("@/lib/categorias/repository", () => repo);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const colecao = await import("./route");
const item = await import("./[id]/route");
const ordem = await import("./ordem/route");

function req(metodo: string, corpo?: unknown): Request {
  return new Request("http://localhost", { method: metodo, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("/api/admin/categorias", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST 201 cria a categoria", async () => {
    repo.criarCategoria.mockResolvedValue({ nome: "Natal" });
    const resposta = await colecao.POST(req("POST", { nome: "Natal" }));
    expect(resposta.status).toBe(201);
    expect(repo.criarCategoria).toHaveBeenCalledWith("Natal");
  });

  it("POST 400 com nome vazio", async () => {
    const resposta = await colecao.POST(req("POST", { nome: "  " }));
    expect(resposta.status).toBe(400);
    expect(repo.criarCategoria).not.toHaveBeenCalled();
  });

  it("POST 409 com nome equivalente", async () => {
    repo.criarCategoria.mockRejectedValue(new repo.CategoriaEquivalenteError("Já existe"));
    const resposta = await colecao.POST(req("POST", { nome: "acessorios" }));
    expect(resposta.status).toBe(409);
  });

  it("PATCH 404 quando não existe", async () => {
    repo.renomearCategoria.mockResolvedValue(null);
    const resposta = await item.PATCH(req("PATCH", { nome: "X" }), params(new ObjectId().toString()));
    expect(resposta.status).toBe(404);
  });

  it("PATCH 409 com nome equivalente a outra", async () => {
    repo.renomearCategoria.mockRejectedValue(new repo.CategoriaEquivalenteError("Já existe"));
    const resposta = await item.PATCH(req("PATCH", { nome: "Presentes" }), params(new ObjectId().toString()));
    expect(resposta.status).toBe(409);
  });

  it("DELETE 200 informa quantos produtos foram movidos", async () => {
    repo.removerCategoria.mockResolvedValue({ produtosMovidos: 3 });
    const resposta = await item.DELETE(req("DELETE"), params(new ObjectId().toString()));
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ produtosMovidos: 3 });
  });

  it("DELETE 403 para Diversos", async () => {
    repo.removerCategoria.mockRejectedValue(new repo.CategoriaPadraoError("não"));
    const resposta = await item.DELETE(req("DELETE"), params(new ObjectId().toString()));
    expect(resposta.status).toBe(403);
  });

  it("PUT ordem 400 com corpo inválido e com lista incompleta; 204 quando ok", async () => {
    expect((await ordem.PUT(req("PUT", { ids: "x" }))).status).toBe(400);

    repo.reordenarCategorias.mockRejectedValueOnce(new repo.OrdemCategoriasInvalidaError("incompleta"));
    expect((await ordem.PUT(req("PUT", { ids: ["a"] }))).status).toBe(400);

    repo.reordenarCategorias.mockResolvedValueOnce(undefined);
    expect((await ordem.PUT(req("PUT", { ids: ["a", "b"] }))).status).toBe(204);
  });
});
