import { describe, expect, it, vi } from "vitest";
import { criarGarantiaDeIndices } from "./indices";

describe("criarGarantiaDeIndices", () => {
  it("cria os índices uma única vez quando dá certo", async () => {
    const garantir = criarGarantiaDeIndices();
    const criar = vi.fn().mockResolvedValue(["ok"]);

    await garantir(criar);
    await garantir(criar);

    expect(criar).toHaveBeenCalledTimes(1);
  });

  it("não guarda a falha: propaga o erro e tenta de novo na próxima chamada", async () => {
    const garantir = criarGarantiaDeIndices();
    const criar = vi
      .fn()
      .mockRejectedValueOnce(new Error("not primary"))
      .mockResolvedValueOnce(["ok"]);

    await expect(garantir(criar)).rejects.toThrow("not primary");
    await expect(garantir(criar)).resolves.toBeUndefined();
    await garantir(criar);

    expect(criar).toHaveBeenCalledTimes(2);
  });

  it("chamadas simultâneas compartilham a mesma criação", async () => {
    const garantir = criarGarantiaDeIndices();
    const criar = vi.fn().mockResolvedValue(["ok"]);

    await Promise.all([garantir(criar), garantir(criar)]);

    expect(criar).toHaveBeenCalledTimes(1);
  });
});
