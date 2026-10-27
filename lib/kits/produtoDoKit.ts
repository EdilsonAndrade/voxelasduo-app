import type { CustoProducao } from "@/lib/models/produto";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import { custoProducaoItemNovo } from "./componentes";
import type { TotaisKit } from "./precificacaoKit";

export interface ComponenteProdutoKit {
  nome: string;
  quantidade: number;
  /** Horas de mão de obra da peça (do custo de produção dela) — ausente = 0. */
  maoDeObraHoras?: number;
}

/**
 * Custo de produção agregado do produto do kit (specs/037, research #6): peso,
 * tempo e mão de obra somados com as tarifas padrão da loja, a embalagem do
 * kit, falha 0 e o que faltar para fechar **exatamente** o custo do kit em
 * `custoAcessoriosCentavos` — assim a tela do produto e a calculadora partem
 * do mesmo custo que o montador mostrou. Todos os campos ficam > 0, como a
 * validação do produto exige.
 */
export function custoProducaoDoKit(
  totais: TotaisKit,
  componentes: ComponenteProdutoKit[],
  embalagemCentavos: number
): CustoProducao {
  const base = custoProducaoItemNovo(1, 1)!;
  const maoDeObraHoras = componentes.reduce((soma, c) => soma + (c.maoDeObraHoras ?? 0) * c.quantidade, 0);
  const agregado: CustoProducao = {
    ...base,
    pesoPecaGramas: Math.max(totais.pesoGramas, 1),
    tempoImpressaoHoras: Math.max(totais.tempoMinutos, 1) / 60,
    tempoMaoDeObraHoras: Math.max(Math.round(maoDeObraHoras * 100) / 100, 0.01),
    taxaFalhaPercentual: 0,
    custoEmbalagemCentavos: Math.max(Math.round(embalagemCentavos), 1),
    custoAcessoriosCentavos: 0,
  };
  const semAjuste = calcularCustoProducao(agregado).totalCentavos;
  return { ...agregado, custoAcessoriosCentavos: Math.max(0, totais.custoCentavos - semAjuste) };
}

/** "2× Estrela", "Árvore 10 cm" — um por componente, na ordem do kit. */
export function itensInclusosDoKit(componentes: Pick<ComponenteProdutoKit, "nome" | "quantidade">[]): string[] {
  return componentes.map((c) => (c.quantidade > 1 ? `${c.quantidade}× ${c.nome}` : c.nome));
}

/** Descrição inicial do produto do kit — o lojista reescreve à vontade, a atualização não mexe nela. */
export function descricaoInicialDoKit(nome: string, componentes: Pick<ComponenteProdutoKit, "nome" | "quantidade">[]): string {
  return `${nome}. O kit inclui:\n${itensInclusosDoKit(componentes).map((item) => `• ${item}`).join("\n")}`;
}
