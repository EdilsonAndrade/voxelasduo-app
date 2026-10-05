import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";
import type { Impressao, VinculoArquivoProduto } from "@/lib/models/producao";

const {
  buscarProdutoPorId,
  incrementarEstoque,
  listarVinculosDoProduto,
  listarImpressoesPorNomes,
  consumirSaldoImpressao,
  registrarLancamento,
  sincronizarAnuncioProduto,
  auth,
} = vi.hoisted(() => ({
  buscarProdutoPorId: vi.fn(),
  incrementarEstoque: vi.fn(),
  listarVinculosDoProduto: vi.fn(),
  listarImpressoesPorNomes: vi.fn(),
  consumirSaldoImpressao: vi.fn(),
  registrarLancamento: vi.fn(),
  sincronizarAnuncioProduto: vi.fn().mockResolvedValue(undefined),
  auth: vi.fn().mockResolvedValue({ user: { email: "admin@exemplo.com" } }),
}));

vi.mock("@/lib/produtos/repository", () => ({ buscarProdutoPorId, incrementarEstoque }));
vi.mock("@/lib/producao/repository", () => ({
  listarVinculosDoProduto,
  listarImpressoesPorNomes,
  consumirSaldoImpressao,
  registrarLancamento,
}));
vi.mock("@/lib/estoque/sincronizacao", () => ({ sincronizarAnuncioProduto }));
vi.mock("@/lib/auth/config", () => ({ auth }));

const { POST } = await import("./route");

const produtoId = new ObjectId();

const produto = {
  _id: produtoId,
  nome: "Vaso",
  slug: "vaso",
  descricao: "...",
  preco: 9990,
  fotos: [],
  estoque: 2,
  categoria: "decoracao",
  criadoEm: new Date(),
  atualizadoEm: new Date(),
} as Produto;

function vinculo(over: Partial<VinculoArquivoProduto> = {}): VinculoArquivoProduto {
  return {
    nomeArquivo: "peca_unica",
    produtoId,
    parte: "Peça única",
    rendimentoPorPlaca: 6,
    unidadesPorProduto: 1,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...over,
  };
}

function impressao(over: Partial<Impressao> = {}): Impressao {
  return {
    _id: new ObjectId(),
    taskId: Math.random().toString(),
    nomeArquivo: "peca_unica",
    resultado: "concluida",
    inicio: new Date("2026-10-06T10:00:00.000Z"),
    fim: new Date("2026-10-06T14:00:00.000Z"),
    duracaoSegundos: 14400,
    gramas: 720,
    cores: [],
    gramasPorSlot: [],
    historico: false,
    quantidadeLancada: 0,
    quantidadePerdida: 0,
    importadoEm: new Date(),
    ...over,
  };
}

function requisicao(body: unknown): Request {
  return new Request("http://localhost/api/producao/lancamentos", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  buscarProdutoPorId.mockResolvedValue(produto);
  incrementarEstoque.mockImplementation(async (_id: string, q: number) => ({
    ...produto,
    estoque: produto.estoque + q,
  }));
  listarVinculosDoProduto.mockResolvedValue([vinculo()]);
  listarImpressoesPorNomes.mockResolvedValue([impressao()]);
  consumirSaldoImpressao.mockResolvedValue(true);
  registrarLancamento.mockImplementation(async (dados: unknown) => ({
    ...(dados as object),
    _id: new ObjectId(),
  }));
  auth.mockResolvedValue({ user: { email: "admin@exemplo.com" } });
});

describe("validação", () => {
  it("recusa produto inválido", async () => {
    const resposta = await POST(requisicao({ produtoId: "x", quantidade: 1 }));
    expect(resposta.status).toBe(400);
  });

  it("recusa quantidade zero", async () => {
    const resposta = await POST(requisicao({ produtoId: produtoId.toString(), quantidade: 0 }));
    expect(resposta.status).toBe(400);
    await expect(resposta.json()).resolves.toMatchObject({
      erro: expect.stringContaining("maior que zero"),
    });
  });

  it("recusa quantidade fracionária", async () => {
    const resposta = await POST(requisicao({ produtoId: produtoId.toString(), quantidade: 1.5 }));
    expect(resposta.status).toBe(400);
  });

  it("devolve 404 para produto inexistente", async () => {
    buscarProdutoPorId.mockResolvedValue(null);
    const resposta = await POST(requisicao({ produtoId: produtoId.toString(), quantidade: 1 }));
    expect(resposta.status).toBe(404);
  });

  it("devolve 409 para produto sem vínculo de produção", async () => {
    listarVinculosDoProduto.mockResolvedValue([]);
    const resposta = await POST(requisicao({ produtoId: produtoId.toString(), quantidade: 1 }));

    expect(resposta.status).toBe(409);
    await expect(resposta.json()).resolves.toMatchObject({
      erro: "Produto não possui vínculo de produção.",
    });
  });
});

