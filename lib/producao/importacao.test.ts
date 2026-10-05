import { describe, expect, it, vi } from "vitest";
import { importarHistorico } from "./importacao";
import type { TaskBambu } from "./bambu/cliente";

const ATIVADO_EM = new Date("2026-10-05T12:00:00.000Z");

function task(id: number): TaskBambu {
  return {
    id,
    title: `peca_${id}`,
    status: 2,
    startTime: "2026-10-06T10:00:00.000Z",
    endTime: "2026-10-06T12:00:00.000Z",
    weight: 50,
  };
}

function deps(
  paginas: TaskBambu[][],
  conhecidos: string[] = [],
  extras: { cargaCompleta?: boolean; maxPaginas?: number } = {}
) {
  const listarTasks = vi.fn();
  paginas.forEach((hits) => listarTasks.mockResolvedValueOnce({ total: 0, hits }));
  listarTasks.mockResolvedValue({ total: 0, hits: [] });

  const inserirImpressoesNovas = vi.fn(async (impressoes: { taskId: string }[]) => ({
    novas: impressoes.length,
    ignoradas: 0,
  }));

  return {
    listarTasks,
    inserirImpressoesNovas,
    taskIdsExistentes: vi.fn(async (ids: string[]) =>
      new Set(ids.filter((id) => conhecidos.includes(id)))
    ),
    ativadoEm: ATIVADO_EM,
    cargaCompleta: extras.cargaCompleta ?? false,
    maxPaginas: extras.maxPaginas,
  };
}

describe("importarHistorico", () => {
  it("grava as impressões novas e usa o id da última como cursor da página seguinte", async () => {
    const d = deps([[task(10), task(9)], [task(8)], []]);

    const resultado = await importarHistorico(d);

    expect(resultado.novas).toBe(3);
    expect(d.listarTasks.mock.calls[0][0]).toMatchObject({ after: undefined });
    expect(d.listarTasks.mock.calls[1][0]).toMatchObject({ after: "9" });
    expect(d.listarTasks.mock.calls[2][0]).toMatchObject({ after: "8" });
  });

  it("no modo incremental para na primeira página inteiramente conhecida", async () => {
    const d = deps([[task(10)], [task(9), task(8)], [task(7)]], ["9", "8"]);

    const resultado = await importarHistorico(d);

    expect(resultado.paginas).toBe(2); // não buscou a terceira
    expect(resultado.novas).toBe(1);
    expect(resultado.ignoradas).toBe(2);
  });

  it("não interrompe numa página só parcialmente conhecida", async () => {
    const d = deps([[task(10), task(9)], [task(8)], []], ["9"]);

    const resultado = await importarHistorico(d);

    expect(resultado.novas).toBe(2); // 10 e 8
    expect(resultado.ignoradas).toBe(1); // 9
    expect(resultado.paginas).toBe(3);
  });

  it("na carga completa percorre o histórico mesmo com páginas já conhecidas", async () => {
    const d = deps([[task(10)], [task(9)], [task(8)], []], ["10", "9"], {
      cargaCompleta: true,
    });

    const resultado = await importarHistorico(d);

    expect(resultado.paginas).toBe(4);
    expect(resultado.novas).toBe(1);
    expect(resultado.ignoradas).toBe(2);
  });

  it("respeita o teto de páginas por execução, para a próxima retomar pelo cursor", async () => {
    const d = deps(
      [[task(10)], [task(9)], [task(8)], [task(7)]],
      [],
      { cargaCompleta: true, maxPaginas: 2 }
    );

    const resultado = await importarHistorico(d);

    expect(resultado.paginas).toBe(2);
    expect(d.listarTasks).toHaveBeenCalledTimes(2);
  });

  it("para quando a origem não devolve cursor novo, sem laço infinito", async () => {
    const listarTasks = vi.fn().mockResolvedValue({ total: 1, hits: [task(10)] });
    const d = { ...deps([]), listarTasks, cargaCompleta: true };

    const resultado = await importarHistorico(d);

    // Primeira página grava; na segunda o cursor repetiria, então encerra.
    expect(resultado.paginas).toBeLessThanOrEqual(2);
    expect(listarTasks.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("propaga o erro da origem, preservando o que já foi gravado", async () => {
    const d = deps([[task(10)]]);
    d.listarTasks.mockReset();
    d.listarTasks
      .mockResolvedValueOnce({ total: 0, hits: [task(10)] })
      .mockRejectedValueOnce(Object.assign(new Error("Bambu Lab respondeu HTTP 401"), { status: 401 }));

    await expect(importarHistorico(d)).rejects.toThrowError(/HTTP 401/);
    expect(d.inserirImpressoesNovas).toHaveBeenCalledTimes(1); // a primeira página entrou
  });

  it("descarta tasks inaproveitáveis sem contar como novas", async () => {
    const d = deps([[{ ...task(10), startTime: undefined }], []]);

    const resultado = await importarHistorico(d);

    expect(resultado.novas).toBe(0);
    expect(d.inserirImpressoesNovas).not.toHaveBeenCalled();
  });
});
