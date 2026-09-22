import { beforeEach, describe, expect, it, vi } from "vitest";

const { buscarTaxasCanais, salvarTaxasCanais } = vi.hoisted(() => ({
  buscarTaxasCanais: vi.fn(),
  salvarTaxasCanais: vi.fn(),
}));

vi.mock("@/lib/configuracoes/repository", () => ({ buscarTaxasCanais, salvarTaxasCanais }));

const { GET, PUT } = await import("./route");

const valido = {
  shopeeTaxaPercentual: 14,
  siteTaxaPercentual: 4.99,
  siteTaxaFixaCentavos: 0,
  margemMinimaPercentual: 15,
  margemDesejadaPercentual: 100,
};

function put(body: unknown) {
  return PUT(
    new Request("http://localhost/api/admin/configuracoes/taxas", {
      method: "PUT",
      body: JSON.stringify(body),
    })
  );
}

describe("/api/admin/configuracoes/taxas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET devolve as taxas atuais", async () => {
    buscarTaxasCanais.mockResolvedValue(valido);
    const resposta = await GET();

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual(valido);
  });

  it("PUT salva e devolve as taxas válidas", async () => {
    salvarTaxasCanais.mockResolvedValue(valido);
    const resposta = await put(valido);

    expect(resposta.status).toBe(200);
    expect(salvarTaxasCanais).toHaveBeenCalledWith(valido);
    expect(await resposta.json()).toEqual(valido);
  });

  it("PUT 400 com percentual inválido, sem salvar", async () => {
    const resposta = await put({ ...valido, shopeeTaxaPercentual: 100 });

    expect(resposta.status).toBe(400);
    expect((await resposta.json()).campos).toHaveProperty("shopeeTaxaPercentual");
    expect(salvarTaxasCanais).not.toHaveBeenCalled();
  });

  it("PUT 400 com margemMinimaPercentual fora de 0-100, sem salvar", async () => {
    const resposta = await put({ ...valido, margemMinimaPercentual: 100 });

    expect(resposta.status).toBe(400);
    expect((await resposta.json()).campos).toHaveProperty("margemMinimaPercentual");
    expect(salvarTaxasCanais).not.toHaveBeenCalled();
  });

  it("PUT 400 com margemDesejadaPercentual negativo, sem salvar", async () => {
    const resposta = await put({ ...valido, margemDesejadaPercentual: -1 });

    expect(resposta.status).toBe(400);
    expect((await resposta.json()).campos).toHaveProperty("margemDesejadaPercentual");
    expect(salvarTaxasCanais).not.toHaveBeenCalled();
  });

  it("PUT aceita margemDesejadaPercentual acima de 100 (sem teto)", async () => {
    salvarTaxasCanais.mockResolvedValue({ ...valido, margemDesejadaPercentual: 300 });
    const resposta = await put({ ...valido, margemDesejadaPercentual: 300 });

    expect(resposta.status).toBe(200);
  });

  it("PUT 400 com corpo inválido", async () => {
    const resposta = await PUT(
      new Request("http://localhost/api/admin/configuracoes/taxas", {
        method: "PUT",
        body: "não é json",
      })
    );
    expect(resposta.status).toBe(400);
  });
});
