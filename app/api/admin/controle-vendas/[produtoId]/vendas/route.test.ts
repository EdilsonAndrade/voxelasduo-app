import { beforeEach, describe, expect, it, vi } from "vitest";

const { adicionarVenda } = vi.hoisted(() => ({ adicionarVenda: vi.fn() }));

vi.mock("@/lib/controleVendas/repository", () => ({ adicionarVenda }));

const { POST } = await import("./route");

const PRODUTO = "64b7f0c2a1b2c3d4e5f60718";

const valida = {
  data: "2026-10-20T12:00:00.000Z",
  quantidade: 2,
  cliente: "Ana",
  canal: "direta",
  precoUnitarioCentavos: 5000,
  taxaPercentual: 0,
  taxaFixaCentavos: 0,
  extrasCentavos: 0,
  baixarEstoque: true,
};

function post(produtoId: string, body: unknown) {
  return POST(
    new Request(`http://localhost/api/admin/controle-vendas/${produtoId}/vendas`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ produtoId }) }
  );
}

describe("POST /api/admin/controle-vendas/[produtoId]/vendas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("201 com o item atualizado", async () => {
    adicionarVenda.mockResolvedValue({ produtoId: PRODUTO, vendas: [] });
    const resposta = await post(PRODUTO, valida);

    expect(resposta.status).toBe(201);
    expect(adicionarVenda).toHaveBeenCalledWith(PRODUTO, valida);
  });

  it("400 com campos inválidos, sem gravar", async () => {
    const resposta = await post(PRODUTO, { ...valida, quantidade: 0 });

    expect(resposta.status).toBe(400);
    expect((await resposta.json()).campos).toHaveProperty("quantidade");
    expect(adicionarVenda).not.toHaveBeenCalled();
  });

  it("400 com produto inválido", async () => {
    expect((await post("abc", valida)).status).toBe(400);
  });

  it("404 quando o produto não existe", async () => {
    adicionarVenda.mockResolvedValue(null);
    expect((await post(PRODUTO, valida)).status).toBe(404);
  });
});
