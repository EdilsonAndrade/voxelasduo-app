import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";

const { listarFalhasPendentes } = vi.hoisted(() => ({ listarFalhasPendentes: vi.fn() }));
const { buscarProdutosPorIds } = vi.hoisted(() => ({ buscarProdutosPorIds: vi.fn() }));

vi.mock("@/lib/avaliacoes/falhas", () => ({ listarFalhasPendentes }));
vi.mock("@/lib/pedidos/repository", () => ({ buscarProdutosPorIds }));

const { GET } = await import("./route");

describe("GET /api/avaliacoes/pendencias", () => {
  it("lista falhas com o nome do produto quando identificável", async () => {
    const produtoId = new ObjectId();
    listarFalhasPendentes.mockResolvedValue([
      {
        produtoId,
        canal: "mercado_livre",
        motivo: "token expirado",
        criadoEm: new Date("2026-09-07T18:00:00.000Z"),
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
        motivo: "token expirado",
        criadoEm: "2026-09-07T18:00:00.000Z",
      },
    ]);
  });

  it("lista falha geral do canal sem produto identificável", async () => {
    listarFalhasPendentes.mockResolvedValue([
      { canal: "shopee", motivo: "credencial inválida", criadoEm: new Date("2026-09-07T10:00:00.000Z") },
    ]);
    buscarProdutosPorIds.mockResolvedValue(new Map());

    const resposta = await GET();
    const corpo = await resposta.json();

    expect(corpo.falhas).toEqual([
      {
        produtoId: undefined,
        nomeProduto: undefined,
        canal: "shopee",
        motivo: "credencial inválida",
        criadoEm: "2026-09-07T10:00:00.000Z",
      },
    ]);
  });
});
