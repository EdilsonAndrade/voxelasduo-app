import { mapearTasks } from "./bambu/mapear";
import type { ClienteBambu, PaginaTasks } from "./bambu/cliente";
import type { Impressao, OrigemImportacao } from "@/lib/models/producao";

/**
 * Teto de páginas por execução. A primeira carga de um histórico grande pode
 * ser longa, e a function tem tempo limitado: ao bater o teto a importação
 * para e a próxima execução retoma pelo cursor, sem perder o que já entrou
 * (FR-008).
 */
export const MAX_PAGINAS_POR_EXECUCAO = 20;
/*
 * 20 é o tamanho de página padrão da origem. Valores maiores foram observados
 * voltando lista vazia em vez de erro, o que é indistinguível de "não há
 * histórico" — não vale a economia de requisições.
 */
export const TAMANHO_PAGINA = 20;

export interface ResultadoImportacao {
  novas: number;
  ignoradas: number;
  paginas: number;
  /**
   * Quantas impressões a origem diz ter no histórico (campo `total` da
   * primeira página). Distingue "a conta não tem histórico na nuvem" de "a
   * origem tem histórico mas não consegui ler" — sem isso, as duas situações
   * aparecem como "0 novas" e não dá para diagnosticar.
   */
  totalNaOrigem?: number;
  /** `true` quando a varredura leu até o fim do histórico (não parou no teto de páginas). */
  chegouAoFim: boolean;
}

/** Dependências injetadas para a lógica ser testável sem rede e sem banco. */
export interface DependenciasImportacao {
  listarTasks: ClienteBambu["listarTasks"];
  taskIdsExistentes: (taskIds: string[]) => Promise<Set<string>>;
  inserirImpressoesNovas: (
    impressoes: Impressao[]
  ) => Promise<{ novas: number; ignoradas: number }>;
  ativadoEm: Date;
  /** `true` na primeira carga: percorre o histórico inteiro em vez de parar na página conhecida. */
  cargaCompleta: boolean;
  maxPaginas?: number;
  /** Importar só de uma impressora — ausente traz as de todas as máquinas da conta. */
  deviceId?: string;
}

/** Cursor da próxima página: o id da última impressão recebida. */
function proximoCursor(pagina: PaginaTasks): string | undefined {
  const ultima = pagina.hits.at(-1);
  return ultima?.id !== undefined ? String(ultima.id) : undefined;
}

/**
 * Percorre o histórico da origem e grava as impressões novas.
 *
 * No modo incremental (uso diário) a varredura para na primeira página em que
 * **todas** as tasks já estão no banco — é o que mantém o cron barato. No modo
 * carga completa (primeira importação) vai até a página vazia.
 *
 * Uma página parcialmente conhecida não interrompe a varredura: a origem pode
 * ter impressões antigas ainda não importadas depois de uma já conhecida.
 */
export async function importarHistorico(
  deps: DependenciasImportacao
): Promise<ResultadoImportacao> {
  const maxPaginas = deps.maxPaginas ?? MAX_PAGINAS_POR_EXECUCAO;
  let cursor: string | undefined;
  let novas = 0;
  let ignoradas = 0;
  let paginas = 0;
  let totalNaOrigem: number | undefined;
  let chegouAoFim = false;

  while (paginas < maxPaginas) {
    const pagina = await deps.listarTasks({
      after: cursor,
      limit: TAMANHO_PAGINA,
      deviceId: deps.deviceId,
    });
    paginas++;
    if (totalNaOrigem === undefined) totalNaOrigem = pagina.total;

    if (pagina.hits.length === 0) {
      chegouAoFim = true;
      break;
    }

    const impressoes = mapearTasks(pagina.hits, deps.ativadoEm);
    const existentes = await deps.taskIdsExistentes(impressoes.map((i) => i.taskId));

    // Grava a página inteira, não só o que é novo: uma impressão importada
    // enquanto rodava precisa receber o resultado e o consumo finais quando
    // termina. O que já foi lançado no estoque é preservado na gravação.
    if (impressoes.length > 0) {
      const resultado = await deps.inserirImpressoesNovas(impressoes);
      novas += resultado.novas;
      ignoradas += resultado.ignoradas;
    }

    const paginaInteiraConhecida = impressoes.length > 0 && existentes.size === impressoes.length;
    if (!deps.cargaCompleta && paginaInteiraConhecida) break;

    const proximo = proximoCursor(pagina);
    if (!proximo || proximo === cursor) {
      chegouAoFim = true; // origem sem cursor novo: evita laço infinito
      break;
    }
    cursor = proximo;
  }

  return { novas, ignoradas, paginas, totalNaOrigem, chegouAoFim };
}

export function origemDoDisparo(automatica: boolean): OrigemImportacao {
  return automatica ? "automatica" : "manual";
}
