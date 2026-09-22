import { beforeEach, describe, expect, it, vi } from "vitest";

const { findOne, updateOne } = vi.hoisted(() => ({
  findOne: vi.fn(),
  updateOne: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/db/mongodb", () => ({
  default: vi.fn().mockResolvedValue({
    db: () => ({ collection: () => ({ findOne, updateOne }) }),
  }),
  DB_NAME: "voxelasduo",
}));

const { obterComCache, normalizarTermo, ErroNaoEncontrado } = await import("./cache");

describe("normalizarTermo", () => {
  it("aplica trim, lowercase e colapsa espaços internos", () => {
    expect(normalizarTermo("  Chaveiro   Personalizado  ")).toBe("chaveiro personalizado");
  });
});

describe("obterComCache", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devolve o cache vigente (< 24h) sem chamar buscarNovo", async () => {
    const obtidoEm = new Date(Date.now() - 60 * 1000); // 1 minuto atrás
    findOne.mockResolvedValue({ _id: "chaveiro", obtidoEm, categoriaId: "MLB1" });
    const buscarNovo = vi.fn();

    const resultado = await obterComCache({ chave: "chaveiro", buscarNovo });

    expect(resultado.origem).toBe("cache");
    expect(resultado.dados).toEqual({ categoriaId: "MLB1" });
    expect(resultado.avisoDesatualizado).toBe(false);
    expect(buscarNovo).not.toHaveBeenCalled();
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("chama buscarNovo quando o cache está vencido (> 24h) e faz upsert", async () => {
    const obtidoEm = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h atrás
    findOne.mockResolvedValue({ _id: "chaveiro", obtidoEm, categoriaId: "MLB1" });
    const buscarNovo = vi.fn().mockResolvedValue({ categoriaId: "MLB2" });

    const resultado = await obterComCache({ chave: "chaveiro", buscarNovo });

    expect(resultado.origem).toBe("novo");
    expect(resultado.dados).toEqual({ categoriaId: "MLB2" });
    expect(buscarNovo).toHaveBeenCalledOnce();
    expect(updateOne).toHaveBeenCalledWith(
      { _id: "chaveiro" },
      { $set: expect.objectContaining({ categoriaId: "MLB2" }) },
      { upsert: true }
    );
  });

  it("com forcar: true, chama buscarNovo mesmo com cache vigente", async () => {
    const obtidoEm = new Date(Date.now() - 60 * 1000);
    findOne.mockResolvedValue({ _id: "chaveiro", obtidoEm, categoriaId: "MLB1" });
    const buscarNovo = vi.fn().mockResolvedValue({ categoriaId: "MLB2" });

    const resultado = await obterComCache({ chave: "chaveiro", forcar: true, buscarNovo });

    expect(resultado.origem).toBe("novo");
    expect(buscarNovo).toHaveBeenCalledOnce();
  });

  it("chama buscarNovo quando não há nada em cache", async () => {
    findOne.mockResolvedValue(null);
    const buscarNovo = vi.fn().mockResolvedValue({ categoriaId: "MLB1" });

    const resultado = await obterComCache({ chave: "chaveiro", buscarNovo });

    expect(resultado.origem).toBe("novo");
    expect(buscarNovo).toHaveBeenCalledOnce();
  });

  it("propaga o erro de buscarNovo quando não há nada em cache", async () => {
    findOne.mockResolvedValue(null);
    const buscarNovo = vi.fn().mockRejectedValue(new Error("falha ao consultar o ML"));

    await expect(obterComCache({ chave: "chaveiro", buscarNovo })).rejects.toThrow(
      "falha ao consultar o ML"
    );
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("US4: falha de buscarNovo com cache vencido disponível → devolve o cache com avisoDesatualizado", async () => {
    const obtidoEm = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h atrás (vencido)
    findOne.mockResolvedValue({ _id: "chaveiro", obtidoEm, categoriaId: "MLB1" });
    const buscarNovo = vi.fn().mockRejectedValue(new Error("Falha ao consultar (HTTP 502)."));

    const resultado = await obterComCache({ chave: "chaveiro", buscarNovo });

    expect(resultado.origem).toBe("cache");
    expect(resultado.avisoDesatualizado).toBe(true);
    expect(resultado.dados).toEqual({ categoriaId: "MLB1" });
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("US4: ErroNaoEncontrado nunca usa o fallback de cache vencido, mesmo com cache disponível", async () => {
    const obtidoEm = new Date(Date.now() - 25 * 60 * 60 * 1000);
    findOne.mockResolvedValue({ _id: "chaveiro", obtidoEm, categoriaId: "MLB1" });
    const buscarNovo = vi.fn().mockRejectedValue(new ErroNaoEncontrado("categoria_nao_encontrada"));

    await expect(obterComCache({ chave: "chaveiro", buscarNovo })).rejects.toBeInstanceOf(
      ErroNaoEncontrado
    );
  });
});
