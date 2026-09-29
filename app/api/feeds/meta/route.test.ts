import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";

const { listarProdutosPublicadosMeta } = vi.hoisted(() => ({
  listarProdutosPublicadosMeta: vi.fn(),
}));

vi.mock("@/lib/produtos/repository", () => ({ listarProdutosPublicadosMeta }));

const { GET } = await import("./route");

const produto: Produto = {
  _id: new ObjectId(),
  nome: "Vaso Geométrico",
  slug: "vaso-geometrico",
  descricao: "Vaso decorativo.",
  preco: 5000,
  fotos: ["https://blob.example/vaso.jpg"],
  estoque: 3,
  categoria: "decoracao",
  metaCatalogo: { publicar: true },
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

describe("GET /api/feeds/meta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("responde o CSV dos produtos marcados, sem cache", async () => {
    listarProdutosPublicadosMeta.mockResolvedValue([produto]);

    const resposta = await GET();
    const corpo = await resposta.text();

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(resposta.headers.get("Cache-Control")).toBe("no-store");
    expect(corpo.split("\r\n")[0]).toMatch(/^id,title,description,/);
    expect(corpo).toContain(`${produto._id!.toString()},Vaso Geométrico,Vaso decorativo.,in stock,new,50.00 BRL`);
  });

  it("responde 500 (e não um CSV vazio) quando a consulta falha", async () => {
    listarProdutosPublicadosMeta.mockRejectedValue(new Error("Mongo fora do ar"));

    const resposta = await GET();

    expect(resposta.status).toBe(500);
    expect(await resposta.json()).toEqual({ erro: "Não foi possível gerar o feed do catálogo." });
  });
});
