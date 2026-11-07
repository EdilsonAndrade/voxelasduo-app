import { describe, expect, it } from "vitest";
import {
  custoDaVariacao,
  derivarPrecoEstoque,
  fotoDaVariacao,
  motivoPecaInvalida,
  nomeComVariacao,
  validarVariacoes,
} from "./variacoes";

const valida = {
  nome: "Kit 3 peças",
  pecas: [{ produtoId: "p1", quantidade: 1 }],
  embalagemCentavos: 500,
  preco: 5593,
  precosCanais: { shopee: 7990 },
  estoque: 10,
  foto: "https://f/kit3.jpg",
};

describe("validarVariacoes", () => {
  it("aceita uma variação válida e normaliza", () => {
    const { erros, variacoes } = validarVariacoes([{ ...valida, nome: "  Kit 3 peças " }], ["https://f/kit3.jpg"]);
    expect(erros).toEqual({});
    expect(variacoes[0].nome).toBe("Kit 3 peças");
    expect(variacoes[0].foto).toBe("https://f/kit3.jpg");
    expect(variacoes[0].precosCanais).toEqual({ shopee: 7990 });
  });

  it("recusa nome vazio, sem peças, preço zero e estoque negativo", () => {
    const { erros } = validarVariacoes([{ ...valida, nome: "", pecas: [], preco: 0, estoque: -1 }], []);
    expect(Object.keys(erros).sort()).toEqual([
      "variacoes[0].estoque",
      "variacoes[0].nome",
      "variacoes[0].pecas",
      "variacoes[0].preco",
    ]);
  });

  it("recusa nomes repetidos sem diferenciar maiúsculas", () => {
    const { erros } = validarVariacoes([valida, { ...valida, nome: "KIT 3 PEÇAS" }], []);
    expect(erros["variacoes[1].nome"]).toBeDefined();
  });

  it("soma peças repetidas e descarta foto que não é do produto", () => {
    const { variacoes } = validarVariacoes(
      [{ ...valida, pecas: [{ produtoId: "p1", quantidade: 1 }, { produtoId: "p1", quantidade: 2 }] }],
      []
    );
    expect(variacoes[0].pecas).toEqual([{ produtoId: "p1", quantidade: 3 }]);
    expect(variacoes[0].foto).toBeUndefined();
  });

  it("recusa o próprio produto como peça", () => {
    const { erros } = validarVariacoes([{ ...valida, pecas: [{ produtoId: "eu", quantidade: 1 }] }], [], "eu");
    expect(erros["variacoes[0].pecas"]).toBeDefined();
  });

  it("recusa algo que não é lista", () => {
    expect(validarVariacoes(null, []).erros.variacoes).toBeDefined();
  });
});

describe("derivarPrecoEstoque", () => {
  it("usa o menor preço e a soma dos estoques", () => {
    expect(derivarPrecoEstoque([{ preco: 6993, estoque: 2 }, { preco: 5593, estoque: 3 }])).toEqual({ preco: 5593, estoque: 5 });
  });
  it("sem variações devolve null", () => {
    expect(derivarPrecoEstoque([])).toBeNull();
  });
});

describe("custoDaVariacao", () => {
  it("soma peças × quantidade + embalagem do kit", () => {
    expect(custoDaVariacao([{ quantidade: 2, custoCentavos: 600 }, { quantidade: 1, custoCentavos: 964 }], 500)).toEqual({
      custoCentavos: 2664,
      incompleto: false,
    });
  });
  it("marca incompleto quando falta custo de alguma peça", () => {
    expect(custoDaVariacao([{ quantidade: 1, custoCentavos: null }], 500)).toEqual({ custoCentavos: 500, incompleto: true });
  });
});

describe("apoio", () => {
  it("nomeComVariacao", () => {
    expect(nomeComVariacao("Centro de Mesa", "Kit 4")).toBe("Centro de Mesa — Kit 4");
    expect(nomeComVariacao("Centro de Mesa")).toBe("Centro de Mesa");
  });
  it("fotoDaVariacao cai na primeira foto quando a da variação sumiu", () => {
    expect(fotoDaVariacao({ foto: "x" }, ["a", "b"])).toBe("a");
    expect(fotoDaVariacao({ foto: "b" }, ["a", "b"])).toBe("b");
  });
  it("motivoPecaInvalida", () => {
    expect(motivoPecaInvalida({ kitId: "k" })).not.toBeNull();
    expect(motivoPecaInvalida({ variacoes: [{} as never] })).not.toBeNull();
    expect(motivoPecaInvalida({})).toBeNull();
  });
});
