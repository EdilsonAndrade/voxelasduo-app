import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { TAXAS_CANAIS_PADRAO } from "@/lib/models/configuracao";
import { resolverTaxasCanais } from "@/lib/produtos/canais";
import {
  margensAntigasDoProduto,
  migrarMargensParaPreco,
  sugerirMargemPreco,
  type ColecoesMigracaoMargens,
} from "./migracaoMargens";

function colecoes(produtos: Array<{ _id: ObjectId; taxasCanais?: Record<string, number> }>) {
  const updateOne = vi.fn().mockResolvedValue({});
  const bulkWrite = vi.fn().mockResolvedValue({});
  const find = vi.fn().mockReturnValue({ toArray: () => Promise.resolve(produtos) });
  return {
    updateOne,
    bulkWrite,
    find,
    colecoes: { configuracoes: { updateOne }, produtos: { find, bulkWrite } } as unknown as ColecoesMigracaoMargens,
  };
}

describe("margensAntigasDoProduto", () => {
  it("devolve só as margens que o produto tinha", () => {
    expect(margensAntigasDoProduto({ margemMinimaPercentual: 80, margemDesejadaPercentual: 115 })).toEqual({
      minimaSobreCusto: 80,
      desejadaSobreCusto: 115,
    });
    expect(margensAntigasDoProduto({ margemMinimaPercentual: 80, shopeeTaxaPercentual: 14 })).toEqual({
      minimaSobreCusto: 80,
    });
  });

  it("produto sem margem própria não migra", () => {
    expect(margensAntigasDoProduto({ shopeeTaxaPercentual: 14 })).toBeNull();
    expect(margensAntigasDoProduto(undefined)).toBeNull();
  });
});

describe("sugerirMargemPreco", () => {
  const shopee = resolverTaxasCanais(TAXAS_CANAIS_PADRAO).shopee;

  it("Calendário do Advento: 80% sobre o custo vira ~32% do preço na Shopee", () => {
    expect(sugerirMargemPreco(5957, 80, shopee)).toBeCloseTo(32.2, 0);
  });

  it("115% sobre o custo vira ~40% do preço na Shopee", () => {
    expect(sugerirMargemPreco(5957, 115, shopee)).toBeCloseTo(39.8, 0);
  });

  it("sem custo não há sugestão", () => {
    expect(sugerirMargemPreco(0, 80, shopee)).toBeNull();
  });
});

describe("migrarMargensParaPreco", () => {
  const agora = new Date("2026-10-22T12:00:00Z");

  it("move as margens dos produtos para a revisão e marca o padrão global na régua do preço", async () => {
    const id = new ObjectId();
    const m = colecoes([{ _id: id, taxasCanais: { margemMinimaPercentual: 80, margemDesejadaPercentual: 115 } }]);

    await migrarMargensParaPreco(m.colecoes, agora);

    expect(m.bulkWrite).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: { _id: id },
          update: {
            $set: { margensParaRevisar: { minimaSobreCusto: 80, desejadaSobreCusto: 115, migradoEm: agora } },
            $unset: { "taxasCanais.margemMinimaPercentual": "", "taxasCanais.margemDesejadaPercentual": "" },
          },
        },
      },
    ]);
    const [filtro, atualizacao, opcoes] = m.updateOne.mock.calls[0];
    expect(filtro).toEqual({ _id: "taxasCanais", reguaMargem: { $ne: "preco" } });
    expect(atualizacao.$set).toMatchObject({ reguaMargem: "preco", margemMinimaPercentual: 25, margemDesejadaPercentual: 40 });
    expect(atualizacao.$setOnInsert).toMatchObject({ shopeeTaxaPercentual: 14, cupomLojaPercentual: 0, cupomLojaTetoCentavos: null });
    expect(opcoes).toEqual({ upsert: true });
  });

  it("sem produtos com margem própria, só marca o padrão global", async () => {
    const m = colecoes([]);
    await migrarMargensParaPreco(m.colecoes, agora);
    expect(m.bulkWrite).not.toHaveBeenCalled();
    expect(m.updateOne).toHaveBeenCalledTimes(1);
  });

  it("outra requisição já migrou (chave duplicada no upsert): segue sem erro", async () => {
    const m = colecoes([]);
    m.updateOne.mockRejectedValueOnce(Object.assign(new Error("E11000"), { code: 11000 }));
    await expect(migrarMargensParaPreco(m.colecoes, agora)).resolves.toBeUndefined();
  });

  it("outros erros do banco sobem", async () => {
    const m = colecoes([]);
    m.updateOne.mockRejectedValueOnce(new Error("conexão perdida"));
    await expect(migrarMargensParaPreco(m.colecoes, agora)).rejects.toThrow("conexão perdida");
  });
});
