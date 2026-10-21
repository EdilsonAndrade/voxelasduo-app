import { beforeEach, describe, expect, it, vi } from "vitest";

const { salvarProducao } = vi.hoisted(() => ({ salvarProducao: vi.fn() }));

vi.mock("@/lib/controleVendas/repository", () => ({ salvarProducao }));

const { PUT } = await import("./route");

const PRODUTO = "64b7f0c2a1b2c3d4e5f60718";

function put(body: unknown) {
  return PUT(
    new Request(`http://localhost/api/admin/controle-vendas/${PRODUTO}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ produtoId: PRODUTO }) }
  );
}

describe("PUT /api/admin/controle-vendas/[produtoId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("salva a produção e devolve o item", async () => {
    const dados = { produzido: 10, custoUnitarioCentavos: 1200, precoVendaCentavos: null };
    salvarProducao.mockResolvedValue({ produtoId: PRODUTO, produzido: 10 });
    const resposta = await put(dados);

    expect(resposta.status).toBe(200);
    expect(salvarProducao).toHaveBeenCalledWith(PRODUTO, dados);
  });

  it("400 com produzido negativo", async () => {
    const resposta = await put({ produzido: -1, custoUnitarioCentavos: null, precoVendaCentavos: null });
    expect(resposta.status).toBe(400);
    expect(salvarProducao).not.toHaveBeenCalled();
  });

  it("404 quando o produto não existe", async () => {
    salvarProducao.mockResolvedValue(null);
    const resposta = await put({ produzido: 1, custoUnitarioCentavos: null, precoVendaCentavos: null });
    expect(resposta.status).toBe(404);
  });
});
