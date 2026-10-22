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
  margemMinimaPercentual: 25,
  margemDesejadaPercentual: 40,
  cupomLojaPercentual: 3,
  cupomLojaTetoCentavos: 500,
  cupomLojaCestaMinimaCentavos: 1000,
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

  it("PUT 400 com margemMinimaPercentual negativa, sem salvar", async () => {
    const resposta = await put({ ...valido, margemMinimaPercentual: -1 });

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

  it("PUT 400 com margemDesejadaPercentual de 100 ou mais (é % do preço)", async () => {
    const resposta = await put({ ...valido, margemDesejadaPercentual: 115 });

    expect(resposta.status).toBe(400);
    expect((await resposta.json()).campos).toHaveProperty("margemDesejadaPercentual");
  });

  it("PUT aceita cupom de loja sem limite (teto null)", async () => {
    salvarTaxasCanais.mockResolvedValue({ ...valido, cupomLojaTetoCentavos: null });
    const resposta = await put({ ...valido, cupomLojaTetoCentavos: null });

    expect(resposta.status).toBe(200);
    expect(salvarTaxasCanais).toHaveBeenCalledWith({ ...valido, cupomLojaTetoCentavos: null });
  });

  it("PUT 400 com cupom de loja inválido, sem salvar", async () => {
    const resposta = await put({ ...valido, cupomLojaPercentual: 100, cupomLojaTetoCentavos: -1 });
    const campos = (await resposta.json()).campos;

    expect(resposta.status).toBe(400);
    expect(campos).toHaveProperty("cupomLojaPercentual");
    expect(campos).toHaveProperty("cupomLojaTetoCentavos");
    expect(salvarTaxasCanais).not.toHaveBeenCalled();
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
