import { describe, expect, it } from "vitest";
import { shopeeAvaliacoesClient } from "./shopee";

describe("shopeeAvaliacoesClient (stub)", () => {
  it("lança erro descritivo ao ser chamado, enquanto o app da Shopee não é aprovado", async () => {
    await expect(shopeeAvaliacoesClient.buscarAvaliacoes("SH123")).rejects.toThrow(
      /Shopee Open Platform/
    );
  });
});
