import type { Impressao, ConsumoSlot, ResultadoImpressao } from "@/lib/models/producao";
import type { TaskBambu } from "./cliente";
import { textoDeMaterial } from "../material";

/**
 * Versão da regra que monta `nomeArquivo`. Registro com versão menor foi
 * gravado pela regra antiga (só o `title`) e é regravado — com os vínculos
 * migrados — na próxima importação.
 */
export const VERSAO_CHAVE = 2;

/** `status` da origem: 2 = concluída, 3 = abortada/falha (research.md #2). */
const STATUS_CONCLUIDA = 2;
const STATUS_INTERROMPIDA = 3;

function paraData(valor?: string): Date | undefined {
  if (!valor) return undefined;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? undefined : data;
}

function numeroPositivo(valor?: number): number | undefined {
  return typeof valor === "number" && valor > 0 ? valor : undefined;
}

/** Id da origem como texto; `0`/vazio significa "não tem". */
function idDaOrigem(valor: unknown): string | undefined {
  if (valor === undefined || valor === null) return undefined;
  const texto = String(valor).trim();
  return texto && texto !== "0" ? texto : undefined;
}

/**
 * Chave que identifica **a placa impressa**, base do vínculo com o produto.
 *
 * Placa do MakerWorld tem `title` = nome do perfil, e o nome padrão dos perfis
 * ("0.2mm layer, 2 walls, 15% infill") se repete entre modelos diferentes —
 * agrupar por ele mistura produtos. Ali a placa é identificada por modelo +
 * perfil + índice da placa. Arquivo próprio não tem `designId`, e o `title` é
 * o nome do projeto: continua sendo a chave. O `profileId` sozinho não serve
 * para arquivo próprio porque cada envio pelo fatiador pode criar um novo.
 */
export function chaveDaTask(task: TaskBambu): string | undefined {
  const design = idDaOrigem(task.designId);
  if (design) {
    return `mw:${design}:${idDaOrigem(task.profileId) ?? "0"}:${task.plateIndex ?? 0}`;
  }
  const nome = (task.title || task.plateName || "").trim();
  return nome || undefined;
}

/**
 * Converte um item do histórico da origem numa `Impressao`.
 *
 * Duas regras valem a pena destacar:
 * - a duração é sempre `fim − inicio`, nunca o `costTime` (que é a estimativa
 *   do fatiador) — FR-006. Sem `endTime` não há duração.
 * - `historico` compara o fim com `ativadoEm` da credencial, não com "foi a
 *   primeira importação": assim a marcação é a mesma se a importação for
 *   interrompida e retomada, ou se a conta for reconectada (research.md #6).
 */
export function mapearTask(task: TaskBambu, ativadoEm: Date): Impressao | null {
  const inicio = paraData(task.startTime);
  if (!inicio || task.id === undefined || task.id === null) {
    // Sem id ou sem início não há como identificar nem posicionar a impressão.
    return null;
  }

  const fim = paraData(task.endTime);

  // Em andamento é o caso de tudo que não é 2 nem 3 — e também de um registro
  // sem hora de término, que a origem ainda vai completar.
  const resultado: ResultadoImpressao =
    task.status === STATUS_CONCLUIDA
      ? "concluida"
      : task.status === STATUS_INTERROMPIDA
        ? "interrompida"
        : "em_andamento";

  const slots: ConsumoSlot[] = (task.amsDetailMapping ?? []).map((slot) => ({
    material: textoDeMaterial(slot.targetFilamentType) ?? textoDeMaterial(slot.filamentType),
    cor: slot.targetColor || slot.sourceColor || undefined,
    gramas: numeroPositivo(slot.weight),
  }));

  const cores = [...new Set(slots.map((s) => s.cor).filter((c): c is string => Boolean(c)))];
  const material =
    textoDeMaterial(task.material) ??
    slots.map((s) => s.material).find((m): m is string => Boolean(m));

  const designId = idDaOrigem(task.designId);
  const nomeDoTitle = (task.title || "").trim() || undefined;

  return {
    taskId: String(task.id),
    nomeArquivo: chaveDaTask(task) ?? `(sem nome) ${task.id}`,
    titulo: (designId && task.designTitle?.trim()) || nomeDoTitle || task.plateName || undefined,
    nomePerfil: designId ? nomeDoTitle : undefined,
    nomePlaca: task.plateName || undefined,
    designId,
    versaoChave: VERSAO_CHAVE,
    coverUrl: task.cover || undefined,
    resultado,
    inicio,
    fim,
    duracaoSegundos: fim ? Math.max(0, Math.round((fim.getTime() - inicio.getTime()) / 1000)) : undefined,
    gramas: numeroPositivo(task.weight),
    comprimentoMm: numeroPositivo(task.length),
    estimativaSegundos: numeroPositivo(task.costTime),
    material,
    cores,
    gramasPorSlot: slots,
    impressoraId: task.deviceId || undefined,
    impressoraNome: task.deviceName || undefined,
    historico: (fim ?? inicio).getTime() < ativadoEm.getTime(),
    quantidadeLancada: 0,
    quantidadePerdida: 0,
    importadoEm: new Date(),
  };
}

/** Mapeia uma página inteira, descartando itens inaproveitáveis. */
export function mapearTasks(tasks: TaskBambu[], ativadoEm: Date): Impressao[] {
  return tasks
    .map((task) => mapearTask(task, ativadoEm))
    .filter((impressao): impressao is Impressao => impressao !== null);
}
