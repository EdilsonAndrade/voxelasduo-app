import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => {
  class ErroKit extends Error {
    constructor(
      message: string,
      readonly status: number,
      readonly extra: Record<string, unknown> = {}
    ) {
      super(message);
    }
  }
  return {
    ErroKit,
    listarKits: vi.fn(),
    salvarKit: vi.fn(),
    buscarKitDetalhe: vi.fn(),
    excluirKit: vi.fn(),
    gerarProdutoDoKit: vi.fn(),
  };
});

vi.mock("@/lib/kits/repository", () => repo);

const colecao = await import("./route");
const item = await import("./[id]/route");
const produto = await import("./[id]/produto/route");

function req(metodo: string, corpo?: unknown): Request {
  return new Request("http://localhost", { method: metodo, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const corpo = { nome: "Kit Natal", itens: [{ produtoId: "665f1f77bcf86cd799439011", quantidade: 1 }] };

describe("/api/admin/kits", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET lista os kits", async () => {
    repo.listarKits.mockResolvedValue([{ id: "k1" }]);
    expect(await (await colecao.GET()).json()).toEqual({ kits: [{ id: "k1" }] });
  });

  it("POST 400 com payload inválido, sem gravar", async () => {
    const resposta = await colecao.POST(req("POST", { nome: "" }));
    expect(resposta.status).toBe(400);
    expect(repo.salvarKit).not.toHaveBeenCalled();
  });

  it("POST 201 cria o kit", async () => {
    repo.salvarKit.mockResolvedValue({ kit: { id: "k1" }, produtosCriados: [] });
    const resposta = await colecao.POST(req("POST", corpo));
    expect(resposta.status).toBe(201);
    expect(repo.salvarKit).toHaveBeenCalledWith(null, expect.objectContaining({ nome: "Kit Natal" }));
  });

  it("POST 409 devolve o produto existente quando o item novo repete o nome", async () => {
    repo.salvarKit.mockRejectedValue(new repo.ErroKit("Já existe", 409, { produtoExistenteId: "p9", nome: "Rena" }));
    const resposta = await colecao.POST(req("POST", corpo));
    expect(resposta.status).toBe(409);
    expect(await resposta.json()).toEqual({ erro: "Já existe", produtoExistenteId: "p9", nome: "Rena" });
  });

  it("GET/[id] 404 quando o kit não existe", async () => {
    repo.buscarKitDetalhe.mockResolvedValue(null);
    expect((await item.GET(req("GET"), params("x"))).status).toBe(404);
  });

  it("PUT/[id] 200 substitui e repassa reconfirmarPreco", async () => {
    repo.salvarKit.mockResolvedValue({ kit: { id: "k1" }, produtosCriados: [] });
    const resposta = await item.PUT(req("PUT", { ...corpo, precoCentavos: 900, reconfirmarPreco: true }), params("k1"));
    expect(resposta.status).toBe(200);
    expect(repo.salvarKit).toHaveBeenCalledWith("k1", expect.objectContaining({ reconfirmarPreco: true }));
  });

  it("DELETE/[id] 204 e 404", async () => {
    repo.excluirKit.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await item.DELETE(req("DELETE"), params("k1"))).status).toBe(204);
    expect((await item.DELETE(req("DELETE"), params("k1"))).status).toBe(404);
  });

  it("POST/[id]/produto 201 ao criar, 200 ao atualizar, 400 sem preço", async () => {
    repo.gerarProdutoDoKit
      .mockResolvedValueOnce({ produtoId: "p1", criado: true })
      .mockResolvedValueOnce({ produtoId: "p1", criado: false })
      .mockRejectedValueOnce(new repo.ErroKit("Defina o preço", 400));
    expect((await produto.POST(req("POST"), params("k1"))).status).toBe(201);
    expect((await produto.POST(req("POST"), params("k1"))).status).toBe(200);
    const erro = await produto.POST(req("POST"), params("k1"));
    expect(erro.status).toBe(400);
    expect(await erro.json()).toEqual({ erro: "Defina o preço" });
  });
});
