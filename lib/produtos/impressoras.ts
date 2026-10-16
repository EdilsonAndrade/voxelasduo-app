import type { FormaPagamento, ImpressoraReferencia } from "@/lib/models/calculoPreco";

/** Impressoras de referência: o consumo médio (kWh por hora imprimindo PLA) só sugere o campo, que continua editável. */
export const IMPRESSORAS: Array<{ id: ImpressoraReferencia; nome: string; consumoKwh: string | null }> = [
  { id: "a1mini", nome: "Bambu Lab A1 mini", consumoKwh: "0.08" },
  { id: "a1", nome: "Bambu Lab A1", consumoKwh: "0.11" },
  { id: "p1s", nome: "Bambu Lab P1S", consumoKwh: "0.13" },
  { id: "x1c", nome: "Bambu Lab X1 Carbon", consumoKwh: "0.15" },
  { id: "outra", nome: "Outra (digitar o consumo)", consumoKwh: null },
];

export function impressoraPorId(id: ImpressoraReferencia) {
  return IMPRESSORAS.find((i) => i.id === id) ?? IMPRESSORAS[IMPRESSORAS.length - 1];
}

/** Taxa da maquininha na venda direta; Pix e "Outra" são digitados. */
export const TAXA_PAGAMENTO_FIXA: Partial<Record<FormaPagamento, number>> = {
  debito: 1.99,
  credito: 2.99,
};
