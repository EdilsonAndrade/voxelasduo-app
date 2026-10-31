import { describe, expect, it } from "vitest";
import type { ItemRomaneio, LugarRomaneio } from "@/lib/models/romaneio";
import {
  adicionarPeca,
  agruparTudoJunto,
  fecharAcerto,
  pagoNaHora,
  reabrirLugar,
  repassar,
  resumoDoLugar,
  resumoDoRomaneio,
  statusDoRomaneio,
} from "./calculo";

function item(parcial: Partial<ItemRomaneio> = {}): ItemRomaneio {
  return {
    id: "i1",
    origem: "produto",
    origemId: "p1",
    nome: "Vaso",
    precoCentavos: 4000,
    levada: 3,
    vendida: 0,
    devolvida: 0,
    ...parcial,
  };
}

function lugar(parcial: Partial<LugarRomaneio> = {}): LugarRomaneio {
  return { id: "l1", nome: "Casa do amigo", status: "aberto", itens: [], pagamentos: [], ...parcial };
}

describe("resumoDoLugar", () => {
  it("soma peças, valor, vendido, pago e a receber", () => {
    const r = resumoDoLugar(
      lugar({
        itens: [item({ vendida: 2, devolvida: 1 }), item({ id: "i2", origemId: "p2", precoCentavos: 1500, levada: 2 })],
        pagamentos: [{ id: "pg", valorCentavos: 5000, data: "2026-10-31", forma: "pix" }],
      })
    );
    expect(r).toMatchObject({
      pecas: 5,
      valorCentavos: 15000,
      pecasNoLugar: 2,
      vendidoCentavos: 8000,
      pagoCentavos: 5000,
      aReceberCentavos: 3000,
      pagoAMaisCentavos: 0,
      temAcerto: true,
    });
  });

  it("pago acima do vendido vira pago a mais, sem a receber negativo", () => {
    const r = resumoDoLugar(
      lugar({ itens: [item({ vendida: 1 })], pagamentos: [{ id: "pg", valorCentavos: 5000, data: "2026-10-31", forma: "pix" }] })
    );
    expect(r.aReceberCentavos).toBe(0);
    expect(r.pagoAMaisCentavos).toBe(1000);
  });

  it("sem venda, devolução nem pagamento não tem acerto", () => {
    expect(resumoDoLugar(lugar({ itens: [item()] })).temAcerto).toBe(false);
  });
});

describe("resumoDoRomaneio e status", () => {
  it("soma os lugares e só fica acertado com todos acertados", () => {
    const a = lugar({ itens: [item()] });
    const b = lugar({ id: "l2", status: "acertado", itens: [item({ levada: 2 })] });
    expect(resumoDoRomaneio([a, b]).pecas).toBe(5);
    expect(statusDoRomaneio([a, b])).toBe("aberto");
    expect(statusDoRomaneio([b])).toBe("acertado");
  });
});

describe("adicionarPeca", () => {
  it("soma na linha da mesma peça e mesmo preço", () => {
    const { itens, somou } = adicionarPeca([item()], { origem: "produto", origemId: "p1", nome: "Vaso", precoCentavos: 4000, quantidade: 2 }, "novo");
    expect(somou).toBe(true);
    expect(itens).toHaveLength(1);
    expect(itens[0].levada).toBe(5);
  });

  it("preço diferente vira outra linha; item livre compara pelo nome", () => {
    expect(adicionarPeca([item()], { origem: "produto", origemId: "p1", nome: "Vaso", precoCentavos: 3500, quantidade: 1 }, "n").itens).toHaveLength(2);
    const livre = item({ origem: "livre", origemId: undefined, nome: "Chaveiro" });
    expect(adicionarPeca([livre], { origem: "livre", nome: " chaveiro ", precoCentavos: 4000, quantidade: 1 }, "n").somou).toBe(true);
  });
});

describe("repassar", () => {
  const lugares = [lugar({ itens: [item({ levada: 5 })] }), lugar({ id: "l2", nome: "Casa da sogra" })];

  it("tira da origem e põe no destino, sem mudar o total", () => {
    const { lugares: depois } = repassar(lugares, { lugarId: "l1", itemId: "i1" }, "l2", 2, "novo");
    expect(depois![0].itens[0].levada).toBe(3);
    expect(depois![1].itens[0]).toMatchObject({ id: "novo", nome: "Vaso", precoCentavos: 4000, levada: 2, origemId: "p1" });
    expect(resumoDoRomaneio(depois!).pecas).toBe(5);
  });

  it("repassar tudo remove a linha da origem", () => {
    const { lugares: depois } = repassar(lugares, { lugarId: "l1", itemId: "i1" }, "l2", 5, "novo");
    expect(depois![0].itens).toHaveLength(0);
  });

  it("não passa do que ainda está no lugar nem para o mesmo lugar", () => {
    const comAcerto = [lugar({ itens: [item({ levada: 5, vendida: 2, devolvida: 1 })] }), lugares[1]];
    expect(repassar(comAcerto, { lugarId: "l1", itemId: "i1" }, "l2", 3, "n").erro).toMatch(/Só há 2 peças/);
    expect(repassar(lugares, { lugarId: "l1", itemId: "i1" }, "l1", 1, "n").erro).toBeDefined();
  });
});

describe("agruparTudoJunto", () => {
  it("junta a mesma peça de lugares diferentes com a divisão", () => {
    const linhas = agruparTudoJunto([
      lugar({ itens: [item({ levada: 3 })] }),
      lugar({ id: "l2", nome: "Casa da sogra", itens: [item({ id: "i9", levada: 2, vendida: 1 })] }),
    ]);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ levada: 5, vendida: 1, noLugar: 4 });
    expect(linhas[0].porLugar.map((p) => `${p.lugar} ${p.levada}`)).toEqual(["Casa do amigo 3", "Casa da sogra 2"]);
  });
});

describe("acerto", () => {
  it("fecha e reabre", () => {
    const fechado = fecharAcerto(lugar(), "2026-10-31");
    expect(fechado).toMatchObject({ status: "acertado", acertadoEm: "2026-10-31" });
    const reaberto = reabrirLugar(fechado);
    expect(reaberto.status).toBe("aberto");
    expect("acertadoEm" in reaberto).toBe(false);
  });

  it("pago na hora vende tudo e registra o total", () => {
    const pago = pagoNaHora(lugar({ itens: [item({ devolvida: 1 })] }), "pix", "2026-10-31", "pg");
    expect(pago.itens[0]).toMatchObject({ vendida: 3, devolvida: 0 });
    expect(pago.pagamentos).toEqual([{ id: "pg", valorCentavos: 12000, data: "2026-10-31", forma: "pix" }]);
    expect(pago.status).toBe("acertado");
    expect(resumoDoLugar(pago).aReceberCentavos).toBe(0);
  });
});
