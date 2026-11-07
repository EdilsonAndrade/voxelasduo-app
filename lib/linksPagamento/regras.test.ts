import { describe, expect, it } from "vitest";
import type { OpcaoFrete } from "@/lib/models/frete";
import {
  gerarCodigoLink,
  idempotenciaDoLink,
  opcoesFreteDoLink,
  percentualDesconto,
  precoComDesconto,
  situacaoDoLink,
  totaisDoLink,
  validarLinkEntrada,
} from "./regras";

const ID = "64b7f0c2a1b2c3d4e5f60718";

describe("validarLinkEntrada", () => {
  it("aceita link válido e usa validade padrão", () => {
    const { erros, dados } = validarLinkEntrada({
      clienteNome: " Ana ",
      itens: [{ produtoId: ID, variacaoId: "k3", quantidade: 2, precoCentavos: 4990 }],
      freteGratis: true,
    });
    expect(erros).toEqual({});
    expect(dados).toEqual({
      clienteNome: "Ana",
      itens: [{ produtoId: ID, variacaoId: "k3", quantidade: 2, precoCentavos: 4990 }],
      freteGratis: true,
      validadeDias: 7,
    });
  });

  it("recusa sem itens, preço zero, quantidade inválida e item repetido", () => {
    expect(validarLinkEntrada({ itens: [] }).erros.itens).toBeDefined();
    const { erros } = validarLinkEntrada({
      itens: [
        { produtoId: ID, quantidade: 0, precoCentavos: 0 },
        { produtoId: ID, quantidade: 1, precoCentavos: 100 },
      ],
      validadeDias: 99,
    });
    expect(erros["itens[0].quantidade"]).toBeDefined();
    expect(erros["itens[0].precoCentavos"]).toBeDefined();
    expect(erros["itens[1].produtoId"]).toMatch(/repetido/);
    expect(erros.validadeDias).toBeDefined();
  });
});

describe("descontos", () => {
  it("converte percentual em preço e de volta", () => {
    expect(precoComDesconto(5593, 10)).toBe(5034);
    expect(precoComDesconto(5593, 150)).toBe(0);
    expect(percentualDesconto(10000, 8500)).toBe(15);
  });

  it("soma totais do link", () => {
    expect(
      totaisDoLink([
        { quantidade: 2, precoOriginalCentavos: 5000, precoCentavos: 4500 },
        { quantidade: 1, precoOriginalCentavos: 3000, precoCentavos: 3000 },
      ])
    ).toEqual({ originalCentavos: 13000, totalCentavos: 12000, descontoCentavos: 1000 });
  });
});

describe("situacaoDoLink", () => {
  const agora = new Date("2026-11-07T12:00:00Z");
  const futuro = new Date("2026-11-10T00:00:00Z");
  const passado = new Date("2026-11-01T00:00:00Z");

  it("cobre ativo, vencido, cancelado, aguardando e pago", () => {
    expect(situacaoDoLink({ validoAte: futuro }, null, agora)).toBe("ativo");
    expect(situacaoDoLink({ validoAte: passado }, null, agora)).toBe("vencido");
    expect(situacaoDoLink({ validoAte: futuro, canceladoEm: agora }, null, agora)).toBe("cancelado");
    expect(situacaoDoLink({ validoAte: passado, pedidoId: "x" }, "pendente", agora)).toBe("aguardando_pagamento");
    expect(situacaoDoLink({ validoAte: passado, pedidoId: "x" }, "pago", agora)).toBe("pago");
    expect(situacaoDoLink({ validoAte: futuro, pedidoId: "x" }, "cancelado", agora)).toBe("cancelado");
  });
});

describe("frete e código", () => {
  const opcoes: OpcaoFrete[] = [
    { servico: "pac", rotulo: "PAC", valorCentavos: 1990, origem: "fixo" },
    { servico: "sedex", rotulo: "SEDEX", valorCentavos: 2550, origem: "fixo" },
    { servico: "combinar", rotulo: "Combinar com a loja", valorCentavos: 0, origem: "gratis" },
  ];

  it("zera PAC/SEDEX só com frete grátis", () => {
    expect(opcoesFreteDoLink(opcoes, false)).toBe(opcoes);
    expect(opcoesFreteDoLink(opcoes, true).map((o) => o.valorCentavos)).toEqual([0, 0, 0]);
  });

  it("gera código de 10 caracteres e idempotência por link", () => {
    expect(gerarCodigoLink()).toMatch(/^[a-z2-9]{10}$/);
    expect(idempotenciaDoLink("abc")).toBe("link:abc");
  });
});
