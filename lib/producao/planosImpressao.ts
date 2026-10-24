import type { ItemImpressao } from "@/lib/models/planoImpressao";

export const MAX_ITENS_PLANO = 50;
export const MAX_NOME_ITEM = 120;
/** 14 dias — acima disso é quase certamente erro de digitação. */
export const MAX_MINUTOS_ITEM = 14 * 24 * 60;
export const MAX_QUANTIDADE_ITEM = 999;

const HORARIO = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Mesma parte com outra caixa ou espaço nas pontas — "Base " e "base" são a mesma. */
export function nomeNormalizado(nome: string): string {
  return nome.trim().toLocaleLowerCase("pt-BR");
}

function novoId(): string {
  return crypto.randomUUID();
}

/**
 * Valida a lista vinda da tela ou da Produção. Itens sem `id` ganham um novo;
 * `inicio` vazio fica de fora do item (sem horário planejado).
 */
export function validarItens(payload: unknown): { itens?: ItemImpressao[]; erro?: string } {
  if (!Array.isArray(payload) || payload.length === 0) {
    return { erro: "Informe ao menos uma parte (ou o produto inteiro) com o tempo de impressão." };
  }
  if (payload.length > MAX_ITENS_PLANO) {
    return { erro: `No máximo ${MAX_ITENS_PLANO} partes por produto.` };
  }

  const itens: ItemImpressao[] = [];
  const nomes = new Set<string>();
  for (const [indice, bruto] of payload.entries()) {
    const linha = `Linha ${indice + 1}`;
    if (typeof bruto !== "object" || bruto === null) return { erro: `${linha}: item inválido.` };
    const item = bruto as Record<string, unknown>;

    const nome = typeof item.nome === "string" ? item.nome.trim() : "";
    if (nome === "") return { erro: `${linha}: informe o nome da parte.` };
    if (nome.length > MAX_NOME_ITEM) {
      return { erro: `${linha}: nome com mais de ${MAX_NOME_ITEM} caracteres.` };
    }
    if (nomes.has(nomeNormalizado(nome))) return { erro: `${linha}: a parte "${nome}" está repetida.` };
    nomes.add(nomeNormalizado(nome));

    const minutos = item.minutos;
    if (typeof minutos !== "number" || !Number.isInteger(minutos) || minutos <= 0) {
      return { erro: `${linha} (${nome}): informe um tempo de impressão maior que zero.` };
    }
    if (minutos > MAX_MINUTOS_ITEM) {
      return { erro: `${linha} (${nome}): tempo acima de 14 dias — confira as horas.` };
    }

    const quantidade = item.quantidade ?? 1;
    if (
      typeof quantidade !== "number" ||
      !Number.isInteger(quantidade) ||
      quantidade < 1 ||
      quantidade > MAX_QUANTIDADE_ITEM
    ) {
      return { erro: `${linha} (${nome}): informe a quantidade de peças da placa (1 a ${MAX_QUANTIDADE_ITEM}).` };
    }

    const inicio = typeof item.inicio === "string" ? item.inicio.trim() : "";
    if (inicio !== "" && !HORARIO.test(inicio)) {
      return { erro: `${linha} (${nome}): horário de início inválido (use HH:MM).` };
    }

    itens.push({
      id: typeof item.id === "string" && item.id.trim() !== "" ? item.id : novoId(),
      nome,
      minutos,
      quantidade,
      ...(inicio ? { inicio } : {}),
    });
  }

  return { itens };
}

/**
 * Importação da Produção: parte com o mesmo nome tem tempo e quantidade atualizados (mantém
 * id e horário planejado), parte nova entra no fim, e as que não vieram ficam.
 */
export function mesclarItens(atuais: ItemImpressao[], recebidos: ItemImpressao[]): ItemImpressao[] {
  const resultado = atuais.map((item) => ({ ...item }));
  const porNome = new Map(resultado.map((item) => [nomeNormalizado(item.nome), item]));

  for (const recebido of recebidos) {
    const existente = porNome.get(nomeNormalizado(recebido.nome));
    if (existente) {
      existente.minutos = recebido.minutos;
      if (recebido.quantidade !== undefined) existente.quantidade = recebido.quantidade;
      continue;
    }
    const novo = { ...recebido };
    resultado.push(novo);
    porNome.set(nomeNormalizado(novo.nome), novo);
  }

  return resultado;
}

/** Peças da placa — planos gravados antes da quantidade contam 1. */
export function quantidadeDoItem(item: Pick<ItemImpressao, "quantidade">): number {
  return item.quantidade ?? 1;
}

export function totalPecas(itens: Pick<ItemImpressao, "quantidade">[]): number {
  return itens.reduce((soma, item) => soma + quantidadeDoItem(item), 0);
}

export function totalMinutos(itens: Pick<ItemImpressao, "minutos">[]): number {
  return itens.reduce((soma, item) => soma + item.minutos, 0);
}

/** "10h02" a partir de minutos inteiros. */
export function minutosEmHoras(minutos: number): string {
  return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}`;
}

/** O mínimo de uma impressão da apuração da Produção que a importação precisa. */
export interface ImpressaoDaApuracao {
  id: string;
  inicio: string;
  resultado: "concluida" | "interrompida" | "em_andamento";
  duracaoSegundos?: number;
  /** Peças por placa declaradas no vínculo. */
  rendimentoPorPlaca?: number;
  foraDoCusto: boolean;
}

export interface ParteDaApuracao<I extends ImpressaoDaApuracao = ImpressaoDaApuracao> {
  parte: string;
  impressoes: I[];
}

/**
 * Itens para levar ao Tempo de Impressão: por parte, a impressão marcada (no
 * cálculo), concluída e com duração mais recente — o tempo da placa que vai de
 * novo para a impressora. Parte sem nenhuma assim fica de fora.
 */
export function itensDaApuracao<I extends ImpressaoDaApuracao>(
  partes: ParteDaApuracao<I>[],
  foraDoCusto: (impressao: I) => boolean = (i) => i.foraDoCusto
): { nome: string; minutos: number; quantidade: number }[] {
  return partes.flatMap((parte) => {
    const candidatas = parte.impressoes.filter(
      (i) => !foraDoCusto(i) && i.resultado === "concluida" && (i.duracaoSegundos ?? 0) > 0
    );
    if (candidatas.length === 0) return [];
    const recente = candidatas.reduce((a, b) => (Date.parse(b.inicio) > Date.parse(a.inicio) ? b : a));
    return [
      {
        nome: parte.parte,
        minutos: Math.ceil(recente.duracaoSegundos! / 60),
        quantidade: Math.max(1, Math.round(recente.rendimentoPorPlaca ?? 1)),
      },
    ];
  });
}
