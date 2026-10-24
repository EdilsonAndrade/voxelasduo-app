import { describe, expect, it } from "vitest";
import {
  itensDaApuracao,
  mesclarItens,
  minutosEmHoras,
  ordenarPorTempo,
  totalMinutos,
  totalPecas,
  validarItens,
  type ParteDaApuracao,
} from "./planosImpressao";

describe("ordenarPorTempo", () => {
  const item = (nome: string, minutos: number) => ({ nome, minutos });

  it("ordena as partes pelo tempo e os produtos pelo tempo total, do menor ao maior", () => {
    const resultado = ordenarPorTempo([
      { produtoNome: "Zebra", itens: [item("a", 120), item("b", 30), item("c", 60)] },
      { produtoNome: "Abelha", itens: [item("d", 300)] },
      { produtoNome: "Árvore", itens: [item("e", 45)] },
    ]);
    expect(resultado.map((p) => p.produtoNome)).toEqual(["Árvore", "Zebra", "Abelha"]);
    expect(resultado[1].itens.map((i) => i.nome)).toEqual(["b", "c", "a"]);
  });

  it("empata pelo nome do produto", () => {
    const resultado = ordenarPorTempo([
      { produtoNome: "Boneco", itens: [item("a", 90)] },
      { produtoNome: "Anjo", itens: [item("b", 90)] },
    ]);
    expect(resultado.map((p) => p.produtoNome)).toEqual(["Anjo", "Boneco"]);
  });
});

describe("validarItens", () => {
  it("aceita partes, gera id quando falta e descarta início vazio", () => {
    const { itens, erro } = validarItens([
      { nome: " corpo ", minutos: 602, inicio: "22:00" },
      { id: "x1", nome: "base", minutos: 222, inicio: "" },
    ]);
    expect(erro).toBeUndefined();
    expect(itens![0]).toMatchObject({ nome: "corpo", minutos: 602, quantidade: 1, inicio: "22:00" });
    expect(itens![0].id).toEqual(expect.any(String));
    expect(itens![1]).toEqual({ id: "x1", nome: "base", minutos: 222, quantidade: 1 });
  });

  it("aceita a quantidade de peças da placa e recusa zero ou fracionada", () => {
    expect(validarItens([{ nome: "botas", minutos: 144, quantidade: 5 }]).itens![0].quantidade).toBe(5);
    expect(validarItens([{ nome: "botas", minutos: 144, quantidade: 0 }]).erro).toMatch(/quantidade/);
    expect(validarItens([{ nome: "botas", minutos: 144, quantidade: 1.5 }]).erro).toMatch(/quantidade/);
  });

  it("recusa lista vazia", () => {
    expect(validarItens([]).erro).toBeDefined();
    expect(validarItens(null).erro).toBeDefined();
  });

  it("recusa nome vazio, tempo zero, fracionado ou negativo", () => {
    expect(validarItens([{ nome: " ", minutos: 10 }]).erro).toMatch(/nome/);
    expect(validarItens([{ nome: "a", minutos: 0 }]).erro).toMatch(/maior que zero/);
    expect(validarItens([{ nome: "a", minutos: -5 }]).erro).toMatch(/maior que zero/);
    expect(validarItens([{ nome: "a", minutos: 1.5 }]).erro).toMatch(/maior que zero/);
  });

  it("recusa nome repetido ignorando maiúsculas e espaços", () => {
    expect(validarItens([{ nome: "Base", minutos: 10 }, { nome: " base", minutos: 20 }]).erro).toMatch(/repetida/);
  });

  it("recusa horário inválido", () => {
    expect(validarItens([{ nome: "a", minutos: 10, inicio: "24:00" }]).erro).toMatch(/HH:MM/);
  });
});

describe("mesclarItens", () => {
  const atuais = [
    { id: "1", nome: "Base", minutos: 240, inicio: "06:00" },
    { id: "2", nome: "corpo", minutos: 600 },
  ];

  it("atualiza o tempo pelo nome mantendo id e início, acrescenta novas e mantém as demais", () => {
    const resultado = mesclarItens(atuais, [
      { id: "n1", nome: " base ", minutos: 222, quantidade: 4 },
      { id: "n2", nome: "tampa", minutos: 30 },
    ]);
    expect(resultado).toEqual([
      { id: "1", nome: "Base", minutos: 222, quantidade: 4, inicio: "06:00" },
      { id: "2", nome: "corpo", minutos: 600 },
      { id: "n2", nome: "tampa", minutos: 30 },
    ]);
    expect(atuais[0].minutos).toBe(240);
  });
});

describe("totalMinutos / minutosEmHoras / totalPecas", () => {
  it("soma e formata", () => {
    expect(totalPecas([{ quantidade: 4 }, { quantidade: 5 }, {}])).toBe(10);
    expect(totalMinutos([{ minutos: 602 }, { minutos: 222 }])).toBe(824);
    expect(minutosEmHoras(824)).toBe("13h44");
    expect(minutosEmHoras(17)).toBe("0h17");
  });
});

describe("itensDaApuracao", () => {
  const impressao = (
    id: string,
    inicio: string,
    duracaoSegundos: number | undefined,
    extra: Partial<ParteDaApuracao["impressoes"][number]> = {}
  ) => ({ id, inicio, duracaoSegundos, resultado: "concluida" as const, foraDoCusto: false, ...extra });

  it("usa a impressão marcada mais recente de cada parte", () => {
    const partes: ParteDaApuracao[] = [
      {
        parte: "chaminé",
        impressoes: [
          impressao("a", "2026-10-05T22:41:00Z", 36000),
          impressao("b", "2026-10-06T22:41:00Z", 36120, { rendimentoPorPlaca: 4 }),
        ],
      },
      { parte: "gift", impressoes: [impressao("c", "2026-10-07T11:15:00Z", 1001)] },
    ];
    expect(itensDaApuracao(partes)).toEqual([
      { nome: "chaminé", minutos: 602, quantidade: 4 },
      { nome: "gift", minutos: 17, quantidade: 1 },
    ]);
  });

  it("ignora desmarcadas, falhas, em andamento e sem duração", () => {
    const partes: ParteDaApuracao[] = [
      {
        parte: "base",
        impressoes: [
          impressao("a", "2026-10-05T10:00:00Z", 3600, { foraDoCusto: true }),
          impressao("b", "2026-10-05T11:00:00Z", 3600, { resultado: "interrompida" }),
          impressao("c", "2026-10-05T12:00:00Z", 3600, { resultado: "em_andamento" }),
          impressao("d", "2026-10-05T13:00:00Z", undefined),
        ],
      },
    ];
    expect(itensDaApuracao(partes)).toEqual([]);
  });

  it("respeita a marcação local passada pela tela", () => {
    const partes: ParteDaApuracao[] = [
      { parte: "base", impressoes: [impressao("a", "2026-10-05T10:00:00Z", 3600, { foraDoCusto: true })] },
    ];
    expect(itensDaApuracao(partes, () => false)).toEqual([{ nome: "base", minutos: 60, quantidade: 1 }]);
  });
});
