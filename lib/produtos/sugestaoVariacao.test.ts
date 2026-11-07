import { describe, expect, it } from "vitest";
import { TAXAS_CANAIS_PADRAO } from "@/lib/models/configuracao";
import { sugerirPrecosVariacao, sugerirShopee } from "./sugestaoVariacao";
import { configSugestaoVariacao } from "./sugestaoVariacaoConfig";

const config = configSugestaoVariacao({
  ...TAXAS_CANAIS_PADRAO,
  margemMinimaPercentual: 25,
  margemDesejadaPercentual: 30,
  cupomLojaPercentual: 3,
  cupomLojaTetoCentavos: null,
});

describe("sugerirShopee", () => {
  it("kit de R$ 34,38 com 30% + cupom 3%: cheio R$ 105,90, cliente paga R$ 70,95 com 25% de lucro", () => {
    const s = sugerirShopee(3438, 30, config)!;
    expect(s.cheioCentavos).toBe(10590);
    expect(s.pagoCentavos).toBe(7095);
    expect(s.margemPercentual).toBeGreaterThanOrEqual(25);
    expect(s.acimaDe80).toBe(false);
  });

  it("kit caro passa da faixa de R$ 80 e ainda garante o piso", () => {
    const s = sugerirShopee(5260, 30, config)!;
    expect(s.cheioCentavos % 100).toBe(90);
    expect(s.acimaDe80).toBe(true);
    expect(s.margemPercentual).toBeGreaterThanOrEqual(25);
  });

  it("sem desconto possível devolve null", () => {
    expect(sugerirShopee(3438, 95, config)).toBeNull();
    expect(sugerirShopee(0, 30, config)).toBeNull();
  });
});

describe("sugerirPrecosVariacao", () => {
  it("site e Mercado Livre pela margem desejada, terminando em ,90", () => {
    const s = sugerirPrecosVariacao(3438, 30, config);
    expect(s.siteCentavos! % 100).toBe(90);
    expect(s.mercadoLivreCentavos! % 100).toBe(90);
    // Site: lucro ≥ 30% depois da taxa de 4,99%.
    const taxa = Math.round((s.siteCentavos! * 4.99) / 100);
    expect((s.siteCentavos! - taxa - 3438) / s.siteCentavos!).toBeGreaterThanOrEqual(0.3);
  });
});
