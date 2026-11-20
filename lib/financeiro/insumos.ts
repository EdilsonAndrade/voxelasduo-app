import type { CategoriaExtra } from "@/lib/models/calculoPreco";
import { ROTULO_CATEGORIA_DESPESA } from "@/lib/models/financeiro";
import { ROTULO_UNIDADE, type CategoriaInsumo, type InsumoJson, type UnidadeInsumo } from "@/lib/models/insumo";

/** Custo de uma unidade da medida, em centavos — guarda a fração (R$ 0,1333 = 13,33 centavos). */
export function custoUnitarioCentavos(quantidade: number, valorTotalCentavos: number): number {
  if (!(quantidade > 0)) return 0;
  return valorTotalCentavos / quantidade;
}

/** "R$ 0,39"; com fração de centavo, mostra até 4 casas ("R$ 0,1333"). */
export function formatarCustoUnitario(centavos: number): string {
  const redondo = Math.abs(centavos - Math.round(centavos)) < 0.005;
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: redondo ? 2 : 4,
  });
}

/** "R$ 0,08 por grama" */
export function rotuloCustoUnitario(unidade: UnidadeInsumo, custoUnitarioCentavos: number): string {
  return `${formatarCustoUnitario(custoUnitarioCentavos)} ${ROTULO_UNIDADE[unidade].custo}`;
}

/** Equivalência de quem é vendido em quilo/litro — `null` nas outras unidades. */
export function equivalenciaMil(unidade: UnidadeInsumo, custoUnitarioCentavos: number): string | null {
  if (unidade !== "grama" && unidade !== "ml") return null;
  const mil = (custoUnitarioCentavos * 1000) / 100;
  return `${mil.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por ${unidade === "grama" ? "kg" : "litro"}`;
}

/** "100 un por R$ 39,00" — a última compra em uma linha. */
export function rotuloCompra(unidade: UnidadeInsumo, quantidade: number, valorTotalCentavos: number): string {
  const qtd = quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const valor = (valorTotalCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `${qtd} ${ROTULO_UNIDADE[unidade].sigla} por ${valor}`;
}

/** Valor para o campo de preço da calculadora, em reais: "0.39", "0.1333". */
export function precoParaCampo(centavos: number): string {
  return (Math.round(centavos * 100) / 10000)
    .toFixed(4)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

/** Categoria do custo extra que o insumo assume na calculadora (dá para trocar na linha). */
export const CATEGORIA_EXTRA_DO_INSUMO: Record<CategoriaInsumo, CategoriaExtra> = {
  filamento: "outros",
  embalagem: "embalagem",
  insumos: "outros",
};

/** Insumo do jeito que a calculadora usa: dropdown + linha de custo extra já preenchida. */
export interface InsumoCalculadora {
  id: string;
  nome: string;
  rotulo: string;
  precoReais: string;
  categoria: CategoriaExtra;
  custoUnitarioCentavos: number;
  unidade: UnidadeInsumo;
}

export function paraCalculadora(insumo: InsumoJson): InsumoCalculadora {
  const marca = insumo.marca ? ` ${insumo.marca}` : "";
  return {
    id: insumo.id,
    nome: `${insumo.nome}${marca}`,
    rotulo: `${insumo.nome}${marca} · ${rotuloCustoUnitario(insumo.unidade, insumo.custoUnitarioCentavos)}`,
    precoReais: precoParaCampo(insumo.custoUnitarioCentavos),
    categoria: CATEGORIA_EXTRA_DO_INSUMO[insumo.categoria],
    custoUnitarioCentavos: insumo.custoUnitarioCentavos,
    unidade: insumo.unidade,
  };
}

/** Descrição da despesa que a compra do insumo lança no financeiro. */
export function descricaoDaCompra(
  insumo: { nome: string; marca?: string; unidade: UnidadeInsumo },
  quantidade: number
): string {
  const marca = insumo.marca ? ` (${insumo.marca})` : "";
  const qtd = quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return `${insumo.nome}${marca} — ${qtd} ${ROTULO_UNIDADE[insumo.unidade].sigla}`;
}

/** Quanto foi gasto em cada categoria de insumo, para comparar na tela. */
export function gastoPorCategoria(insumos: InsumoJson[]): Array<{ categoria: CategoriaInsumo; rotulo: string; valorCentavos: number; itens: number }> {
  const mapa = new Map<CategoriaInsumo, { valorCentavos: number; itens: number }>();
  for (const insumo of insumos) {
    const atual = mapa.get(insumo.categoria) ?? { valorCentavos: 0, itens: 0 };
    mapa.set(insumo.categoria, { valorCentavos: atual.valorCentavos + insumo.totalGastoCentavos, itens: atual.itens + 1 });
  }
  return [...mapa.entries()]
    .map(([categoria, dados]) => ({ categoria, rotulo: ROTULO_CATEGORIA_DESPESA[categoria], ...dados }))
    .sort((a, b) => b.valorCentavos - a.valorCentavos);
}
