import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { conjuntosDisponiveis, perdaPermitida, planejarLancamento } from "./lancamento";
import type { Impressao, VinculoArquivoProduto } from "@/lib/models/producao";

const produtoId = new ObjectId();

function vinculo(over: Partial<VinculoArquivoProduto> = {}): VinculoArquivoProduto {
  return {
    nomeArquivo: "peca_unica",
    produtoId,
    parte: "Peça única",
    rendimentoPorPlaca: 6,
    unidadesPorProduto: 1,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...over,
  };
}

function impressao(over: Partial<Impressao> = {}): Impressao {
  return {
    _id: new ObjectId(),
    taskId: Math.random().toString(),
    nomeArquivo: "peca_unica",
    resultado: "concluida",
    inicio: new Date("2026-10-06T10:00:00.000Z"),
    fim: new Date("2026-10-06T14:00:00.000Z"),
    duracaoSegundos: 14400,
    gramas: 720,
    cores: [],
    gramasPorSlot: [],
    historico: false,
    quantidadeLancada: 0,
    quantidadePerdida: 0,
    importadoEm: new Date(),
    ...over,
  };
}

describe("conjuntosDisponiveis", () => {
  it("soma o saldo de placas diferentes da mesma parte", () => {
    const v1 = vinculo({ nomeArquivo: "v1", parte: "Botas", rendimentoPorPlaca: 5 });
    const v2 = vinculo({ nomeArquivo: "v2", parte: "botas", rendimentoPorPlaca: 2 });
    const impressoes = [
      impressao({ nomeArquivo: "v1", resultado: "interrompida" }),
      impressao({ nomeArquivo: "v2" }),
    ];

    expect(conjuntosDisponiveis([v1, v2], impressoes)).toBe(2);
    const plano = planejarLancamento([v1, v2], impressoes, 2)!;
    expect(plano.itens).toHaveLength(1);
    expect(plano.itens[0].impressao.nomeArquivo).toBe("v2");
  });

  it("é o saldo total da parte em produto de peça única", () => {
    expect(conjuntosDisponiveis([vinculo()], [impressao()])).toBe(6);
    expect(conjuntosDisponiveis([vinculo()], [impressao(), impressao()])).toBe(12);
  });

  it("desconta o que já foi lançado e o que virou perda", () => {
    expect(
      conjuntosDisponiveis([vinculo()], [impressao({ quantidadeLancada: 4, quantidadePerdida: 1 })])
    ).toBe(1);
  });

  it("é limitado pela parte com menor saldo em multipartes", () => {
    const base = vinculo({ nomeArquivo: "base", parte: "Base", rendimentoPorPlaca: 10 });
    const tampa = vinculo({ nomeArquivo: "tampa", parte: "Tampa", rendimentoPorPlaca: 4 });

    const disponivel = conjuntosDisponiveis(
      [base, tampa],
      [impressao({ nomeArquivo: "base" }), impressao({ nomeArquivo: "tampa" })]
    );

    expect(disponivel).toBe(4);
  });

  it("divide pelo número de unidades da parte que entram no produto", () => {
    const pes = vinculo({
      nomeArquivo: "pes",
      parte: "Pés",
      rendimentoPorPlaca: 10,
      unidadesPorProduto: 4,
    });

    expect(conjuntosDisponiveis([pes], [impressao({ nomeArquivo: "pes" })])).toBe(2); // 10 ÷ 4
  });

  it("é zero para impressão histórica ou interrompida", () => {
    expect(conjuntosDisponiveis([vinculo()], [impressao({ historico: true })])).toBe(0);
    expect(conjuntosDisponiveis([vinculo()], [impressao({ resultado: "interrompida" })])).toBe(0);
  });

  it("é zero enquanto a impressão ainda está rodando", () => {
    expect(conjuntosDisponiveis([vinculo()], [impressao({ resultado: "em_andamento" })])).toBe(0);
  });

  it("é zero sem vínculo", () => {
    expect(conjuntosDisponiveis([], [impressao()])).toBe(0);
  });
});

