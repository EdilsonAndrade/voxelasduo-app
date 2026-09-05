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
  mercadoLivreClient: { atualizarAnuncio: vi.fn() },
}));
const { shopeeClient } = vi.hoisted(() => ({
  shopeeClient: { atualizarAnuncio: vi.fn() },
}));

vi.mock("@/lib/produtos/repository", () => ({ buscarProdutoPorId }));
vi.mock("./fila", () => ({ criarPendencia, marcarSincronizado, marcarFalha }));
vi.mock("./canais/mercadoLivre/client", () => ({ mercadoLivreClient }));
vi.mock("./canais/shopee", () => ({ shopeeClient }));

const { sincronizarAnuncioProduto } = await import("./sincronizacao");

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

describe("sincronizarAnuncioProduto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MERCADOLIVRE_CLIENT_ID;
    delete process.env.MERCADOLIVRE_CLIENT_SECRET;
    delete process.env.SHOPEE_PARTNER_ID;
    delete process.env.SHOPEE_PARTNER_KEY;
    criarPendencia.mockResolvedValue({ _id: new ObjectId() });
  });

  it("canal com credencial e mapeamento: cria pendência e chama o client com quantidade e preço", async () => {
    process.env.MERCADOLIVRE_CLIENT_ID = "id";
    process.env.MERCADOLIVRE_CLIENT_SECRET = "secret";
    buscarProdutoPorId.mockResolvedValue({
      ...produtoBase,
      integracoes: { mercadoLivreId: "MLB123" },
    });
    mercadoLivreClient.atualizarAnuncio.mockResolvedValue(undefined);

    await sincronizarAnuncioProduto(produtoBase._id!.toString(), pedidoId);

    expect(criarPendencia).toHaveBeenCalledWith(produtoBase._id, pedidoId, "mercado_livre", 8);
    expect(mercadoLivreClient.atualizarAnuncio).toHaveBeenCalledWith("MLB123", {
      quantidade: 8,
      preco: 5000,
    });
    expect(marcarSincronizado).toHaveBeenCalled();
    expect(marcarFalha).not.toHaveBeenCalled();
  });

  it("canal sem credencial configurada: é ignorado, mesmo com mapeamento", async () => {
    buscarProdutoPorId.mockResolvedValue({
      ...produtoBase,
      integracoes: { mercadoLivreId: "MLB123" },
    });

    await sincronizarAnuncioProduto(produtoBase._id!.toString(), pedidoId);

    expect(criarPendencia).not.toHaveBeenCalled();
    expect(mercadoLivreClient.atualizarAnuncio).not.toHaveBeenCalled();
  });

  it("canal com credencial configurada mas sem mapeamento no produto: é ignorado", async () => {
    process.env.MERCADOLIVRE_CLIENT_ID = "id";
    process.env.MERCADOLIVRE_CLIENT_SECRET = "secret";
    buscarProdutoPorId.mockResolvedValue({ ...produtoBase, integracoes: undefined });

    await sincronizarAnuncioProduto(produtoBase._id!.toString(), pedidoId);

    expect(criarPendencia).not.toHaveBeenCalled();
    expect(mercadoLivreClient.atualizarAnuncio).not.toHaveBeenCalled();
  });

  it("falha do client vira item de fila (marcarFalha), sem lançar exceção", async () => {
    process.env.MERCADOLIVRE_CLIENT_ID = "id";
    process.env.MERCADOLIVRE_CLIENT_SECRET = "secret";
    buscarProdutoPorId.mockResolvedValue({
      ...produtoBase,
      integracoes: { mercadoLivreId: "MLB123" },
    });
    mercadoLivreClient.atualizarAnuncio.mockRejectedValue(new Error("HTTP 500"));

    await expect(
      sincronizarAnuncioProduto(produtoBase._id!.toString(), pedidoId)
    ).resolves.toBeUndefined();

    expect(marcarFalha).toHaveBeenCalledWith(expect.anything(), "HTTP 500");
    expect(marcarSincronizado).not.toHaveBeenCalled();
  });

  it("canalOrigem informado: pula esse canal e sincroniza os demais (research.md #8)", async () => {
    process.env.MERCADOLIVRE_CLIENT_ID = "id";
    process.env.MERCADOLIVRE_CLIENT_SECRET = "secret";
    process.env.SHOPEE_PARTNER_ID = "partner";
    process.env.SHOPEE_PARTNER_KEY = "key";
    buscarProdutoPorId.mockResolvedValue({
      ...produtoBase,
      integracoes: { mercadoLivreId: "MLB123", shopeeItemId: "SHP123" },
    });
    shopeeClient.atualizarAnuncio.mockResolvedValue(undefined);

    await sincronizarAnuncioProduto(produtoBase._id!.toString(), pedidoId, {
      canalOrigem: "mercado_livre",
    });

    expect(mercadoLivreClient.atualizarAnuncio).not.toHaveBeenCalled();
    expect(shopeeClient.atualizarAnuncio).toHaveBeenCalledWith("SHP123", {
      quantidade: 8,
      preco: 5000,
    });
  });
});
