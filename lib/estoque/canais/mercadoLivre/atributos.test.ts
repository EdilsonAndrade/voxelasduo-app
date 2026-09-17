import { afterEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";

vi.mock("./auth", () => ({
  obterAccessTokenValido: vi.fn().mockResolvedValue("token-valido"),
}));

const {
  buscarAtributosObrigatorios,
  buscarAtributosCategoria,
  valorPadraoAtributo,
  atributosEmbalagem,
  atributosFichaTecnica,
} = await import("./atributos");

const produtoBase: Produto = {
  _id: undefined,
  nome: "Chaveiro VoXElas Duo",
  slug: "chaveiro",
  descricao: "Chaveiro ima decorativo",
  preco: 1990,
  fotos: ["https://exemplo.com/foto.jpg"],
  estoque: 2,
  categoria: "decoracao",
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

describe("buscarAtributosObrigatorios", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retorna só os atributos marcados como obrigatórios", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { id: "BRAND", value_type: "list", tags: { required: true }, values: [] },
          { id: "COLOR", value_type: "list", tags: {}, values: [] },
        ],
      })
    );

    const atributos = await buscarAtributosObrigatorios("MLB12345");

    expect(atributos).toHaveLength(1);
    expect(atributos[0].id).toBe("BRAND");
  });

  it("lança erro quando a API responde com falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "" }));
    await expect(buscarAtributosObrigatorios("MLB12345")).rejects.toThrow("HTTP 500");
  });
});

describe("buscarAtributosCategoria", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retorna todos os atributos da categoria, obrigatórios e opcionais (reaproveitado por atributosFichaTecnica)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { id: "BRAND", value_type: "list", tags: { required: true }, values: [] },
          { id: "HEIGHT", value_type: "number_unit", tags: {} },
        ],
      })
    );

    const atributos = await buscarAtributosCategoria("MLB12345");

    expect(atributos).toHaveLength(2);
  });

  it("lança erro quando a API responde com falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "" }));
    await expect(buscarAtributosCategoria("MLB12345")).rejects.toThrow("HTTP 500");
  });
});

describe("valorPadraoAtributo", () => {
  it("lista com opção genérica: usa o value_id da opção genérica", () => {
    const valor = valorPadraoAtributo(
      {
        id: "BRAND",
        value_type: "list",
        values: [
          { id: "123", name: "Nike" },
          { id: "999", name: "Genérica" },
        ],
      },
      produtoBase
    );

    expect(valor).toEqual({ id: "BRAND", value_id: "999" });
  });

  it("lista sem opção genérica: usa a primeira opção da lista", () => {
    const valor = valorPadraoAtributo(
      { id: "BRAND", value_type: "list", values: [{ id: "123", name: "Nike" }] },
      produtoBase
    );

    expect(valor).toEqual({ id: "BRAND", value_id: "123" });
  });

  it("atributo de texto livre: usa o nome do produto", () => {
    const valor = valorPadraoAtributo({ id: "MODEL", value_type: "string" }, produtoBase);

    expect(valor).toEqual({ id: "MODEL", value_name: "Chaveiro VoXElas Duo" });
  });

  it("BRAND de texto livre: usa um valor genérico, não o nome do produto (EDI-95)", () => {
    const valor = valorPadraoAtributo({ id: "BRAND", value_type: "string" }, produtoBase);

    expect(valor).toEqual({ id: "BRAND", value_name: "Genérica" });
    expect(valor.value_name).not.toBe(produtoBase.nome);
  });

  it("BRAND e MODEL de texto livre nunca saem com o mesmo valor (EDI-95)", () => {
    const marca = valorPadraoAtributo({ id: "BRAND", value_type: "string" }, produtoBase);
    const modelo = valorPadraoAtributo({ id: "MODEL", value_type: "string" }, produtoBase);

    expect(marca.value_name).not.toBe(modelo.value_name);
  });
});

describe("atributosEmbalagem", () => {
  it("monta os 4 atributos com a unidade junto do valor — sem unidade o Mercado Livre descarta o atributo silenciosamente (EDI-96, confirmado em produção)", () => {
    const atributos = atributosEmbalagem({
      pesoGramas: 250,
      alturaCm: 10,
      larguraCm: 15,
      comprimentoCm: 20,
    });

    expect(atributos).toEqual([
      { id: "SELLER_PACKAGE_WEIGHT", value_name: "250 g" },
      { id: "SELLER_PACKAGE_HEIGHT", value_name: "10 cm" },
      { id: "SELLER_PACKAGE_WIDTH", value_name: "15 cm" },
      { id: "SELLER_PACKAGE_LENGTH", value_name: "20 cm" },
    ]);
  });
});

describe("atributosFichaTecnica", () => {
  const categoriaCompleta = [
    { id: "HEIGHT", value_type: "number_unit", tags: {} },
    { id: "WIDTH", value_type: "number_unit", tags: {} },
    { id: "LENGTH", value_type: "number_unit", tags: {} },
    { id: "WEIGHT", value_type: "number_unit", tags: {} },
    { id: "MATERIAL", value_type: "string", tags: {} },
  ];

  it("inclui cada campo preenchido como atributo quando a categoria expõe o atributo correspondente", () => {
    const resultado = atributosFichaTecnica(
      { alturaCm: 20, larguraCm: 15, comprimentoCm: 10, pesoGramas: 250, material: "PLA" },
      categoriaCompleta
    );

    expect(resultado.attributes).toEqual(
      expect.arrayContaining([
        { id: "HEIGHT", value_name: "20 cm" },
        { id: "WIDTH", value_name: "15 cm" },
        { id: "LENGTH", value_name: "10 cm" },
        { id: "WEIGHT", value_name: "250 g" },
        { id: "MATERIAL", value_name: "PLA" },
      ])
    );
    expect(resultado.paraDescricao).toEqual([]);
  });

  it("MATERIAL aceita texto livre mesmo fora da lista de sugestões da categoria", () => {
    const resultado = atributosFichaTecnica(
      { material: "PLA (impressão 3D)" },
      [{ id: "MATERIAL", value_type: "string", tags: {}, values: [{ id: "1", name: "Madeira" }] }]
    );

    expect(resultado.attributes).toEqual([{ id: "MATERIAL", value_name: "PLA (impressão 3D)" }]);
  });

  it("campo preenchido sem atributo correspondente na categoria vai para paraDescricao", () => {
    const resultado = atributosFichaTecnica(
      { pesoGramas: 250, material: "PLA" },
      [{ id: "HEIGHT", value_type: "number_unit", tags: {} }] // categoria sem WEIGHT nem MATERIAL
    );

    expect(resultado.attributes).toEqual([]);
    expect(resultado.paraDescricao).toEqual(
      expect.arrayContaining([
        { rotulo: "Peso", valor: "250 g" },
        { rotulo: "Material", valor: "PLA" },
      ])
    );
  });

  it("itensInclusos sempre vai para paraDescricao, mesmo com a categoria completa", () => {
    const resultado = atributosFichaTecnica(
      { itensInclusos: ["1 vaso", "1 prato"] },
      categoriaCompleta
    );

    expect(resultado.attributes).toEqual([]);
    expect(resultado.paraDescricao).toEqual([
      { rotulo: "Itens inclusos", valor: "1 vaso, 1 prato" },
    ]);
  });

  it("ficha técnica vazia: nenhum atributo e nenhum texto para descrição", () => {
    const resultado = atributosFichaTecnica({}, categoriaCompleta);

    expect(resultado.attributes).toEqual([]);
    expect(resultado.paraDescricao).toEqual([]);
  });
});
