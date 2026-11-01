import { beforeEach, describe, expect, it, vi } from "vitest";

const { buscarConfigFrete } = vi.hoisted(() => ({ buscarConfigFrete: vi.fn() }));

vi.mock("@/lib/frete/repository", async () => {
  const { calcularOpcoesFrete } = await import("@/lib/frete/calculo");
  return {
    buscarConfigFrete,
    opcoesFreteVigentes: async () => calcularOpcoesFrete({ config: await buscarConfigFrete() }),
  };
});

const { POST } = await import("./route");

describe("POST /api/frete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devolve PAC, SEDEX e combinar com os valores configurados", async () => {
    buscarConfigFrete.mockResolvedValue({ pacCentavos: 1990, sedexCentavos: 2800 });

    const resposta = await POST(
      new Request("http://localhost/api/frete", { method: "POST", body: JSON.stringify({ cep: "01001000" }) })
    );
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.opcoes.map((opcao: { servico: string; valorCentavos: number }) => [opcao.servico, opcao.valorCentavos])).toEqual([
      ["pac", 1990],
      ["sedex", 2800],
      ["combinar", 0],
    ]);
  });

  it("aceita corpo vazio", async () => {
    buscarConfigFrete.mockResolvedValue({ pacCentavos: 1990, sedexCentavos: 2550 });
    const resposta = await POST(new Request("http://localhost/api/frete", { method: "POST" }));
    expect(resposta.status).toBe(200);
  });
});
