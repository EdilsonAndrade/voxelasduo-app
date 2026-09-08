import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";

const { upsertAvaliacao } = vi.hoisted(() => ({ upsertAvaliacao: vi.fn() }));
const { registrarFalhaImportacao } = vi.hoisted(() => ({ registrarFalhaImportacao: vi.fn() }));
const { buscarAvaliacoesMercadoLivre } = vi.hoisted(() => ({
  buscarAvaliacoesMercadoLivre: vi.fn(),
}));
const { buscarAvaliacoesShopee } = vi.hoisted(() => ({ buscarAvaliacoesShopee: vi.fn() }));

vi.mock("./repository", () => ({ upsertAvaliacao }));
vi.mock("./falhas", () => ({ registrarFalhaImportacao }));
vi.mock("./canais/mercadoLivre", () => ({
  mercadoLivreAvaliacoesClient: { buscarAvaliacoes: buscarAvaliacoesMercadoLivre },
}));
vi.mock("./canais/shopee", () => ({
  shopeeAvaliacoesClient: { buscarAvaliacoes: buscarAvaliacoesShopee },
}));

const { importarAvaliacoesProduto } = await import("./importacao");

function produtoBase(overrides: Partial<Produto> = {}): Produto {
  return {
    _id: new ObjectId(),
    nome: "Vaso",
    slug: "vaso",
    descricao: "",
    preco: 1000,
    fotos: [],
    estoque: 5,
    categoria: "decoracao",
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...overrides,
  };
}

describe("importarAvaliacoesProduto", () => {
  const envOriginal = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...envOriginal,
      MERCADOLIVRE_CLIENT_ID: "id",
      MERCADOLIVRE_CLIENT_SECRET: "secret",
    };
    delete process.env.SHOPEE_PARTNER_ID;
    delete process.env.SHOPEE_PARTNER_KEY;
  });

  it("conta avaliação nova como importada", async () => {
    const produto = produtoBase({ integracoes: { mercadoLivreId: "MLB1" } });
    buscarAvaliacoesMercadoLivre.mockResolvedValue([
      { avaliacaoIdCanal: "1", nota: 5, dataAvaliacao: new Date() },
    ]);
    upsertAvaliacao.mockResolvedValue({ criada: true, atualizada: false });

    const resultado = await importarAvaliacoesProduto(produto);

    expect(resultado).toEqual({ importadas: 1, atualizadas: 0, falhas: 0 });
  });

  it("reimportação sem mudança não conta como importada nem atualizada", async () => {
    const produto = produtoBase({ integracoes: { mercadoLivreId: "MLB1" } });
    buscarAvaliacoesMercadoLivre.mockResolvedValue([
      { avaliacaoIdCanal: "1", nota: 5, dataAvaliacao: new Date() },
    ]);
    upsertAvaliacao.mockResolvedValue({ criada: false, atualizada: false });

    const resultado = await importarAvaliacoesProduto(produto);

    expect(resultado).toEqual({ importadas: 0, atualizadas: 0, falhas: 0 });
  });

  it("conta mudança de nota/comentário como atualizada", async () => {
    const produto = produtoBase({ integracoes: { mercadoLivreId: "MLB1" } });
    buscarAvaliacoesMercadoLivre.mockResolvedValue([
      { avaliacaoIdCanal: "1", nota: 3, dataAvaliacao: new Date() },
    ]);
    upsertAvaliacao.mockResolvedValue({ criada: false, atualizada: true });

    const resultado = await importarAvaliacoesProduto(produto);

    expect(resultado).toEqual({ importadas: 0, atualizadas: 1, falhas: 0 });
  });

  it("ignora silenciosamente um canal sem integracoes.<canal> no produto", async () => {
    const produto = produtoBase({ integracoes: {} });

    const resultado = await importarAvaliacoesProduto(produto);

    expect(buscarAvaliacoesMercadoLivre).not.toHaveBeenCalled();
    expect(buscarAvaliacoesShopee).not.toHaveBeenCalled();
    expect(resultado).toEqual({ importadas: 0, atualizadas: 0, falhas: 0 });
  });

  it("ignora silenciosamente o canal Shopee sem credencial de ambiente configurada", async () => {
    const produto = produtoBase({
      integracoes: { mercadoLivreId: "MLB1", shopeeItemId: "SH1" },
    });
    buscarAvaliacoesMercadoLivre.mockResolvedValue([]);

    await importarAvaliacoesProduto(produto);

    expect(buscarAvaliacoesShopee).not.toHaveBeenCalled();
  });

  it("falha em um canal não impede o processamento do outro, e é registrada", async () => {
    process.env.SHOPEE_PARTNER_ID = "pid";
    process.env.SHOPEE_PARTNER_KEY = "pkey";
    const produto = produtoBase({
      integracoes: { mercadoLivreId: "MLB1", shopeeItemId: "SH1" },
    });
    buscarAvaliacoesMercadoLivre.mockRejectedValue(new Error("token expirado"));
    buscarAvaliacoesShopee.mockResolvedValue([
      { avaliacaoIdCanal: "1", nota: 4, dataAvaliacao: new Date() },
    ]);
    upsertAvaliacao.mockResolvedValue({ criada: true, atualizada: false });

    const resultado = await importarAvaliacoesProduto(produto);

    expect(resultado).toEqual({ importadas: 1, atualizadas: 0, falhas: 1 });
    expect(registrarFalhaImportacao).toHaveBeenCalledWith(
      "mercado_livre",
      "token expirado",
      produto._id
    );
  });
});
