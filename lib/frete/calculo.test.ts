import { describe, expect, it, vi } from "vitest";
import { FRETE_PADRAO } from "@/lib/models/frete";
import type { EmbalagemEnvio } from "@/lib/models/produto";
import { calcularOpcoesFrete, resolverFretePedido } from "./calculo";

const caixa: EmbalagemEnvio = { pesoGramas: 300, alturaCm: 10, larguraCm: 10, comprimentoCm: 15 };

describe("calcularOpcoesFrete", () => {
  it("sem calculadora usa os valores fixos e combinar grátis", async () => {
    const opcoes = await calcularOpcoesFrete({ config: FRETE_PADRAO });
    expect(opcoes).toEqual([
      { servico: "pac", rotulo: "PAC", valorCentavos: 1990, origem: "fixo" },
      { servico: "sedex", rotulo: "SEDEX", valorCentavos: 2550, origem: "fixo" },
      { servico: "combinar", rotulo: "Combinar com a loja", valorCentavos: 0, origem: "gratis" },
    ]);
  });

  it("usa o valor calculado quando todos os itens têm embalagem", async () => {
    const calculadora = vi.fn(async ({ servico }: { servico: string }) => (servico === "pac" ? 1500 : 2200));
    const opcoes = await calcularOpcoesFrete({
      config: FRETE_PADRAO,
      cep: "01001-000",
      pacotes: [caixa, caixa],
      calculadora,
    });
    expect(opcoes[0]).toMatchObject({ valorCentavos: 1500, origem: "calculado" });
    expect(opcoes[1]).toMatchObject({ valorCentavos: 2200, origem: "calculado" });
    expect(calculadora).toHaveBeenCalledWith(expect.objectContaining({ cep: "01001000" }));
  });

  it("cai no valor fixo quando algum item não tem embalagem", async () => {
    const calculadora = vi.fn(async () => 1000);
    const opcoes = await calcularOpcoesFrete({
      config: FRETE_PADRAO,
      cep: "01001000",
      pacotes: [caixa, undefined],
      calculadora,
    });
    expect(calculadora).not.toHaveBeenCalled();
    expect(opcoes[1]).toMatchObject({ valorCentavos: 2550, origem: "fixo" });
  });

  it("cai no valor fixo quando a calculadora devolve null ou falha", async () => {
    const opcoes = await calcularOpcoesFrete({
      config: FRETE_PADRAO,
      cep: "01001000",
      pacotes: [caixa],
      calculadora: async ({ servico }) => {
        if (servico === "pac") return null;
        throw new Error("indisponível");
      },
    });
    expect(opcoes[0]).toMatchObject({ valorCentavos: 1990, origem: "fixo" });
    expect(opcoes[1]).toMatchObject({ valorCentavos: 2550, origem: "fixo" });
  });

  it("respeita a configuração salva", async () => {
    const opcoes = await calcularOpcoesFrete({ config: { pacCentavos: 0, sedexCentavos: 2800 } });
    expect(opcoes[0].valorCentavos).toBe(0);
    expect(opcoes[1].valorCentavos).toBe(2800);
  });
});

describe("resolverFretePedido", () => {
  it("devolve o frete do serviço escolhido", async () => {
    const opcoes = await calcularOpcoesFrete({ config: FRETE_PADRAO });
    expect(resolverFretePedido("sedex", opcoes)).toEqual({ servico: "sedex", valorCentavos: 2550, origem: "fixo" });
  });

  it("devolve null para serviço fora das opções", () => {
    expect(resolverFretePedido("pac", [])).toBeNull();
  });
});
