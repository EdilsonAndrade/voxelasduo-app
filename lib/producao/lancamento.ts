import { agruparPorParte, saldoLancavel } from "./apuracao";
import type { Impressao, VinculoArquivoProduto } from "@/lib/models/producao";

export interface ItemConsumo {
  impressao: Impressao;
  parte: string;
  unidades: number;
  /** Rendimento da parte — limite usado na atualização atômica do saldo. */
  rendimentoPorPlaca: number;
}

export interface PlanoLancamento {
  conjuntos: number;
  itens: ItemConsumo[];
}

/** Quantos conjuntos completos ainda podem virar estoque (FR-038). */
export function conjuntosDisponiveis(
  vinculos: VinculoArquivoProduto[],
  impressoes: Impressao[]
): number {
  if (vinculos.length === 0) return 0;

  // Placas diferentes da mesma parte somam saldo (ver `agruparPorParte`).
  return Math.floor(
    Math.min(
      ...agruparPorParte(vinculos).map((grupo) => {
        const saldo = grupo.vinculos.reduce(
          (total, vinculo) =>
            total +
            impressoes
              .filter((i) => i.nomeArquivo === vinculo.nomeArquivo)
              .reduce((soma, i) => soma + saldoLancavel(i, vinculo), 0),
          0
        );
        return saldo / grupo.unidadesPorProduto;
      })
    )
  );
}

/**
 * Monta o plano de consumo para lançar `conjuntos` produtos acabados.
 *
 * Consome o saldo de cada parte da impressão **mais antiga primeiro** (FIFO):
 * é o que faz a peça parada há mais tempo sair primeiro, e torna o plano
 * determinístico — importante porque não há transação entre as partes
 * (research.md #7).
 *
 * Devolve `null` quando não há saldo para a quantidade pedida.
 */
export function planejarLancamento(
  vinculos: VinculoArquivoProduto[],
  impressoes: Impressao[],
  conjuntos: number
): PlanoLancamento | null {
  if (conjuntos <= 0 || vinculos.length === 0) return null;
  if (conjuntos > conjuntosDisponiveis(vinculos, impressoes)) return null;

  const itens: ItemConsumo[] = [];

  for (const grupo of agruparPorParte(vinculos)) {
    let faltam = conjuntos * grupo.unidadesPorProduto;

    // FIFO entre todas as placas da parte, não placa por placa.
    const candidatas = grupo.vinculos
      .flatMap((vinculo) =>
        impressoes
          .filter((i) => i.nomeArquivo === vinculo.nomeArquivo && saldoLancavel(i, vinculo) > 0)
          .map((impressao) => ({ impressao, vinculo }))
      )
      .sort((a, b) => a.impressao.inicio.getTime() - b.impressao.inicio.getTime());

    for (const { impressao, vinculo } of candidatas) {
      if (faltam <= 0) break;
      const usar = Math.min(faltam, saldoLancavel(impressao, vinculo));
      itens.push({
        impressao,
        parte: vinculo.parte,
        unidades: usar,
        rendimentoPorPlaca: vinculo.rendimentoPorPlaca,
      });
      faltam -= usar;
    }

    // conjuntosDisponiveis já garantiu o saldo; esta guarda é a rede contra
    // uma mudança de regra que passasse batida pelos testes.
    if (faltam > 0) return null;
  }

  return { conjuntos, itens };
}

export interface ItemAplicado extends ItemConsumo {
  /** Unidades da parte que viram estoque. */
  lancadas: number;
  /** Unidades da parte consumidas como perda — saem do saldo, não entram no estoque. */
  perdidas: number;
}

/**
 * Divide o consumo planejado entre o que vira estoque e o que é perda.
 *
 * A perda é declarada em conjuntos ("produzi 6, 1 quebrou, lanço 5"), então
 * ela consome saldo igual ao lançamento — por isso o plano é feito para
 * `lançados + perdidos` e aqui as unidades de cada parte são alocadas
 * primeiro ao lançamento e o resto à perda.
 */
export function dividirConsumo(
  plano: PlanoLancamento,
  conjuntosLancados: number,
  vinculos: VinculoArquivoProduto[]
): ItemAplicado[] {
  const unidadesPorProduto = new Map(vinculos.map((v) => [v.parte, v.unidadesPorProduto]));
  const restamLancar = new Map<string, number>();

  for (const [parte, unidades] of unidadesPorProduto) {
    restamLancar.set(parte, conjuntosLancados * unidades);
  }

  return plano.itens.map((item) => {
    const disponivel = restamLancar.get(item.parte) ?? 0;
    const lancadas = Math.min(item.unidades, disponivel);
    restamLancar.set(item.parte, disponivel - lancadas);

    return { ...item, lancadas, perdidas: item.unidades - lancadas };
  });
}

/**
 * Quanto pode ser declarado como perda numa impressão específica — a perda
 * sai do mesmo saldo do lançamento (FR-033).
 */
export function perdaPermitida(
  impressao: Impressao,
  vinculo: VinculoArquivoProduto,
  quantidadeLancada: number
): number {
  return Math.max(0, saldoLancavel(impressao, vinculo) - quantidadeLancada);
}
