import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";

const { buscarProdutoPorId } = vi.hoisted(() => ({ buscarProdutoPorId: vi.fn() }));
const { salvarVinculo, listarVinculos } = vi.hoisted(() => ({
  salvarVinculo: vi.fn(),
  listarVinculos: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/produtos/repository", () => ({ buscarProdutoPorId }));
vi.mock("@/lib/producao/repository", () => ({ salvarVinculo, listarVinculos }));

const { POST } = await import("./route");

const produtoId = new ObjectId();

function requisicao(body: unknown): Request {
  return new Request("http://localhost/api/producao/vinculos", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  buscarProdutoPorId.mockResolvedValue({ _id: produtoId, nome: "Vaso" } as Produto);
  salvarVinculo.mockImplementation(async (dados: unknown) => ({
    ...(dados as object),
    _id: new ObjectId(),
  }));
});

describe("criação do vínculo", () => {
  it("salva peça única com o rendimento informado", async () => {
    const resposta = await POST(
      requisicao({
        nomeArquivo: "chaveiro_gato",
        produtoId: produtoId.toString(),
        rendimentoPorPlaca: 6,
      })
    );

    expect(resposta.status).toBe(200);
    expect(salvarVinculo).toHaveBeenCalledWith({
      nomeArquivo: "chaveiro_gato",
      produtoId,
      parte: "Peça única", // padrão quando não há mais de uma parte
      rendimentoPorPlaca: 6,
      unidadesPorProduto: 1,
    });
  });

  it("aceita dois nomes de arquivo apontando para o mesmo produto como partes distintas", async () => {
    await POST(
      requisicao({
        nomeArquivo: "vaso_base",
        produtoId: produtoId.toString(),
        parte: "Base",
        rendimentoPorPlaca: 5,
      })
    );
    await POST(
      requisicao({
        nomeArquivo: "vaso_tampa",
        produtoId: produtoId.toString(),
        parte: "Tampa",
        rendimentoPorPlaca: 2,
      })
    );

    expect(salvarVinculo).toHaveBeenNthCalledWith(1, expect.objectContaining({ parte: "Base" }));
    expect(salvarVinculo).toHaveBeenNthCalledWith(2, expect.objectContaining({ parte: "Tampa" }));
  });

  it("aceita unidadesPorProduto maior que 1", async () => {
    await POST(
      requisicao({
        nomeArquivo: "pes",
        produtoId: produtoId.toString(),
        parte: "Pés",
        rendimentoPorPlaca: 8,
        unidadesPorProduto: 4,
      })
    );

    expect(salvarVinculo).toHaveBeenCalledWith(
      expect.objectContaining({ unidadesPorProduto: 4 })
    );
  });
});

describe("validação", () => {
  it("exige o nome do arquivo", async () => {
    const resposta = await POST(
      requisicao({ nomeArquivo: "  ", produtoId: produtoId.toString(), rendimentoPorPlaca: 1 })
    );
    expect(resposta.status).toBe(400);
  });

  it("recusa rendimento zero, negativo ou fracionário", async () => {
    for (const rendimentoPorPlaca of [0, -2, 1.5]) {
      const resposta = await POST(
        requisicao({ nomeArquivo: "x", produtoId: produtoId.toString(), rendimentoPorPlaca })
      );
      expect(resposta.status).toBe(400);
      await expect(resposta.json()).resolves.toMatchObject({
        erro: "Rendimento por placa deve ser um inteiro maior que zero.",
      });
    }
    expect(salvarVinculo).not.toHaveBeenCalled();
  });

  it("recusa unidades por produto inválidas", async () => {
    const resposta = await POST(
      requisicao({
        nomeArquivo: "x",
        produtoId: produtoId.toString(),
        rendimentoPorPlaca: 2,
        unidadesPorProduto: 0,
      })
    );
    expect(resposta.status).toBe(400);
  });

  it("recusa produto inválido", async () => {
    const resposta = await POST(
      requisicao({ nomeArquivo: "x", produtoId: "nao-e-id", rendimentoPorPlaca: 1 })
    );
    expect(resposta.status).toBe(400);
  });

  it("devolve 404 quando o produto não existe", async () => {
    buscarProdutoPorId.mockResolvedValue(null);

    const resposta = await POST(
      requisicao({ nomeArquivo: "x", produtoId: produtoId.toString(), rendimentoPorPlaca: 1 })
    );

    expect(resposta.status).toBe(404);
    await expect(resposta.json()).resolves.toMatchObject({ erro: "Produto não encontrado." });
  });
});
