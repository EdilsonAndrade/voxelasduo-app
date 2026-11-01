import { beforeEach, describe, expect, it, vi } from "vitest";

const { buscarConfigFrete, salvarConfigFrete } = vi.hoisted(() => ({
  buscarConfigFrete: vi.fn(),
  salvarConfigFrete: vi.fn(),
}));

vi.mock("@/lib/frete/repository", () => ({ buscarConfigFrete, salvarConfigFrete }));

const { GET, PUT } = await import("./route");

function put(corpo: unknown) {
  return PUT(new Request("http://localhost/api/admin/configuracoes/frete", { method: "PUT", body: JSON.stringify(corpo) }));
}

describe("/api/admin/configuracoes/frete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET devolve a configuração vigente", async () => {
    buscarConfigFrete.mockResolvedValue({ pacCentavos: 1990, sedexCentavos: 2550 });
    const resposta = await GET();
    expect(await resposta.json()).toEqual({ pacCentavos: 1990, sedexCentavos: 2550 });
  });

  it("PUT salva valores válidos", async () => {
    salvarConfigFrete.mockImplementation(async (config) => config);
    const resposta = await put({ pacCentavos: 1990, sedexCentavos: 2800 });
    expect(resposta.status).toBe(200);
    expect(salvarConfigFrete).toHaveBeenCalledWith({ pacCentavos: 1990, sedexCentavos: 2800 });
  });

  it("PUT recusa com 400 e campos quando o valor é inválido", async () => {
    const resposta = await put({ pacCentavos: -5, sedexCentavos: 2800 });
    const corpo = await resposta.json();
    expect(resposta.status).toBe(400);
    expect(corpo.campos).toHaveProperty("pacCentavos");
    expect(salvarConfigFrete).not.toHaveBeenCalled();
  });
});
