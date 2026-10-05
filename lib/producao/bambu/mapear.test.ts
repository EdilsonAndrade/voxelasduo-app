import { describe, expect, it } from "vitest";
import { mapearTask, mapearTasks } from "./mapear";
import type { TaskBambu } from "./cliente";

const ATIVADO_EM = new Date("2026-10-05T12:00:00.000Z");

const taskConcluida: TaskBambu = {
  id: 912345,
  title: "vaso_base_v2",
  plateName: "Plate 1",
  cover: "https://cdn.exemplo/cover.png",
  status: 2,
  startTime: "2026-10-06T18:00:00.000Z",
  endTime: "2026-10-06T22:30:00.000Z",
  weight: 182,
  length: 61200,
  costTime: 15900,
  material: "PLA",
  deviceId: "DEV1",
  deviceName: "A1",
  amsDetailMapping: [
    { amsId: 0, slotId: 1, targetColor: "#0A0A0A", targetFilamentType: "PLA", weight: 182 },
  ],
};

describe("mapearTask", () => {
  it("usa a duração real (fim − início), não a estimativa do fatiador", () => {
    const impressao = mapearTask(taskConcluida, ATIVADO_EM)!;

    expect(impressao.duracaoSegundos).toBe(4.5 * 3600); // 16200s
    expect(impressao.estimativaSegundos).toBe(15900); // guardada, mas não usada como duração
    expect(impressao.duracaoSegundos).not.toBe(impressao.estimativaSegundos);
  });

  it("mapeia os campos da impressão concluída", () => {
    const impressao = mapearTask(taskConcluida, ATIVADO_EM)!;

    expect(impressao.taskId).toBe("912345");
    expect(impressao.nomeArquivo).toBe("vaso_base_v2");
    expect(impressao.resultado).toBe("concluida");
    expect(impressao.gramas).toBe(182);
    expect(impressao.material).toBe("PLA");
    expect(impressao.cores).toEqual(["#0A0A0A"]);
    expect(impressao.impressoraNome).toBe("A1");
    expect(impressao.quantidadeLancada).toBe(0);
    expect(impressao.quantidadePerdida).toBe(0);
  });

  it("trata status 3 como interrompida", () => {
    const impressao = mapearTask({ ...taskConcluida, status: 3 }, ATIVADO_EM)!;
    expect(impressao.resultado).toBe("interrompida");
  });

  it("trata status desconhecido como em andamento, nunca como falha", () => {
    for (const status of [1, 4, undefined]) {
      const impressao = mapearTask({ ...taskConcluida, status }, ATIVADO_EM)!;
      expect(impressao.resultado).toBe("em_andamento");
    }
  });

  it("converte material em objeto para texto, em vez de [object Object]", () => {
    const impressao = mapearTask(
      { ...taskConcluida, material: { name: "PLA Basic" } as unknown },
      ATIVADO_EM
    )!;

    expect(impressao.material).toBe("PLA Basic");
  });

  it("ignora material em formato que não dá para ler", () => {
    const impressao = mapearTask(
      { ...taskConcluida, material: { id: 7 } as unknown, amsDetailMapping: [] },
      ATIVADO_EM
    )!;

    expect(impressao.material).toBeUndefined();
  });

  it("sem endTime não calcula duração, mas ainda grava a impressão", () => {
    const impressao = mapearTask({ ...taskConcluida, endTime: undefined }, ATIVADO_EM)!;

    expect(impressao.fim).toBeUndefined();
    expect(impressao.duracaoSegundos).toBeUndefined();
    expect(impressao.inicio).toBeInstanceOf(Date);
  });

  it("peso zero ou ausente fica sem gramas, para ser ignorado nos cálculos", () => {
    expect(mapearTask({ ...taskConcluida, weight: 0 }, ATIVADO_EM)!.gramas).toBeUndefined();
    expect(mapearTask({ ...taskConcluida, weight: undefined }, ATIVADO_EM)!.gramas).toBeUndefined();
  });

  it("reúne cores e gramas por slot numa impressão multicolor", () => {
    const impressao = mapearTask(
      {
        ...taskConcluida,
        material: undefined,
        amsDetailMapping: [
          { amsId: 0, slotId: 1, targetColor: "#FFFFFF", targetFilamentType: "PLA", weight: 40 },
          { amsId: 0, slotId: 2, targetColor: "#FF0000", targetFilamentType: "PLA", weight: 22 },
          { amsId: 0, slotId: 3, targetColor: "#FFFFFF", targetFilamentType: "PLA", weight: 18 },
        ],
      },
      ATIVADO_EM
    )!;

    expect(impressao.cores).toEqual(["#FFFFFF", "#FF0000"]); // sem repetir
    expect(impressao.gramasPorSlot).toHaveLength(3);
    expect(impressao.gramasPorSlot[1]).toEqual({ material: "PLA", cor: "#FF0000", gramas: 22 });
    expect(impressao.material).toBe("PLA"); // herdado do slot quando a task não informa
  });

  it("marca como histórico o que terminou antes da conta ser conectada", () => {
    const antes = mapearTask(
      { ...taskConcluida, startTime: "2026-09-01T10:00:00.000Z", endTime: "2026-09-01T14:00:00.000Z" },
      ATIVADO_EM
    )!;
    const depois = mapearTask(taskConcluida, ATIVADO_EM)!;

    expect(antes.historico).toBe(true);
    expect(depois.historico).toBe(false);
  });

  it("cai no plateName quando não há title, e nunca deixa o nome vazio", () => {
    expect(mapearTask({ ...taskConcluida, title: "" }, ATIVADO_EM)!.nomeArquivo).toBe("Plate 1");
    expect(
      mapearTask({ ...taskConcluida, title: "", plateName: "" }, ATIVADO_EM)!.nomeArquivo
    ).toBe("(sem nome) 912345");
  });

  it("descarta item sem id ou sem data de início", () => {
    expect(mapearTask({ ...taskConcluida, startTime: undefined }, ATIVADO_EM)).toBeNull();
    expect(
      mapearTask({ ...taskConcluida, id: undefined as unknown as number }, ATIVADO_EM)
    ).toBeNull();
  });
});

describe("mapearTasks", () => {
  it("mapeia a página e descarta os itens inaproveitáveis", () => {
    const impressoes = mapearTasks(
      [taskConcluida, { ...taskConcluida, id: 2, startTime: undefined }],
      ATIVADO_EM
    );

    expect(impressoes).toHaveLength(1);
    expect(impressoes[0].taskId).toBe("912345");
  });
});