describe("lançamento", () => {
  it("soma no estoque exatamente o confirmado e registra o lançamento", async () => {
    const resposta = await POST(requisicao({ produtoId: produtoId.toString(), quantidade: 5 }));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(incrementarEstoque).toHaveBeenCalledWith(produtoId.toString(), 5);
    expect(corpo.estoqueAtual).toBe(7); // 2 + 5
    expect(corpo.consumo).toHaveLength(1);
    expect(registrarLancamento).toHaveBeenCalledWith(
      expect.objectContaining({ quantidade: 5, quantidadePerdida: 0 })
    );
  });

  it("perda declarada sai do saldo mas não entra no estoque", async () => {
    const resposta = await POST(
      requisicao({ produtoId: produtoId.toString(), quantidade: 5, quantidadePerdida: 1 })
    );
    const corpo = await resposta.json();

    expect(corpo.estoqueAtual).toBe(7); // só as 5 confirmadas
    expect(consumirSaldoImpressao).toHaveBeenCalledWith(expect.anything(), 5, 1, 6);
    expect(registrarLancamento).toHaveBeenCalledWith(
      expect.objectContaining({ quantidade: 5, quantidadePerdida: 1 })
    );
  });

  it("propaga aos canais pelo mesmo caminho do abatimento por venda", async () => {
    await POST(requisicao({ produtoId: produtoId.toString(), quantidade: 3 }));
    expect(sincronizarAnuncioProduto).toHaveBeenCalledWith(produtoId.toString(), undefined);
  });

  it("recusa com 409 quando a quantidade excede o saldo, informando o disponível", async () => {
    const resposta = await POST(requisicao({ produtoId: produtoId.toString(), quantidade: 7 }));

    expect(resposta.status).toBe(409);
    await expect(resposta.json()).resolves.toMatchObject({
      erro: "Saldo insuficiente: há 6 conjuntos completos disponíveis.",
    });
    expect(incrementarEstoque).not.toHaveBeenCalled();
  });

  it("não lança o dobro quando a mesma impressão já foi lançada", async () => {
    listarImpressoesPorNomes.mockResolvedValue([impressao({ quantidadeLancada: 6 })]);

    const resposta = await POST(requisicao({ produtoId: produtoId.toString(), quantidade: 1 }));

    expect(resposta.status).toBe(409);
    expect(incrementarEstoque).not.toHaveBeenCalled();
  });

  it("não oferece lançamento de impressão histórica", async () => {
    listarImpressoesPorNomes.mockResolvedValue([impressao({ historico: true })]);

    const resposta = await POST(requisicao({ produtoId: produtoId.toString(), quantidade: 1 }));

    expect(resposta.status).toBe(409);
    expect(incrementarEstoque).not.toHaveBeenCalled();
  });

  it("devolve 409 sem tocar no estoque quando o saldo é consumido por outra operação", async () => {
    consumirSaldoImpressao.mockResolvedValue(false);

    const resposta = await POST(requisicao({ produtoId: produtoId.toString(), quantidade: 2 }));

    expect(resposta.status).toBe(409);
    expect(incrementarEstoque).not.toHaveBeenCalled();
  });
});

describe("multipartes", () => {
  const base = vinculo({ nomeArquivo: "base", parte: "Base", rendimentoPorPlaca: 10 });
  const tampa = vinculo({ nomeArquivo: "tampa", parte: "Tampa", rendimentoPorPlaca: 4 });

  beforeEach(() => {
    listarVinculosDoProduto.mockResolvedValue([base, tampa]);
    listarImpressoesPorNomes.mockResolvedValue([
      impressao({ nomeArquivo: "base" }),
      impressao({ nomeArquivo: "tampa" }),
    ]);
  });

  it("limita o lançamento aos conjuntos completos", async () => {
    const resposta = await POST(requisicao({ produtoId: produtoId.toString(), quantidade: 5 }));

    expect(resposta.status).toBe(409);
    await expect(resposta.json()).resolves.toMatchObject({
      erro: "Saldo insuficiente: há 4 conjuntos completos disponíveis.",
    });
  });

  it("consome o saldo das duas partes ao lançar conjuntos", async () => {
    const resposta = await POST(requisicao({ produtoId: produtoId.toString(), quantidade: 3 }));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.consumo.map((c: { parte: string }) => c.parte)).toEqual(["Base", "Tampa"]);
    expect(consumirSaldoImpressao).toHaveBeenCalledTimes(2);
    expect(incrementarEstoque).toHaveBeenCalledWith(produtoId.toString(), 3);
  });
});
