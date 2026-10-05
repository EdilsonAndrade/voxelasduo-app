import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { apurarProduto, camposParaAplicar, saldoLancavel } from "./apuracao";
import type { CustoProducao, Produto } from "@/lib/models/produto";
import type { Impressao, VinculoArquivoProduto } from "@/lib/models/producao";

// Mesmo cenário de referência do custo cadastrado (EDI-92): COGS R$ 29,95.
const custoCadastro: CustoProducao = {
  pesoPecaGramas: 120,
  tempoImpressaoHoras: 4.5,
  tempoMaoDeObraHoras: 0.25,
  precoCarreteCentavos: 10000,
  pesoCarreteGramas: 1000,
  margemPerdaPercentual: 10,
  precoImpressoraCentavos: 457000,
  vidaUtilImpressoraHoras: 4000,
  consumoEletricoKwh: 0.15,
  tarifaEnergiaCentavos: 90,
  valorHoraTrabalhoCentavos: 3000,
  custoEmbalagemCentavos: 350,
};

const produtoId = new ObjectId();

function produto(custoProducao: CustoProducao | undefined = custoCadastro): Produto {
  return {
    _id: produtoId,
    nome: "Vaso Espiral 15cm",
    slug: "vaso-espiral-15cm",
    descricao: "...",
    preco: 9990,
    fotos: [],
    estoque: 2,
    categoria: "decoracao",
    custoProducao,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  } as Produto;
}

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
    fim: new Date("2026-10-06T14:30:00.000Z"),
    duracaoSegundos: 4.5 * 3600,
    gramas: 720, // 6 peças de 120g
    cores: [],
    gramasPorSlot: [],
    historico: false,
    quantidadeLancada: 0,
    quantidadePerdida: 0,
    importadoEm: new Date(),
    ...over,
  };
}

describe("peça única", () => {
  it("divide gramas e horas da placa pelo rendimento declarado", () => {
    const a = apurarProduto(produto(), [vinculo()], [impressao()]);

    expect(a.partes[0].gramasPorUnidade).toBe(120); // 720g ÷ 6
    expect(a.partes[0].horasPorUnidade).toBeCloseTo(0.75, 5); // 4,5h ÷ 6
    expect(a.unidadesAcabadas).toBe(6);
    expect(a.gramasPorPeca).toBe(120);
  });

  it("não aplica a margem de perda do cadastro sobre o peso real (não conta perda duas vezes)", () => {
    const a = apurarProduto(produto(), [vinculo()], [impressao()]);

    // Filamento apurado: 120g × R$0,10/g = R$ 12,00 — sem os 10% do cadastro.
    // Cadastrado: R$ 13,20 (com os 10%).
    expect(a.custoCadastradoCentavos).toBe(2995);
    expect(a.custoApuradoCentavos).toBeLessThan(a.custoCadastradoCentavos!);
  });

  it("soma mão de obra e embalagem uma única vez", () => {
    const a = apurarProduto(produto(), [vinculo()], [impressao()]);
    const parte = a.partes[0].custoParteCentavos!;

    // 0,25h × R$30 = 750 + embalagem 350 = 1100 por produto acabado.
    expect(a.custoApuradoCentavos).toBe(parte + 1100);
  });

  it("devolve a diferença entre apurado e cadastrado", () => {
    const a = apurarProduto(produto(), [vinculo()], [impressao()]);
    expect(a.diferencaCentavos).toBe(a.custoApuradoCentavos! - a.custoCadastradoCentavos!);
  });
});

