import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";

const { buscarProdutoPorId } = vi.hoisted(() => ({ buscarProdutoPorId: vi.fn() }));
const { criarPendencia, marcarSincronizado, marcarFalha } = vi.hoisted(() => ({
  criarPendencia: vi.fn(),
  marcarSincronizado: vi.fn(),
  marcarFalha: vi.fn(),
}));
const { mercadoLivreClient } = vi.hoisted(() => ({
  mercadoLivreClient: { atualizarQuantidade: vi.fn() },
}));
const { shopeeClient } = vi.hoisted(() => ({
  shopeeClient: { atualizarQuantidade: vi.fn() },
}));

vi.mock("@/lib/produtos/repository", () => ({ buscarProdutoPorId }));
vi.mock("./fila", () => ({ criarPendencia, marcarSincronizado, marcarFalha }));
vi.mock("./canais/mercadoLivre/client", () => ({ mercadoLivreClient }));
vi.mock("./canais/shopee", () => ({ shopeeClient }));

const { sincronizarEstoqueProduto } = await import("./sincronizacao");

const produtoBase: Produto = {
  _id: new ObjectId(),
  nome: "Vaso Geométrico",
  slug: "vaso-geometrico",
  descricao: "...",
  preco: 5000,
  fotos: ["https://exemplo.com/foto.jpg"],
  estoque: 8,
  categoria: "vasos",
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

const pedidoId = new ObjectId();

describe("sincronizarEstoqueProduto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MERCADOLIVRE_CLIENT_ID;
    delete process.env.MERCADOLIVRE_CLIENT_SECRET;
    delete process.env.SHOPEE_PARTNER_ID;
    delete process.env.SHOPEE_PARTNER_KEY;
    criarPendencia.mockResolvedValue({ _id: new ObjectId() });
  });

  it("canal com credencial e mapeamento: cria pendência e chama o client", async () => {
    process.env.MERCADOLIVRE_CLIENT_ID = "id";
    process.env.MERCADOLIVRE_CLIENT_SECRET = "secret";
    buscarProdutoPorId.mockResolvedValue({
      ...produtoBase,
      integracoes: { mercadoLivreId: "MLB123" },
    });
    mercadoLivreClient.atualizarQuantidade.mockResolvedValue(undefined);

    await sincronizarEstoqueProduto(produtoBase._id!.toString(), pedidoId);

    expect(criarPendencia).toHaveBeenCalledWith(produtoBase._id, pedidoId, "mercado_livre", 8);
    expect(mercadoLivreClient.atualizarQuantidade).toHaveBeenCalledWith("MLB123", 8);
    expect(marcarSincronizado).toHaveBeenCalled();
    expect(marcarFalha).not.toHaveBeenCalled();
  });

  it("canal sem credencial configurada: é ignorado, mesmo com mapeamento", async () => {
    buscarProdutoPorId.mockResolvedValue({
      ...produtoBase,
      integracoes: { mercadoLivreId: "MLB123" },
    });

    await sincronizarEstoqueProduto(produtoBase._id!.toString(), pedidoId);

    expect(criarPendencia).not.toHaveBeenCalled();
    expect(mercadoLivreClient.atualizarQuantidade).not.toHaveBeenCalled();
  });

  it("canal com credencial configurada mas sem mapeamento no produto: é ignorado", async () => {
    process.env.MERCADOLIVRE_CLIENT_ID = "id";
    process.env.MERCADOLIVRE_CLIENT_SECRET = "secret";
    buscarProdutoPorId.mockResolvedValue({ ...produtoBase, integracoes: undefined });

    await sincronizarEstoqueProduto(produtoBase._id!.toString(), pedidoId);

    expect(criarPendencia).not.toHaveBeenCalled();
    expect(mercadoLivreClient.atualizarQuantidade).not.toHaveBeenCalled();
  });

  it("falha do client vira item de fila (marcarFalha), sem lançar exceção", async () => {
    process.env.MERCADOLIVRE_CLIENT_ID = "id";
    process.env.MERCADOLIVRE_CLIENT_SECRET = "secret";
    buscarProdutoPorId.mockResolvedValue({
      ...produtoBase,
      integracoes: { mercadoLivreId: "MLB123" },
    });
    mercadoLivreClient.atualizarQuantidade.mockRejectedValue(new Error("HTTP 500"));

    await expect(
      sincronizarEstoqueProduto(produtoBase._id!.toString(), pedidoId)
    ).resolves.toBeUndefined();

    expect(marcarFalha).toHaveBeenCalledWith(expect.anything(), "HTTP 500");
    expect(marcarSincronizado).not.toHaveBeenCalled();
  });
});
