import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  listarRomaneios: vi.fn(),
  buscarRomaneio: vi.fn(),
  criarRomaneio: vi.fn(),
  atualizarRomaneio: vi.fn(),
  excluirRomaneio: vi.fn(),
}));

vi.mock("@/lib/romaneios/repository", () => repo);

const colecao = await import("./route");
const item = await import("./[id]/route");

function req(metodo: string, corpo?: unknown): Request {
  return new Request("http://localhost", { method: metodo, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const corpo = {
  nome: "Saída 31/10",
  dataSaida: "2026-10-31",
  lugares: [{ id: "l1", nome: "Casa do amigo", itens: [{ id: "i1", origem: "livre", nome: "Vaso", precoCentavos: 4000, levada: 3 }] }],
};

describe("/api/admin/romaneios", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET lista os romaneios", async () => {
    repo.listarRomaneios.mockResolvedValue([{ id: "r1" }]);
    expect(await (await colecao.GET()).json()).toEqual({ romaneios: [{ id: "r1" }] });
  });

  it("POST 400 com o motivo, sem gravar", async () => {
    const resposta = await colecao.POST(req("POST", { ...corpo, lugares: [] }));
    expect(resposta.status).toBe(400);
    expect((await resposta.json()).erro).toMatch(/lugar/);
    expect(repo.criarRomaneio).not.toHaveBeenCalled();
  });

  it("POST 201 cria", async () => {
    repo.criarRomaneio.mockResolvedValue({ id: "r1" });
    const resposta = await colecao.POST(req("POST", corpo));
    expect(resposta.status).toBe(201);
    expect(repo.criarRomaneio.mock.calls[0][0].lugares[0].status).toBe("aberto");
  });

  it("GET/PUT/DELETE de um romaneio que não existe devolvem 404", async () => {
    repo.buscarRomaneio.mockResolvedValue(null);
    repo.atualizarRomaneio.mockResolvedValue(null);
    repo.excluirRomaneio.mockResolvedValue(false);
    expect((await item.GET(req("GET"), params("x"))).status).toBe(404);
    expect((await item.PUT(req("PUT", corpo), params("x"))).status).toBe(404);
    expect((await item.DELETE(req("DELETE"), params("x"))).status).toBe(404);
  });

  it("PUT 400 sem chamar o repositório; DELETE 204", async () => {
    expect((await item.PUT(req("PUT", { nome: "" }), params("r1"))).status).toBe(400);
    expect(repo.atualizarRomaneio).not.toHaveBeenCalled();
    repo.excluirRomaneio.mockResolvedValue(true);
    expect((await item.DELETE(req("DELETE"), params("r1"))).status).toBe(204);
  });
});