describe("multipartes", () => {
  const base = vinculo({ nomeArquivo: "vaso_base", parte: "Base", rendimentoPorPlaca: 5 });
  const tampa = vinculo({ nomeArquivo: "vaso_tampa", parte: "Tampa", rendimentoPorPlaca: 2 });

  it("limita as unidades acabadas pela parte mais escassa", () => {
    const a = apurarProduto(
      produto(),
      [base, tampa],
      [
        impressao({ nomeArquivo: "vaso_base", gramas: 500 }),
        impressao({ nomeArquivo: "vaso_base", gramas: 500 }), // 10 bases
        impressao({ nomeArquivo: "vaso_tampa", gramas: 200 }), // 2 tampas
      ]
    );

    expect(a.partes.find((p) => p.parte === "Base")!.unidadesProduzidas).toBe(10);
    expect(a.partes.find((p) => p.parte === "Tampa")!.unidadesProduzidas).toBe(2);
    expect(a.unidadesAcabadas).toBe(2);
  });

  it("mostra o excedente da parte que sobrou como produção adiantada", () => {
    const a = apurarProduto(
      produto(),
      [base, tampa],
      [
        impressao({ nomeArquivo: "vaso_base", gramas: 500 }),
        impressao({ nomeArquivo: "vaso_base", gramas: 500 }),
        impressao({ nomeArquivo: "vaso_tampa", gramas: 200 }),
      ]
    );

    expect(a.partes.find((p) => p.parte === "Base")!.excedente).toBe(8);
    expect(a.partes.find((p) => p.parte === "Tampa")!.excedente).toBe(0);
  });

  it("soma o custo das partes, mas embalagem e mão de obra só uma vez", () => {
    const a = apurarProduto(
      produto(),
      [base, tampa],
      [
        impressao({ nomeArquivo: "vaso_base", gramas: 500 }),
        impressao({ nomeArquivo: "vaso_tampa", gramas: 200 }),
      ]
    );

    const soma = a.partes.reduce(
      (total, p) => total + p.custoParteCentavos! * p.unidadesPorProduto,
      0
    );
    expect(a.custoApuradoCentavos).toBe(soma + 1100); // 1100 = mão de obra + embalagem
  });

  it("respeita unidadesPorProduto maior que 1 (ex: 4 pés por produto)", () => {
    const pes = vinculo({
      nomeArquivo: "pes",
      parte: "Pés",
      rendimentoPorPlaca: 8,
      unidadesPorProduto: 4,
    });
    const corpo = vinculo({ nomeArquivo: "corpo", parte: "Corpo", rendimentoPorPlaca: 1 });

    const a = apurarProduto(
      produto(),
      [pes, corpo],
      [
        impressao({ nomeArquivo: "pes", gramas: 80 }), // 8 pés = 2 produtos
        impressao({ nomeArquivo: "corpo", gramas: 200 }),
        impressao({ nomeArquivo: "corpo", gramas: 200 }), // 2 corpos
      ]
    );

    expect(a.unidadesAcabadas).toBe(2);
    expect(a.gramasPorPeca).toBe(10 * 4 + 200); // 4 pés de 10g + corpo de 200g
  });

  it("marca como parcial e nomeia a parte sem produção, sem inventar custo", () => {
    const a = apurarProduto(
      produto(),
      [base, tampa],
      [impressao({ nomeArquivo: "vaso_base", gramas: 500 })]
    );

    expect(a.parcial).toBe(true);
    expect(a.partesSemDados).toEqual(["Tampa"]);
    expect(a.custoApuradoCentavos).toBeUndefined();
    expect(a.gramasPorPeca).toBeUndefined();
    expect(a.unidadesAcabadas).toBe(0);
  });
});

describe("impressões que não contam como peça", () => {
  it("interrompida não produz unidade nem entra no custo", () => {
    const a = apurarProduto(
      produto(),
      [vinculo()],
      [impressao(), impressao({ resultado: "interrompida", gramas: 300 })]
    );

    expect(a.unidadesAcabadas).toBe(6); // só a concluída
    expect(a.partes[0].impressoesInterrompidas).toBe(1);
    expect(a.gramasPorPeca).toBe(120); // os 300g da falha não entram na média
  });

  it("impressão sem gramas é ignorada na média de peso", () => {
    const a = apurarProduto(
      produto(),
      [vinculo()],
      [impressao(), impressao({ gramas: undefined })]
    );

    expect(a.gramasPorPeca).toBe(120);
    expect(a.unidadesAcabadas).toBe(12); // continua contando como produção
  });

  it("impressão em andamento não conta como peça nem como falha", () => {
    const a = apurarProduto(
      produto(),
      [vinculo()],
      [impressao(), impressao({ resultado: "em_andamento", gramas: 400 })]
    );

    expect(a.unidadesAcabadas).toBe(6); // só a concluída
    expect(a.amostra).toBe(1); // a que ainda roda fica fora da amostra
    expect(a.taxaFalhaObservada).toBe(0);
    expect(a.gramasPerdidosEmFalhas).toBe(0);
  });

  it("produto sem custo cadastrado não tem custo apurado, mas tem produção", () => {
    const semCusto = { ...produto(), custoProducao: undefined } as Produto;
    const a = apurarProduto(semCusto, [vinculo()], [impressao()]);

    expect(a.semCustoCadastrado).toBe(true);
    expect(a.custoApuradoCentavos).toBeUndefined();
    expect(a.custoCadastradoCentavos).toBeUndefined();
    expect(a.unidadesAcabadas).toBe(6);
  });

  it("produto sem nenhuma impressão não apresenta número apurado", () => {
    const a = apurarProduto(produto(), [vinculo()], []);

    expect(a.unidadesAcabadas).toBe(0);
    expect(a.custoApuradoCentavos).toBeUndefined();
    expect(a.gramasPorPeca).toBeUndefined();
    expect(a.taxaFalhaObservada).toBeUndefined();
    expect(a.parcial).toBe(true);
  });
});

