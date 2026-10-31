import { describe, expect, it } from "vitest";
import { validarRomaneio } from "./validation";

const HOJE = "2026-10-31";

type Registro = Record<string, unknown>;
type Corpo = Registro & { lugares: (Registro & { itens: Registro[]; pagamentos: Registro[] })[] };

function corpo(sobrescrever: Registro = {}): Corpo {
  return {
    nome: "Saída 31/10",
    dataSaida: HOJE,
    lugares: [
      {
        id: "l1",
        nome: "Casa do amigo",
        status: "aberto",
        itens: [
          { id: "i1", origem: "produto", origemId: "665f1f77bcf86cd799439011", nome: "Vaso", precoCentavos: 4000, levada: 3 },
          { id: "i2", origem: "livre", nome: "Chaveiro", precoCentavos: 1000, levada: 2, vendida: 1, devolvida: 1 },
        ],
        pagamentos: [{ id: "p1", valorCentavos: 1000, data: HOJE, forma: "pix" }],
      },
    ],
    ...sobrescrever,
  };
}

describe("validarRomaneio", () => {
  it("aceita o romaneio e completa vendida/devolvida com 0", () => {
    const { dados, erro } = validarRomaneio(corpo(), HOJE);
    expect(erro).toBeUndefined();
    expect(dados!.lugares[0].itens[0]).toMatchObject({ vendida: 0, devolvida: 0, origemId: "665f1f77bcf86cd799439011" });
    expect(dados!.lugares[0].itens[1]).not.toHaveProperty("origemId");
  });

  it("recusa vendidas + devolvidas acima das levadas, dizendo o item", () => {
    const c = corpo();
    c.lugares[0].itens[0] = { ...c.lugares[0].itens[0], vendida: 2, devolvida: 2 };
    expect(validarRomaneio(c, HOJE).erro).toMatch(/Casa do amigo, "Vaso".*passam das 3 levadas/);
  });

  it("recusa sem nome, sem lugar, sem itens e data inválida", () => {
    expect(validarRomaneio(corpo({ nome: " " }), HOJE).erro).toMatch(/nome do romaneio/);
    expect(validarRomaneio(corpo({ lugares: [] }), HOJE).erro).toMatch(/ao menos um lugar/);
    expect(validarRomaneio(corpo({ dataSaida: "2026-02-30" }), HOJE).erro).toMatch(/data de saída/);
    const vazio = corpo();
    vazio.lugares[0].itens = [];
    expect(validarRomaneio(vazio, HOJE).erro).toMatch(/ao menos um item/);
  });

  it("produto sem referência válida e forma de pagamento desconhecida", () => {
    const c = corpo();
    c.lugares[0].itens[0] = { ...c.lugares[0].itens[0], origemId: "x" };
    expect(validarRomaneio(c, HOJE).erro).toMatch(/referência da origem/);
    const p = corpo();
    p.lugares[0].pagamentos[0] = { ...p.lugares[0].pagamentos[0], forma: "cheque" };
    expect(validarRomaneio(p, HOJE).erro).toMatch(/forma de pagamento/);
  });

  it("lugar acertado sem data recebe hoje; aberto perde a data", () => {
    const c = corpo();
    c.lugares[0] = { ...c.lugares[0], status: "acertado" };
    expect(validarRomaneio(c, HOJE).dados!.lugares[0].acertadoEm).toBe(HOJE);
    const a = corpo();
    a.lugares[0] = { ...a.lugares[0], acertadoEm: "2026-10-01" };
    expect(validarRomaneio(a, HOJE).dados!.lugares[0]).not.toHaveProperty("acertadoEm");
  });
});