describe("planejarLancamento", () => {
  it("consome a impressão mais antiga primeiro (FIFO)", () => {
    const antiga = impressao({ inicio: new Date("2026-10-01T10:00:00.000Z") });
    const nova = impressao({ inicio: new Date("2026-10-07T10:00:00.000Z") });

    const plano = planejarLancamento([vinculo()], [nova, antiga], 4)!;

    expect(plano.itens).toHaveLength(1);
    expect(plano.itens[0].impressao._id).toEqual(antiga._id);
    expect(plano.itens[0].unidades).toBe(4);
  });

  it("distribui entre impressões quando uma não basta", () => {
    const antiga = impressao({ inicio: new Date("2026-10-01T10:00:00.000Z") });
    const nova = impressao({ inicio: new Date("2026-10-07T10:00:00.000Z") });

    const plano = planejarLancamento([vinculo()], [antiga, nova], 8)!;

    expect(plano.itens).toHaveLength(2);
    expect(plano.itens[0].unidades).toBe(6); // esgota a mais antiga
    expect(plano.itens[1].unidades).toBe(2);
  });

  it("consome o saldo de cada parte em multipartes", () => {
    const base = vinculo({ nomeArquivo: "base", parte: "Base", rendimentoPorPlaca: 10 });
    const tampa = vinculo({ nomeArquivo: "tampa", parte: "Tampa", rendimentoPorPlaca: 4 });

    const plano = planejarLancamento(
      [base, tampa],
      [impressao({ nomeArquivo: "base" }), impressao({ nomeArquivo: "tampa" })],
      3
    )!;

    expect(plano.itens.filter((i) => i.parte === "Base")[0].unidades).toBe(3);
    expect(plano.itens.filter((i) => i.parte === "Tampa")[0].unidades).toBe(3);
  });

  it("multiplica pelo número de unidades da parte por produto", () => {
    const pes = vinculo({
      nomeArquivo: "pes",
      parte: "Pés",
      rendimentoPorPlaca: 8,
      unidadesPorProduto: 4,
    });

    const plano = planejarLancamento([pes], [impressao({ nomeArquivo: "pes" })], 2)!;

    expect(plano.itens[0].unidades).toBe(8); // 2 produtos × 4 pés
  });

  it("recusa quantidade acima do saldo", () => {
    expect(planejarLancamento([vinculo()], [impressao()], 7)).toBeNull();
  });

  it("recusa quantidade zero ou negativa", () => {
    expect(planejarLancamento([vinculo()], [impressao()], 0)).toBeNull();
    expect(planejarLancamento([vinculo()], [impressao()], -1)).toBeNull();
  });

  it("recusa produto sem vínculo", () => {
    expect(planejarLancamento([], [impressao()], 1)).toBeNull();
  });

  it("recusa quando a parte mais escassa não cobre o pedido", () => {
    const base = vinculo({ nomeArquivo: "base", parte: "Base", rendimentoPorPlaca: 10 });
    const tampa = vinculo({ nomeArquivo: "tampa", parte: "Tampa", rendimentoPorPlaca: 2 });

    const impressoes = [impressao({ nomeArquivo: "base" }), impressao({ nomeArquivo: "tampa" })];

    expect(planejarLancamento([base, tampa], impressoes, 2)).not.toBeNull();
    expect(planejarLancamento([base, tampa], impressoes, 3)).toBeNull();
  });

  it("leva o rendimento de cada parte no item, para a atualização atômica do saldo", () => {
    const plano = planejarLancamento([vinculo()], [impressao()], 2)!;
    expect(plano.itens[0].rendimentoPorPlaca).toBe(6);
  });
});

describe("perdaPermitida", () => {
  it("é o que sobra do saldo depois da quantidade lançada", () => {
    expect(perdaPermitida(impressao(), vinculo(), 5)).toBe(1);
    expect(perdaPermitida(impressao(), vinculo(), 6)).toBe(0);
  });

  it("nunca é negativa", () => {
    expect(perdaPermitida(impressao({ quantidadeLancada: 5 }), vinculo(), 5)).toBe(0);
  });
});
