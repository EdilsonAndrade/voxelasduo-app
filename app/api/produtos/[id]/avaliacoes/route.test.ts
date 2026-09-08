import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";

const { buscarAvaliacoesProduto } = vi.hoisted(() => ({ buscarAvaliacoesProduto: vi.fn() }));

vi.mock("@/lib/avaliacoes/repository", () => ({ buscarAvaliacoesProduto }));

const { GET } = await import("./route");

function requestComQuery(query = ""): Request {
  return new Request(`http://localhost/api/produtos/x/avaliacoes${query}`);
}

describe("GET /api/produtos/[id]/avaliacoes", () => {
  it("retorna avaliações de mais de um canal com nota, comentário e origem", async () => {
    const produtoId = new ObjectId();
    buscarAvaliacoesProduto.mockResolvedValue({
      avaliacoes: [
        {
          _id: new ObjectId(),
          produtoId,
          canal: "mercado_livre",
          avaliacaoIdCanal: "ML1",
          nota: 5,
          comentario: "Ótimo produto",
          dataAvaliacao: new Date("2026-09-01T12:00:00.000Z"),
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        },
        {
          _id: new ObjectId(),
          produtoId,
          canal: "shopee",
          avaliacaoIdCanal: "SH1",
          nota: 4,
          dataAvaliacao: new Date("2026-08-28T09:30:00.000Z"),
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        },
      ],
      proximoCursor: null,
    });

    const resposta = await GET(requestComQuery(), {
      params: Promise.resolve({ id: produtoId.toString() }),
    });
    const corpo = await resposta.json();

    expect(corpo.avaliacoes).toEqual([
      {
        canal: "mercado_livre",
        nota: 5,
        comentario: "Ótimo produto",
        dataAvaliacao: "2026-09-01T12:00:00.000Z",
      },
      { canal: "shopee", nota: 4, comentario: null, dataAvaliacao: "2026-08-28T09:30:00.000Z" },
    ]);
    expect(corpo.proximoCursor).toBeNull();
  });

  it("retorna lista vazia sem erro quando o produto não tem avaliações", async () => {
    buscarAvaliacoesProduto.mockResolvedValue({ avaliacoes: [], proximoCursor: null });

    const resposta = await GET(requestComQuery(), {
      params: Promise.resolve({ id: new ObjectId().toString() }),
    });
    const corpo = await resposta.json();

    expect(corpo).toEqual({ avaliacoes: [], proximoCursor: null });
  });

  it("repassa cursor e limite recebidos na query para o repository", async () => {
    buscarAvaliacoesProduto.mockResolvedValue({ avaliacoes: [], proximoCursor: null });
    const produtoId = new ObjectId();

    await GET(requestComQuery("?cursor=abc123&limite=5"), {
      params: Promise.resolve({ id: produtoId.toString() }),
    });

    expect(buscarAvaliacoesProduto).toHaveBeenCalledWith(
      expect.any(ObjectId),
      expect.objectContaining({ cursor: "abc123", limite: 5 })
    );
  });
});
