import type { AnyBulkWriteOperation, Collection } from "mongodb";
import {
  TAXAS_CANAIS_ID,
  TAXAS_CANAIS_PADRAO,
  type TaxasCanaisDocumento,
} from "@/lib/models/configuracao";
import type { MargensParaRevisar, Produto, TaxasCanaisProduto } from "@/lib/models/produto";
import { calcularPrecoPorMarkupCanal, comissaoCanal, type TaxaCanal } from "@/lib/produtos/canais";

/**
 * Margens próprias de um produto gravadas na régua antiga (% sobre o custo)
 * que precisam ir para a lista de revisão — `null` = nada a migrar.
 */
export function margensAntigasDoProduto(
  taxas?: TaxasCanaisProduto
): Omit<MargensParaRevisar, "migradoEm"> | null {
  const minima = taxas?.margemMinimaPercentual;
  const desejada = taxas?.margemDesejadaPercentual;
  if (minima === undefined && desejada === undefined) return null;
  return {
    ...(minima !== undefined ? { minimaSobreCusto: minima } : {}),
    ...(desejada !== undefined ? { desejadaSobreCusto: desejada } : {}),
  };
}

/**
 * Equivalente em % do preço de uma margem antiga (% sobre o custo): o preço
 * que a régua antiga sugeria e o lucro dele dividido por esse preço. Ex.:
 * custo R$ 59,57 com 80% sobre o custo na Shopee → ~32% do preço. `null` sem
 * custo ou sem preço possível.
 */
export function sugerirMargemPreco(custoCentavos: number, markupPercentual: number, taxa: TaxaCanal): number | null {
  if (!(custoCentavos > 0)) return null;
  const preco = calcularPrecoPorMarkupCanal(custoCentavos, markupPercentual, taxa);
  if (preco === null || preco <= 0) return null;
  const lucro = preco - comissaoCanal(taxa, preco) - custoCentavos;
  return (lucro / preco) * 100;
}

export interface ColecoesMigracaoMargens {
  configuracoes: Pick<Collection<TaxasCanaisDocumento>, "updateOne">;
  produtos: Pick<Collection<Produto>, "find" | "bulkWrite">;
}

function chaveDuplicada(erro: unknown): boolean {
  return typeof erro === "object" && erro !== null && (erro as { code?: unknown }).code === 11000;
}

/**
 * Passa as margens para a régua do preço (opção C da spec 034): os overrides
 * dos produtos vão para `margensParaRevisar` (e saem de `taxasCanais`), e o
 * padrão global vira piso 25% / desejada 40% do preço, marcado com
 * `reguaMargem: "preco"`. Os produtos vão primeiro: se algo falhar no meio, a
 * próxima leitura tenta de novo, e quem já foi movido não aparece mais na
 * busca. Duas requisições ao mesmo tempo gravam o mesmo resultado.
 */
export async function migrarMargensParaPreco(colecoes: ColecoesMigracaoMargens, agora = new Date()): Promise<void> {
  const comOverride = await colecoes.produtos
    .find(
      {
        $or: [
          { "taxasCanais.margemMinimaPercentual": { $exists: true } },
          { "taxasCanais.margemDesejadaPercentual": { $exists: true } },
        ],
      },
      { projection: { taxasCanais: 1 } }
    )
    .toArray();

  const operacoes = comOverride.flatMap((produto): AnyBulkWriteOperation<Produto>[] => {
    const antigas = margensAntigasDoProduto(produto.taxasCanais);
    if (!antigas || !produto._id) return [];
    return [
      {
        updateOne: {
          filter: { _id: produto._id },
          update: {
            $set: { margensParaRevisar: { ...antigas, migradoEm: agora } },
            $unset: { "taxasCanais.margemMinimaPercentual": "" as const, "taxasCanais.margemDesejadaPercentual": "" as const },
          },
        },
      },
    ];
  });
  if (operacoes.length > 0) await colecoes.produtos.bulkWrite(operacoes);

  const { margemMinimaPercentual, margemDesejadaPercentual, ...demais } = TAXAS_CANAIS_PADRAO;
  try {
    await colecoes.configuracoes.updateOne(
      { _id: TAXAS_CANAIS_ID, reguaMargem: { $ne: "preco" } },
      {
        $set: { reguaMargem: "preco", margemMinimaPercentual, margemDesejadaPercentual, atualizadoEm: agora },
        $setOnInsert: demais,
      },
      { upsert: true }
    );
  } catch (erro) {
    // Outra requisição marcou a migração primeiro: o upsert colide com o documento que já existe.
    if (!chaveDuplicada(erro)) throw erro;
  }
}
