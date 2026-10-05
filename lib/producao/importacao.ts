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
export const TAMANHO_PAGINA = 50;

export interface ResultadoImportacao {
  novas: number;
  ignoradas: number;
  paginas: number;
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

  while (paginas < maxPaginas) {
    const pagina = await deps.listarTasks({ after: cursor, limit: TAMANHO_PAGINA });
    paginas++;

    if (pagina.hits.length === 0) break;

    const impressoes = mapearTasks(pagina.hits, deps.ativadoEm);
    const existentes = await deps.taskIdsExistentes(impressoes.map((i) => i.taskId));
    const inexistentes = impressoes.filter((i) => !existentes.has(i.taskId));

    if (inexistentes.length > 0) {
      const resultado = await deps.inserirImpressoesNovas(inexistentes);
      novas += resultado.novas;
      ignoradas += resultado.ignoradas;
    }
    ignoradas += existentes.size;

    const paginaInteiraConhecida = impressoes.length > 0 && inexistentes.length === 0;
    if (!deps.cargaCompleta && paginaInteiraConhecida) break;

    const proximo = proximoCursor(pagina);
    if (!proximo || proximo === cursor) break; // origem sem cursor novo: evita laço infinito
    cursor = proximo;
  }

  return { novas, ignoradas, paginas };
}

export function origemDoDisparo(automatica: boolean): OrigemImportacao {
  return automatica ? "automatica" : "manual";
}