describe("indicadores de falha e perda", () => {
  it("calcula a taxa de falha observada e sinaliza amostra pequena", () => {
    const a = apurarProduto(
      produto(),
      [vinculo()],
      [impressao(), impressao(), impressao({ resultado: "interrompida", gramas: 100 })]
    );

    expect(a.taxaFalhaObservada).toBeCloseTo(1 / 3, 5);
    expect(a.amostra).toBe(3);
    expect(a.amostraPequena).toBe(true);
  });

  it("com amostra suficiente não sinaliza amostra pequena", () => {
    const impressoes = Array.from({ length: 12 }, () => impressao());
    const a = apurarProduto(produto(), [vinculo()], impressoes);

    expect(a.amostra).toBe(12);
    expect(a.amostraPequena).toBe(false);
  });

  it("calcula a perda observada sobre o peso cadastrado", () => {
    // 780g na placa ÷ 6 = 130g por peça, contra 120g cadastrados → +8,33%
    const a = apurarProduto(produto(), [vinculo()], [impressao({ gramas: 780 })]);

    expect(a.perdaObservadaPercentual).toBeCloseTo(8.333, 2);
  });

  it("perda negativa (consumo menor que o cadastrado) aparece como tal", () => {
    const a = apurarProduto(produto(), [vinculo()], [impressao({ gramas: 660 })]); // 110g/peça

    expect(a.perdaObservadaPercentual).toBeCloseTo(-8.333, 2);
  });

  it("sem peso cadastrado não calcula perda", () => {
    const a = apurarProduto(
      produto({ ...custoCadastro, pesoPecaGramas: 0 }),
      [vinculo()],
      [impressao()]
    );

    expect(a.perdaObservadaPercentual).toBeUndefined();
  });

  it("soma gramas e reais perdidos nas impressões que falharam", () => {
    const a = apurarProduto(
      produto(),
      [vinculo()],
      [impressao(), impressao({ resultado: "interrompida", gramas: 250 })]
    );

    expect(a.gramasPerdidosEmFalhas).toBe(250);
    expect(a.valorPerdidoEmFalhasCentavos).toBe(2500); // 250g × R$0,10/g
  });
});

describe("saldoLancavel", () => {
  it("é o rendimento quando nada foi lançado", () => {
    expect(saldoLancavel(impressao(), vinculo())).toBe(6);
  });

  it("desconta o que já foi lançado e o que foi declarado como perda", () => {
    expect(saldoLancavel(impressao({ quantidadeLancada: 4, quantidadePerdida: 1 }), vinculo())).toBe(1);
  });

  it("é zero em impressão histórica, interrompida ou sem vínculo", () => {
    expect(saldoLancavel(impressao({ historico: true }), vinculo())).toBe(0);
    expect(saldoLancavel(impressao({ resultado: "interrompida" }), vinculo())).toBe(0);
    expect(saldoLancavel(impressao(), null)).toBe(0);
  });

  it("nunca é negativo", () => {
    expect(saldoLancavel(impressao({ quantidadeLancada: 9 }), vinculo())).toBe(0);
  });
});

describe("conjuntos lançáveis", () => {
  it("em multipartes é limitado pela parte com menor saldo", () => {
    const base = vinculo({ nomeArquivo: "vaso_base", parte: "Base", rendimentoPorPlaca: 10 });
    const tampa = vinculo({ nomeArquivo: "vaso_tampa", parte: "Tampa", rendimentoPorPlaca: 4 });

    const a = apurarProduto(
      produto(),
      [base, tampa],
      [
        impressao({ nomeArquivo: "vaso_base", gramas: 1000 }),
        impressao({ nomeArquivo: "vaso_tampa", gramas: 400 }),
      ]
    );

    expect(a.conjuntosLancaveis).toBe(4);
  });

  it("não oferece conjunto quando uma das partes é só histórico", () => {
    const base = vinculo({ nomeArquivo: "vaso_base", parte: "Base", rendimentoPorPlaca: 10 });
    const tampa = vinculo({ nomeArquivo: "vaso_tampa", parte: "Tampa", rendimentoPorPlaca: 4 });

    const a = apurarProduto(
      produto(),
      [base, tampa],
      [
        impressao({ nomeArquivo: "vaso_base", gramas: 1000 }),
        impressao({ nomeArquivo: "vaso_tampa", gramas: 400, historico: true }),
      ]
    );

    expect(a.conjuntosLancaveis).toBe(0);
  });
});

describe("camposParaAplicar", () => {
  it("devolve peso, tempo e taxa de falha apurados", () => {
    const impressoes = Array.from({ length: 11 }, () => impressao());
    impressoes.push(impressao({ resultado: "interrompida", gramas: 100 }));
    const a = apurarProduto(produto(), [vinculo()], impressoes);

    const campos = camposParaAplicar(a);

    expect(campos.pesoPecaGramas).toBe(120);
    expect(campos.tempoImpressaoHoras).toBe(0.75);
    expect(campos.taxaFalhaPercentual).toBeCloseTo(8.3, 1);
  });

  it("não aplica taxa de falha de amostra pequena", () => {
    const a = apurarProduto(produto(), [vinculo()], [impressao()]);
    expect(camposParaAplicar(a).taxaFalhaPercentual).toBeUndefined();
  });

  it("não sobrescreve campo que não foi apurado", () => {
    const a = apurarProduto(produto(), [vinculo()], [impressao({ gramas: undefined, duracaoSegundos: undefined })]);
    expect(camposParaAplicar(a)).toEqual({});
  });
});
