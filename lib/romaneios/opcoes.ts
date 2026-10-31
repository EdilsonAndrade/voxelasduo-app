import type { ItemImpressao } from "@/lib/models/planoImpressao";
import type { OrigemItemRomaneio } from "@/lib/models/romaneio";
import { ganhoDaPlaca, ganhoDoConjunto, type PlacaGanho } from "@/lib/producao/ganhoImpressao";

/** Uma peça que a busca do romaneio oferece. */
export interface OpcaoBuscaRomaneio {
  origem: Exclude<OrigemItemRomaneio, "livre">;
  origemId: string;
  nome: string;
  /** Preço sugerido — `null` = sem preço na origem (o lojista preenche). */
  precoCentavos: number | null;
  /** Produto ainda não publicado no site (ajuda a reconhecer na lista). */
  rascunho?: boolean;
}

function placa(item: ItemImpressao): PlacaGanho {
  return {
    minutos: item.minutos,
    quantidade: item.quantidade ?? 1,
    pesoGramas: item.pesoGramas ?? NaN,
    margemPercentual: item.margemPercentual ?? NaN,
  };
}

/**
 * Preço de venda direta de um plano do Tempo de Impressão, o mesmo que a tela
 * mostra: uma parte = a placa; várias = o conjunto (uma peça de cada parte).
 * `null` enquanto faltar peso ou margem em alguma parte.
 */
export function precoVendaDiretaDoPlano(itens: ItemImpressao[]): number | null {
  if (itens.length === 0) return null;
  const ganho = itens.length === 1 ? ganhoDaPlaca(placa(itens[0])) : ganhoDoConjunto(itens.map(placa));
  return ganho?.canais.direta?.precoCentavos ?? null;
}

/**
 * Opções da busca única: produtos do catálogo e planos avulsos do Tempo de
 * Impressão. Plano ligado a produto fica de fora — vale o produto.
 */
export function opcoesDeBusca(
  produtos: { id: string; nome: string; precoCentavos: number; publicado: boolean }[],
  planos: { id: string; produtoId?: string; nome?: string; itens: ItemImpressao[] }[]
): OpcaoBuscaRomaneio[] {
  const deProdutos: OpcaoBuscaRomaneio[] = produtos.map((p) => ({
    origem: "produto",
    origemId: p.id,
    nome: p.nome,
    precoCentavos: p.precoCentavos > 0 ? p.precoCentavos : null,
    ...(p.publicado ? {} : { rascunho: true }),
  }));
  const dePlanos: OpcaoBuscaRomaneio[] = planos
    .filter((plano) => !plano.produtoId)
    .map((plano) => ({
      origem: "tempoImpressao",
      origemId: plano.id,
      nome: plano.nome?.trim() || "Item sem nome",
      precoCentavos: precoVendaDiretaDoPlano(plano.itens),
    }));
  return [...deProdutos, ...dePlanos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
}
