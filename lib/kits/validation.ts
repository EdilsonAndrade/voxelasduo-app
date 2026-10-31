import { ObjectId } from "mongodb";
import { FAIXAS_DESCONTO_PADRAO, MAXIMO_ITENS_KIT, MAXIMO_MARGEM_ITEM_KIT } from "@/lib/models/kit";

export const LIMITE_NOME_KIT = 120;

/** Peça que ainda não é produto — vira rascunho ao salvar o kit. */
export interface ItemNovoEntrada {
  nome: string;
  pesoGramas: number;
  tempoMinutos: number;
  precoCentavos: number;
}

export type ItemKitEntrada = (
  | { produtoId: string; quantidade: number }
  | { novo: ItemNovoEntrada; quantidade: number }
) & {
  /** Ganho em % sobre o custo da peça — ausente = vale o preço avulso. */
  margemPercentual?: number;
};

export interface KitEntrada {
  nome: string;
  embalagemCentavos: number;
  faixasDesconto: number[];
  precoCentavos: number | null;
  itens: ItemKitEntrada[];
  /** Regrava a referência do preço mesmo sem mudar o preço ("Confirmar preço atual"). */
  reconfirmarPreco: boolean;
}

function inteiroPositivo(valor: unknown, maximo = Number.MAX_SAFE_INTEGER): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor > 0 && valor <= maximo;
}

function validarItem(bruto: unknown, posicao: number): { item?: ItemKitEntrada; erro?: string } {
  if (!bruto || typeof bruto !== "object") return { erro: `Item ${posicao} inválido.` };
  const item = bruto as Record<string, unknown>;
  if (!inteiroPositivo(item.quantidade, 999)) return { erro: `Quantidade do item ${posicao} deve ser um inteiro de 1 a 999.` };
  const quantidade = item.quantidade;

  const margemPercentual = item.margemPercentual ?? undefined;
  if (
    margemPercentual !== undefined &&
    !(
      typeof margemPercentual === "number" &&
      Number.isFinite(margemPercentual) &&
      margemPercentual >= 0 &&
      margemPercentual <= MAXIMO_MARGEM_ITEM_KIT
    )
  ) {
    return { erro: `Margem do item ${posicao} inválida (0 a ${MAXIMO_MARGEM_ITEM_KIT}% sobre o custo).` };
  }
  const margem = margemPercentual !== undefined ? { margemPercentual } : {};

  if (typeof item.produtoId === "string") {
    if (!ObjectId.isValid(item.produtoId)) return { erro: `Produto do item ${posicao} inválido.` };
    return { item: { produtoId: item.produtoId, quantidade, ...margem } };
  }

  const novo = item.novo as Record<string, unknown> | undefined;
  if (!novo || typeof novo !== "object") return { erro: `Item ${posicao} sem produto.` };
  const nome = typeof novo.nome === "string" ? novo.nome.trim() : "";
  if (!nome) return { erro: `Informe o nome do item novo ${posicao}.` };
  if (nome.length > LIMITE_NOME_KIT) return { erro: `Nome do item novo ${posicao} muito longo.` };
  if (!(typeof novo.pesoGramas === "number" && Number.isFinite(novo.pesoGramas) && novo.pesoGramas > 0)) {
    return { erro: `Informe o peso de "${nome}".` };
  }
  if (!inteiroPositivo(novo.tempoMinutos)) return { erro: `Informe o tempo de impressão de "${nome}".` };
  if (!inteiroPositivo(novo.precoCentavos)) return { erro: `Informe o preço de "${nome}".` };
  return {
    item: {
      novo: { nome, pesoGramas: novo.pesoGramas, tempoMinutos: novo.tempoMinutos, precoCentavos: novo.precoCentavos },
      quantidade,
      ...margem,
    },
  };
}

/** Corpo do POST/PUT de `/api/admin/kits` (contracts/api.md). */
export function validarKit(corpo: unknown): { dados?: KitEntrada; erro?: string } {
  if (!corpo || typeof corpo !== "object") return { erro: "Payload inválido." };
  const c = corpo as Record<string, unknown>;

  const nome = typeof c.nome === "string" ? c.nome.trim() : "";
  if (!nome) return { erro: "Informe o nome do kit." };
  if (nome.length > LIMITE_NOME_KIT) return { erro: `O nome do kit deve ter até ${LIMITE_NOME_KIT} caracteres.` };

  const embalagemCentavos = c.embalagemCentavos ?? 0;
  if (!(typeof embalagemCentavos === "number" && Number.isInteger(embalagemCentavos) && embalagemCentavos >= 0)) {
    return { erro: "Custo da embalagem do kit inválido." };
  }

  const faixasBrutas = c.faixasDesconto ?? FAIXAS_DESCONTO_PADRAO;
  if (
    !Array.isArray(faixasBrutas) ||
    faixasBrutas.length < 1 ||
    faixasBrutas.length > 5 ||
    !faixasBrutas.every((f) => typeof f === "number" && Number.isFinite(f) && f > 0 && f < 100)
  ) {
    return { erro: "As faixas de desconto devem ser de 1 a 5 valores entre 0% e 100%." };
  }

  if (!Array.isArray(c.itens)) return { erro: "Itens do kit inválidos." };
  if (c.itens.length > MAXIMO_ITENS_KIT) return { erro: `Um kit pode ter até ${MAXIMO_ITENS_KIT} itens.` };
  const itens: ItemKitEntrada[] = [];
  const ids = new Set<string>();
  const nomesNovos = new Set<string>();
  for (const [indice, bruto] of c.itens.entries()) {
    const { item, erro } = validarItem(bruto, indice + 1);
    if (!item) return { erro };
    if ("produtoId" in item) {
      if (ids.has(item.produtoId)) return { erro: "O mesmo produto aparece duas vezes no kit." };
      ids.add(item.produtoId);
    } else {
      const chave = item.novo.nome.toLocaleLowerCase("pt-BR");
      if (nomesNovos.has(chave)) return { erro: `O item novo "${item.novo.nome}" aparece duas vezes.` };
      nomesNovos.add(chave);
    }
    itens.push(item);
  }

  const precoCentavos = c.precoCentavos ?? null;
  if (precoCentavos !== null && !inteiroPositivo(precoCentavos)) return { erro: "Preço do kit inválido." };
  if (precoCentavos !== null && itens.length === 0) return { erro: "Adicione itens antes de definir o preço do kit." };

  return {
    dados: {
      nome,
      embalagemCentavos,
      faixasDesconto: [...new Set(faixasBrutas as number[])].sort((a, b) => a - b),
      precoCentavos,
      itens,
      reconfirmarPreco: c.reconfirmarPreco === true,
    },
  };
}
