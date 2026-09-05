import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";

const { listarFalhasPendentes } = vi.hoisted(() => ({ listarFalhasPendentes: vi.fn() }));
const { buscarProdutosPorIds } = vi.hoisted(() => ({ buscarProdutosPorIds: vi.fn() }));

vi.mock("@/lib/estoque/publicacoes", () => ({ listarFalhasPendentes }));
vi.mock("@/lib/pedidos/repository", () => ({ buscarProdutosPorIds }));

const { GET } = await import("./route");

describe("GET /api/anuncios/pendencias", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lista falhas com o nome do produto correspondente", async () => {
    const produtoId = new ObjectId();
    listarFalhasPendentes.mockResolvedValue([
      {
        produtoId,
        canal: "mercado_livre",
        operacao: "criar",
        motivo: "categoria sem mapeamento",
        criadoEm: new Date("2026-09-05T18:00:00.000Z"),
      },
    ]);
    buscarProdutosPorIds.mockResolvedValue(
      new Map([[produtoId.toString(), { nome: "Vaso Geométrico" } as Produto]])
    );

    const resposta = await GET();
    const corpo = await resposta.json();

    expect(corpo.falhas).toEqual([
      {
        produtoId: produtoId.toString(),
        nomeProduto: "Vaso Geométrico",
        canal: "mercado_livre",
        operacao: "criar",
        motivo: "categoria sem mapeamento",
        criadoEm: "2026-09-05T18:00:00.000Z",
      },
    ]);
  });
});
