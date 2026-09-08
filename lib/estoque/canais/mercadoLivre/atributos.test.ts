import { afterEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";

vi.mock("./auth", () => ({
  obterAccessTokenValido: vi.fn().mockResolvedValue("token-valido"),
}));

const { buscarAtributosObrigatorios, valorPadraoAtributo, atributosEmbalagem } = await import(
  "./atributos"
);

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
  it("monta os 4 atributos de embalagem no formato 'numero unidade' (EDI-96)", () => {
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
