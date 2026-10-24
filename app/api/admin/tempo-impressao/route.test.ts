import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  listarPlanos: vi.fn(),
  criarPlano: vi.fn(),
  mesclarPlano: vi.fn(),
  substituirItens: vi.fn(),
  excluirPlano: vi.fn(),
}));
const produtos = vi.hoisted(() => ({ buscarProdutoPorId: vi.fn() }));

vi.mock("@/lib/producao/planosImpressaoRepository", () => repo);
vi.mock("@/lib/produtos/repository", () => produtos);

const colecao = await import("./route");
const item = await import("./[produtoId]/route");

function req(metodo: string, corpo?: unknown): Request {
  return new Request("http://localhost", { method: metodo, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
}

const params = (produtoId: string) => ({ params: Promise.resolve({ produtoId }) });
const itens = [{ nome: "base", minutos: 222 }];

describe("/api/admin/tempo-impressao", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    produtos.buscarProdutoPorId.mockResolvedValue({ nome: "Calendário" });
  });

  it("GET lista os planos", async () => {
    repo.listarPlanos.mockResolvedValue([{ produtoId: "p1" }]);
    const resposta = await colecao.GET();
    expect(await resposta.json()).toEqual({ planos: [{ produtoId: "p1" }] });
  });

  it("POST 201 cria o plano", async () => {
    repo.criarPlano.mockResolvedValue({ produtoId: "p1" });
    const resposta = await colecao.POST(req("POST", { produtoId: "p1", itens }));
    expect(resposta.status).toBe(201);
    expect(repo.criarPlano).toHaveBeenCalledWith("p1", [expect.objectContaining({ nome: "base", minutos: 222 })]);
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

  it("POST 400 com itens inválidos ou sem produto", async () => {
    expect((await colecao.POST(req("POST", { produtoId: "p1", itens: [] }))).status).toBe(400);
    expect((await colecao.POST(req("POST", { itens }))).status).toBe(400);
    expect((await colecao.POST(req("POST", { produtoId: "p1", itens, modo: "x" }))).status).toBe(400);
  });

  it("POST mesclar devolve 200 ao mesclar e 201 ao criar", async () => {
    repo.mesclarPlano.mockResolvedValueOnce({ plano: {}, criado: false }).mockResolvedValueOnce({ plano: {}, criado: true });
    expect((await colecao.POST(req("POST", { produtoId: "p1", itens, modo: "mesclar" }))).status).toBe(200);
    expect((await colecao.POST(req("POST", { produtoId: "p1", itens, modo: "mesclar" }))).status).toBe(201);
  });

  it("PUT substitui os itens; 404 sem plano; 400 inválido", async () => {
    repo.substituirItens.mockResolvedValueOnce({ produtoId: "p1" }).mockResolvedValueOnce(null);
    expect((await item.PUT(req("PUT", { itens }), params("p1"))).status).toBe(200);
    expect((await item.PUT(req("PUT", { itens }), params("p1"))).status).toBe(404);
    expect((await item.PUT(req("PUT", { itens: [{ nome: "a", minutos: 0 }] }), params("p1"))).status).toBe(400);
  });

  it("DELETE remove o produto do menu; 404 sem plano", async () => {
    repo.excluirPlano.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await item.DELETE(req("DELETE"), params("p1"))).status).toBe(200);
    expect((await item.DELETE(req("DELETE"), params("p1"))).status).toBe(404);
  });
});
