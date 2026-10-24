import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  listarPlanos: vi.fn(),
  criarPlano: vi.fn(),
  mesclarPlano: vi.fn(),
  buscarPlano: vi.fn(),
  atualizarPlano: vi.fn(),
  vincularProduto: vi.fn(),
  excluirPlano: vi.fn(),
}));
const produtos = vi.hoisted(() => ({ buscarProdutoPorId: vi.fn() }));

vi.mock("@/lib/producao/planosImpressaoRepository", () => repo);
vi.mock("@/lib/produtos/repository", () => produtos);

const colecao = await import("./route");
const item = await import("./[id]/route");

function req(metodo: string, corpo?: unknown): Request {
  return new Request("http://localhost", { method: metodo, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const itens = [{ nome: "base", minutos: 222 }];

describe("/api/admin/tempo-impressao", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    produtos.buscarProdutoPorId.mockResolvedValue({ nome: "Calendário" });
  });

  it("GET lista os planos", async () => {
    repo.listarPlanos.mockResolvedValue([{ id: "a1" }]);
    const resposta = await colecao.GET();
    expect(await resposta.json()).toEqual({ planos: [{ id: "a1" }] });
  });

  it("POST 201 cria o plano do produto", async () => {
    repo.criarPlano.mockResolvedValue({ produtoId: "p1" });
    const resposta = await colecao.POST(req("POST", { produtoId: "p1", itens }));
    expect(resposta.status).toBe(201);
    expect(repo.criarPlano).toHaveBeenCalledWith({ produtoId: "p1" }, [
      expect.objectContaining({ nome: "base", minutos: 222 }),
    ]);
  });

  it("POST 201 cria item avulso só com nome, sem consultar o catálogo", async () => {
    repo.criarPlano.mockResolvedValue({ nome: "Boneco de neve" });
    const resposta = await colecao.POST(req("POST", { nome: " Boneco de neve ", itens }));
    expect(resposta.status).toBe(201);
    expect(repo.criarPlano).toHaveBeenCalledWith({ nome: "Boneco de neve" }, expect.any(Array));
    expect(produtos.buscarProdutoPorId).not.toHaveBeenCalled();
  });

  it("POST 400 sem produto e sem nome; mesclar exige produto", async () => {
    expect((await colecao.POST(req("POST", { itens }))).status).toBe(400);
    expect((await colecao.POST(req("POST", { nome: "x", itens, modo: "mesclar" }))).status).toBe(400);
  });

  it("POST 409 quando o produto já está no menu", async () => {
    repo.criarPlano.mockResolvedValue(null);
    const resposta = await colecao.POST(req("POST", { produtoId: "p1", itens }));
    expect(resposta.status).toBe(409);
  });

  it("POST 404 com produto inexistente", async () => {
    produtos.buscarProdutoPorId.mockResolvedValue(null);
    const resposta = await colecao.POST(req("POST", { produtoId: "p1", itens }));
    expect(resposta.status).toBe(404);
    expect(repo.criarPlano).not.toHaveBeenCalled();
  });

  it("POST 400 com itens ou modo inválidos", async () => {
    expect((await colecao.POST(req("POST", { produtoId: "p1", itens: [] }))).status).toBe(400);
    expect((await colecao.POST(req("POST", { produtoId: "p1", itens, modo: "x" }))).status).toBe(400);
  });

  it("POST mesclar devolve 200 ao mesclar e 201 ao criar", async () => {
    repo.mesclarPlano.mockResolvedValueOnce({ plano: {}, criado: false }).mockResolvedValueOnce({ plano: {}, criado: true });
    expect((await colecao.POST(req("POST", { produtoId: "p1", itens, modo: "mesclar" }))).status).toBe(200);
    expect((await colecao.POST(req("POST", { produtoId: "p1", itens, modo: "mesclar" }))).status).toBe(201);
  });

  it("PUT troca itens e o nome só do item avulso", async () => {
    repo.buscarPlano.mockResolvedValueOnce({ nome: "antigo" }).mockResolvedValueOnce({ produtoId: "p1" });
    repo.atualizarPlano.mockResolvedValue({});
    expect((await item.PUT(req("PUT", { itens, nome: "novo" }), params("a1"))).status).toBe(200);
    expect(repo.atualizarPlano).toHaveBeenLastCalledWith("a1", expect.objectContaining({ nome: "novo" }));
    expect((await item.PUT(req("PUT", { itens, nome: "novo" }), params("a2"))).status).toBe(200);
    expect(repo.atualizarPlano).toHaveBeenLastCalledWith("a2", { itens: expect.any(Array) });
  });

  it("PUT 404 sem plano; 400 inválido", async () => {
    repo.buscarPlano.mockResolvedValue(null);
    expect((await item.PUT(req("PUT", { itens }), params("a1"))).status).toBe(404);
    expect((await item.PUT(req("PUT", { itens: [{ nome: "a", minutos: 0 }] }), params("a1"))).status).toBe(400);
  });

  it("PATCH liga o item ao produto criado; 409 se o produto já tem plano; 404 sem produto", async () => {
    repo.vincularProduto.mockResolvedValueOnce({ produtoId: "p1" }).mockResolvedValueOnce("ocupado");
    expect((await item.PATCH(req("PATCH", { produtoId: "p1" }), params("a1"))).status).toBe(200);
    expect((await item.PATCH(req("PATCH", { produtoId: "p1" }), params("a1"))).status).toBe(409);
    produtos.buscarProdutoPorId.mockResolvedValue(null);
    expect((await item.PATCH(req("PATCH", { produtoId: "p9" }), params("a1"))).status).toBe(404);
  });

  it("DELETE remove do menu; 404 sem plano", async () => {
    repo.excluirPlano.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await item.DELETE(req("DELETE"), params("a1"))).status).toBe(200);
    expect((await item.DELETE(req("DELETE"), params("a1"))).status).toBe(404);
  });
});
