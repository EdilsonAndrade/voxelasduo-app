import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({
  obterAccessTokenValido: vi.fn().mockResolvedValue("token-valido"),
}));

const { buscarEnvioMercadoLivre } = await import("./envios");

function mockFetchPorUrl(respostas: Record<string, unknown>) {
  const chaves = Object.keys(respostas).sort((a, b) => b.length - a.length);
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const chave = chaves.find((padrao) => url.includes(padrao));
      if (!chave) throw new Error(`URL inesperada no teste: ${url}`);
      return Promise.resolve(respostas[chave]);
    })
  );
}

describe("buscarEnvioMercadoLivre", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("mapeia um envio despachado, com order_id vindo de /items", async () => {
    mockFetchPorUrl({
      "/shipments/999/items": {
        ok: true,
        json: async () => [{ order_id: 12345 }],
      },
      "/shipments/999": {
        ok: true,
        json: async () => ({ id: 999, status: "shipped", tracking_number: "BR123456789" }),
      },
    });

    const envio = await buscarEnvioMercadoLivre("999");

    expect(envio).toEqual({
      shipmentId: "999",
      orderId: "12345",
      trackingNumber: "BR123456789",
      despachado: true,
      entregue: false,
    });
  });

  it("mapeia um envio entregue", async () => {
    mockFetchPorUrl({
      "/shipments/999/items": { ok: true, json: async () => [{ order_id: 12345 }] },
      "/shipments/999": {
        ok: true,
        json: async () => ({ id: 999, status: "delivered", tracking_number: "BR123456789" }),
      },
    });

    const envio = await buscarEnvioMercadoLivre("999");

    expect(envio.entregue).toBe(true);
    expect(envio.despachado).toBe(false);
  });

  it("sem tracking_number, retorna trackingNumber undefined", async () => {
    mockFetchPorUrl({
      "/shipments/999/items": { ok: true, json: async () => [{ order_id: 12345 }] },
      "/shipments/999": {
        ok: true,
        json: async () => ({ id: 999, status: "pending", tracking_number: null }),
      },
    });

    const envio = await buscarEnvioMercadoLivre("999");

    expect(envio.trackingNumber).toBeUndefined();
  });

  it("envio represado (buffered): retorna aguardandoLiberacaoAte com a data de liberação", async () => {
    mockFetchPorUrl({
      "/shipments/999/items": { ok: true, json: async () => [{ order_id: 12345 }] },
      "/shipments/999": {
        ok: true,
        json: async () => ({
          id: 999,
          status: "pending",
          substatus: "buffered",
          tracking_number: null,
          buffering: { date: "2026-10-01T00:00:00.000-03:00" },
        }),
      },
    });

    const envio = await buscarEnvioMercadoLivre("999");

    expect(envio.aguardandoLiberacaoAte).toEqual(new Date("2026-10-01T00:00:00.000-03:00"));
    expect(envio.despachado).toBe(false);
  });

  it("substatus diferente de buffered: aguardandoLiberacaoAte fica undefined", async () => {
    mockFetchPorUrl({
      "/shipments/999/items": { ok: true, json: async () => [{ order_id: 12345 }] },
      "/shipments/999": {
        ok: true,
        json: async () => ({ id: 999, status: "shipped", substatus: "in_hub", tracking_number: "BR1" }),
      },
    });

    const envio = await buscarEnvioMercadoLivre("999");

    expect(envio.aguardandoLiberacaoAte).toBeUndefined();
  });

  it("lança erro quando a consulta ao envio falha", async () => {
    mockFetchPorUrl({
      "/shipments/999/items": { ok: true, json: async () => [{ order_id: 12345 }] },
      "/shipments/999": { ok: false, status: 404, text: async () => "" },
    });

    await expect(buscarEnvioMercadoLivre("999")).rejects.toThrow("HTTP 404");
  });

  it("lança erro quando a consulta aos itens falha", async () => {
    mockFetchPorUrl({
      "/shipments/999": {
        ok: true,
        json: async () => ({ id: 999, status: "shipped", tracking_number: "BR123456789" }),
      },
      "/shipments/999/items": { ok: false, status: 500, text: async () => "" },
    });

    await expect(buscarEnvioMercadoLivre("999")).rejects.toThrow("HTTP 500");
  });
});
