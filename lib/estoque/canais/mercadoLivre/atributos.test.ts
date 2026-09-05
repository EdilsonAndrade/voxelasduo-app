import { afterEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/lib/models/produto";

vi.mock("./auth", () => ({
  obterAccessTokenValido: vi.fn().mockResolvedValue("token-valido"),
}));

const { buscarAtributosObrigatorios, valorPadraoAtributo } = await import("./atributos");

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
});
