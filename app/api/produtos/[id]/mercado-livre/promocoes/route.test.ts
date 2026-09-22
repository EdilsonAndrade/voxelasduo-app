import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";

const { buscarProdutoPorId } = vi.hoisted(() => ({ buscarProdutoPorId: vi.fn() }));
const { buscarTaxasCanais } = vi.hoisted(() => ({ buscarTaxasCanais: vi.fn() }));
const { consultarCustoVenda, resolverCategoriaParaSimulacao } = vi.hoisted(() => ({
  consultarCustoVenda: vi.fn(),
  resolverCategoriaParaSimulacao: vi.fn(),
}));
const { listarPromocoesElegiveis } = vi.hoisted(() => ({ listarPromocoesElegiveis: vi.fn() }));
const { obterVendedorId } = vi.hoisted(() => ({ obterVendedorId: vi.fn() }));
const { obterAccessTokenValido } = vi.hoisted(() => ({ obterAccessTokenValido: vi.fn() }));

vi.mock("@/lib/produtos/repository", () => ({ buscarProdutoPorId }));
vi.mock("@/lib/configuracoes/repository", () => ({ buscarTaxasCanais }));
vi.mock("@/lib/estoque/canais/mercadoLivre/precos", () => ({
  consultarCustoVenda,
  resolverCategoriaParaSimulacao,
}));
vi.mock("@/lib/estoque/canais/mercadoLivre/promocoes", () => ({ listarPromocoesElegiveis }));
vi.mock("@/lib/estoque/canais/mercadoLivre/mensagens", () => ({ obterVendedorId }));
vi.mock("@/lib/estoque/canais/mercadoLivre/auth", () => ({ obterAccessTokenValido }));

const { GET } = await import("./route");

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const produtoBase: Produto = {
  nome: "Chaveiro Estrela",
  slug: "chaveiro-estrela",
  descricao: "...",
  preco: 5000,
  fotos: [],
  estoque: 8,
  categoria: "chaveiros",
  integracoes: { mercadoLivreId: "MLB123" },
  custoProducao: {
    pesoPecaGramas: 10,
    tempoImpressaoHoras: 1,
    tempoMaoDeObraHoras: 0.2,
    precoCarreteCentavos: 8000,
    pesoCarreteGramas: 1000,
    margemPerdaPercentual: 0,
    precoImpressoraCentavos: 200000,
    vidaUtilImpressoraHoras: 5000,
    consumoEletricoKwh: 0.2,
    tarifaEnergiaCentavos: 80,
    valorHoraTrabalhoCentavos: 2000,
    custoEmbalagemCentavos: 100,
  },
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

const taxasPadrao = {
  shopeeTaxaPercentual: 14,
  siteTaxaPercentual: 4.99,
  siteTaxaFixaCentavos: 0,
  margemMinimaPercentual: 15,
};

describe("GET /api/produtos/[id]/mercado-livre/promocoes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buscarTaxasCanais.mockResolvedValue(taxasPadrao);
    obterAccessTokenValido.mockResolvedValue("token");
    obterVendedorId.mockResolvedValue("999");
    resolverCategoriaParaSimulacao.mockResolvedValue("MLB1234");
    consultarCustoVenda.mockResolvedValue({
      categoryId: "MLB1234",
      listingTypeId: "gold_special",
      listingFeeAmountCentavos: 0,
      saleFeeAmountCentavos: 500,
      percentageFee: 12,
      fixedFeeCentavos: 0,
    });
  });

  it("404 produto_nao_encontrado quando o produto não existe", async () => {
    buscarProdutoPorId.mockResolvedValue(null);

    const resposta = await GET(new Request("http://localhost"), params("x"));

    expect(resposta.status).toBe(404);
    expect((await resposta.json()).erro).toBe("produto_nao_encontrado");
  });

  it("404 produto_nao_publicado quando não há mercadoLivreId", async () => {
    buscarProdutoPorId.mockResolvedValue({ ...produtoBase, integracoes: undefined });

    const resposta = await GET(new Request("http://localhost"), params("x"));

    expect(resposta.status).toBe(404);
    expect((await resposta.json()).erro).toBe("produto_nao_publicado");
    expect(listarPromocoesElegiveis).not.toHaveBeenCalled();
  });

  it("404 custo_nao_configurado quando o produto não tem custo de produção", async () => {
    buscarProdutoPorId.mockResolvedValue({ ...produtoBase, custoProducao: undefined });

    const resposta = await GET(new Request("http://localhost"), params("x"));

    expect(resposta.status).toBe(404);
    expect((await resposta.json()).erro).toBe("custo_nao_configurado");
  });

  it("200 com lista vazia quando não há promoções elegíveis", async () => {
    buscarProdutoPorId.mockResolvedValue(produtoBase);
    listarPromocoesElegiveis.mockResolvedValue([]);

    const resposta = await GET(new Request("http://localhost"), params("x"));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.promocoes).toEqual([]);
    expect(corpo.margemMinimaPercentual).toBe(15);
  });

  it("marca valeAPena e lucroEstimadoCentavos comparando com o preço mínimo", async () => {
    buscarProdutoPorId.mockResolvedValue(produtoBase);
    listarPromocoesElegiveis.mockResolvedValue([
      { promotionId: "C-1", tipo: "DEAL", nome: "Oferta", precoPromocionalCentavos: 100000 },
      { promotionId: "C-2", tipo: "DEAL", nome: "Muito baixa", precoPromocionalCentavos: 1 },
    ]);

    const resposta = await GET(new Request("http://localhost"), params("x"));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    const [alta, baixa] = corpo.promocoes;
    expect(alta.valeAPena).toBe(true);
    expect(alta.lucroEstimadoCentavos).toBeGreaterThan(0);
    expect(baixa.valeAPena).toBe(false);
    expect(baixa.lucroEstimadoCentavos).toBeNull();
  });

  it("404 categoria_nao_encontrada quando o previsor não resolve categoria", async () => {
    buscarProdutoPorId.mockResolvedValue({ ...produtoBase, integracoes: { mercadoLivreId: "MLB123" } });
    resolverCategoriaParaSimulacao.mockResolvedValue(undefined);

    const resposta = await GET(new Request("http://localhost"), params("x"));

    expect(resposta.status).toBe(404);
    expect((await resposta.json()).erro).toBe("categoria_nao_encontrada");
  });

  it("401 token_invalido quando o token do Mercado Livre falha", async () => {
    buscarProdutoPorId.mockResolvedValue(produtoBase);
    obterAccessTokenValido.mockRejectedValue(
      new Error("Falha ao renovar token do Mercado Livre (HTTP 400).")
    );

    const resposta = await GET(new Request("http://localhost"), params("x"));

    expect(resposta.status).toBe(401);
    expect((await resposta.json()).erro).toBe("token_invalido");
  });

  it("502 falha_mercado_livre numa falha genérica — status real, não mascarado", async () => {
    buscarProdutoPorId.mockResolvedValue(produtoBase);
    listarPromocoesElegiveis.mockRejectedValue(
      new Error("Falha ao consultar as promoções do Mercado Livre (HTTP 500).")
    );

    const resposta = await GET(new Request("http://localhost"), params("x"));

    expect(resposta.status).toBe(502);
    expect((await resposta.json()).erro).toBe("falha_mercado_livre");
  });
});
