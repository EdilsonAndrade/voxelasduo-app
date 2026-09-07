import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buscarEnderecoPorCep } from "./buscarEnderecoPorCep";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function respostaJson(corpo: unknown, ok = true) {
  return { ok, json: async () => corpo } as Response;
}

describe("buscarEnderecoPorCep", () => {
  it("retorna null para CEP com menos de 8 dígitos", async () => {
    expect(await buscarEnderecoPorCep("123")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("usa o resultado do ViaCEP quando encontra o CEP", async () => {
    fetchMock.mockResolvedValueOnce(
      respostaJson({ logradouro: "Rua A", bairro: "Centro", localidade: "São Paulo", uf: "SP" })
    );

    const resultado = await buscarEnderecoPorCep("01001-000");

    expect(resultado).toEqual({ logradouro: "Rua A", bairro: "Centro", cidade: "São Paulo", estado: "SP" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://viacep.com.br/ws/01001000/json/");
  });

  it("cai para a BrasilAPI quando o ViaCEP responde 'erro: true'", async () => {
    fetchMock
      .mockResolvedValueOnce(respostaJson({ erro: true }))
      .mockResolvedValueOnce(
        respostaJson({ street: "Rua B", neighborhood: "Vila", city: "Campinas", state: "SP" })
      );

    const resultado = await buscarEnderecoPorCep("13000000");

    expect(resultado).toEqual({ logradouro: "Rua B", bairro: "Vila", cidade: "Campinas", estado: "SP" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("cai para a BrasilAPI quando o ViaCEP falha (rede)", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("falha de rede"))
      .mockResolvedValueOnce(
        respostaJson({ street: "Rua C", neighborhood: "Jardim", city: "Sorocaba", state: "SP" })
      );

    const resultado = await buscarEnderecoPorCep("18000000");

    expect(resultado).toEqual({ logradouro: "Rua C", bairro: "Jardim", cidade: "Sorocaba", estado: "SP" });
  });

  it("retorna null quando nenhuma das duas encontra o CEP", async () => {
    fetchMock
      .mockResolvedValueOnce(respostaJson({ erro: true }))
      .mockResolvedValueOnce(respostaJson({}, false));

    expect(await buscarEnderecoPorCep("00000000")).toBeNull();
  });
});
