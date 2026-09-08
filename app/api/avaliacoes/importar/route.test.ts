import { beforeEach, describe, expect, it, vi } from "vitest";

const { listarProdutosComIntegracaoExterna } = vi.hoisted(() => ({
  listarProdutosComIntegracaoExterna: vi.fn(),
}));
const { importarAvaliacoesProduto } = vi.hoisted(() => ({
  importarAvaliacoesProduto: vi.fn(),
}));

vi.mock("@/lib/produtos/repository", () => ({ listarProdutosComIntegracaoExterna }));
vi.mock("@/lib/avaliacoes/importacao", () => ({ importarAvaliacoesProduto }));

const { GET, POST } = await import("./route");

function requisicao(auth?: string): Request {
  return new Request("http://localhost/api/avaliacoes/importar", {
    method: "GET",
    headers: auth ? { authorization: auth } : {},
  });
}

describe("GET|POST /api/avaliacoes/importar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "segredo-teste";
  });

  it("401 quando o segredo do cron está ausente ou incorreto", async () => {
    const resposta = await GET(requisicao());
    expect(resposta.status).toBe(401);
    expect(listarProdutosComIntegracaoExterna).not.toHaveBeenCalled();

    const respostaErrada = await GET(requisicao("Bearer errado"));
    expect(respostaErrada.status).toBe(401);
  });

  it("soma corretamente os contadores de todos os produtos processados", async () => {
    listarProdutosComIntegracaoExterna.mockResolvedValue([{ _id: "1" }, { _id: "2" }]);
    importarAvaliacoesProduto
      .mockResolvedValueOnce({ importadas: 2, atualizadas: 1, falhas: 0 })
      .mockResolvedValueOnce({ importadas: 0, atualizadas: 0, falhas: 1 });

    const resposta = await POST(requisicao("Bearer segredo-teste"));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo).toEqual({
      produtosProcessados: 2,
      avaliacoesImportadas: 2,
      avaliacoesAtualizadas: 1,
      falharam: 1,
    });
  });

  it("uma falha em um produto não interrompe o processamento dos demais", async () => {
    listarProdutosComIntegracaoExterna.mockResolvedValue([{ _id: "1" }, { _id: "2" }, { _id: "3" }]);
    importarAvaliacoesProduto
      .mockResolvedValueOnce({ importadas: 1, atualizadas: 0, falhas: 0 })
      .mockResolvedValueOnce({ importadas: 0, atualizadas: 0, falhas: 1 })
      .mockResolvedValueOnce({ importadas: 1, atualizadas: 0, falhas: 0 });

    const resposta = await GET(requisicao("Bearer segredo-teste"));
    const corpo = await resposta.json();

    expect(importarAvaliacoesProduto).toHaveBeenCalledTimes(3);
    expect(corpo).toEqual({
      produtosProcessados: 3,
      avaliacoesImportadas: 2,
      avaliacoesAtualizadas: 0,
      falharam: 1,
    });
  });
});
