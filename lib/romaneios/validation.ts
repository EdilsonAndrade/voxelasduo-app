import { ObjectId } from "mongodb";
import {
  FORMAS_PAGAMENTO,
  MAXIMO_ITENS_LUGAR,
  MAXIMO_LUGARES_ROMANEIO,
  MAXIMO_PAGAMENTOS_LUGAR,
  MAXIMO_QUANTIDADE_ITEM,
  type FormaPagamento,
  type ItemRomaneio,
  type LugarRomaneio,
  type OrigemItemRomaneio,
  type PagamentoRomaneio,
} from "@/lib/models/romaneio";

export const LIMITE_NOME_ROMANEIO = 120;
export const LIMITE_NOME_LUGAR = 80;
export const LIMITE_TEXTO_CURTO = 120;
export const LIMITE_OBSERVACAO = 500;

export interface RomaneioEntrada {
  nome: string;
  dataSaida: string;
  observacao?: string;
  lugares: LugarRomaneio[];
}

type Resultado<T> = { valor?: T; erro?: string };

const ORIGENS: OrigemItemRomaneio[] = ["produto", "tempoImpressao", "livre"];

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function dataValida(valor: unknown): valor is string {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T12:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().startsWith(valor);
}

function inteiro(valor: unknown, minimo: number, maximo: number): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= minimo && valor <= maximo;
}

function id(valor: unknown): string {
  const t = texto(valor);
  return t.length > 0 && t.length <= 64 ? t : "";
}

function opcional(nome: string, valor: string): Record<string, string> {
  return valor ? { [nome]: valor } : {};
}

function validarItem(bruto: unknown, onde: string): Resultado<ItemRomaneio> {
  if (!bruto || typeof bruto !== "object") return { erro: `${onde}: item inválido.` };
  const i = bruto as Record<string, unknown>;
  const nome = texto(i.nome);
  const rotulo = nome ? `${onde}, "${nome}"` : onde;
  if (!id(i.id)) return { erro: `${rotulo}: item sem identificador.` };
  if (!nome) return { erro: `${onde}: informe o nome do item.` };
  if (nome.length > LIMITE_TEXTO_CURTO) return { erro: `${rotulo}: nome muito longo.` };
  if (!ORIGENS.includes(i.origem as OrigemItemRomaneio)) return { erro: `${rotulo}: origem inválida.` };
  const origem = i.origem as OrigemItemRomaneio;
  const origemId = texto(i.origemId);
  if (origem !== "livre" && !ObjectId.isValid(origemId)) return { erro: `${rotulo}: referência da origem inválida.` };
  if (!inteiro(i.precoCentavos, 0, 100_000_000)) return { erro: `${rotulo}: informe o preço.` };
  if (!inteiro(i.levada, 1, MAXIMO_QUANTIDADE_ITEM)) {
    return { erro: `${rotulo}: a quantidade levada deve ser um inteiro de 1 a ${MAXIMO_QUANTIDADE_ITEM}.` };
  }
  const vendida = i.vendida ?? 0;
  const devolvida = i.devolvida ?? 0;
  if (!inteiro(vendida, 0, MAXIMO_QUANTIDADE_ITEM) || !inteiro(devolvida, 0, MAXIMO_QUANTIDADE_ITEM)) {
    return { erro: `${rotulo}: vendidas e devolvidas devem ser inteiros a partir de 0.` };
  }
  if (vendida + devolvida > i.levada) {
    return { erro: `${rotulo}: vendidas + devolvidas (${vendida + devolvida}) passam das ${i.levada} levadas.` };
  }
  return {
    valor: {
      id: id(i.id),
      origem,
      ...(origem !== "livre" ? { origemId } : {}),
      nome,
      precoCentavos: i.precoCentavos,
      levada: i.levada,
      vendida,
      devolvida,
    },
  };
}

function validarPagamento(bruto: unknown, onde: string): Resultado<PagamentoRomaneio> {
  if (!bruto || typeof bruto !== "object") return { erro: `${onde}: pagamento inválido.` };
  const p = bruto as Record<string, unknown>;
  if (!id(p.id)) return { erro: `${onde}: pagamento sem identificador.` };
  if (!inteiro(p.valorCentavos, 1, 100_000_000)) return { erro: `${onde}: informe o valor do pagamento.` };
  if (!dataValida(p.data)) return { erro: `${onde}: data do pagamento inválida.` };
  if (!FORMAS_PAGAMENTO.includes(p.forma as FormaPagamento)) return { erro: `${onde}: forma de pagamento inválida.` };
  const observacao = texto(p.observacao);
  if (observacao.length > LIMITE_TEXTO_CURTO) return { erro: `${onde}: observação do pagamento muito longa.` };
  return {
    valor: {
      id: id(p.id),
      valorCentavos: p.valorCentavos,
      data: p.data,
      forma: p.forma as FormaPagamento,
      ...opcional("observacao", observacao),
    },
  };
}

function validarLugar(bruto: unknown, posicao: number, hoje: string): Resultado<LugarRomaneio> {
  if (!bruto || typeof bruto !== "object") return { erro: `Lugar ${posicao} inválido.` };
  const l = bruto as Record<string, unknown>;
  const nome = texto(l.nome);
  if (!id(l.id)) return { erro: `Lugar ${posicao} sem identificador.` };
  if (!nome) return { erro: `Informe o nome do lugar ${posicao}.` };
  if (nome.length > LIMITE_NOME_LUGAR) return { erro: `O nome do lugar ${posicao} deve ter até ${LIMITE_NOME_LUGAR} caracteres.` };
  const contato = texto(l.contato);
  const levadoPor = texto(l.levadoPor);
  if (contato.length > LIMITE_TEXTO_CURTO || levadoPor.length > LIMITE_TEXTO_CURTO) {
    return { erro: `${nome}: contato ou "quem levou" muito longo.` };
  }
  const status = l.status === "acertado" ? "acertado" : l.status === "aberto" || l.status === undefined ? "aberto" : null;
  if (!status) return { erro: `${nome}: status inválido.` };

  if (!Array.isArray(l.itens)) return { erro: `${nome}: itens inválidos.` };
  if (l.itens.length > MAXIMO_ITENS_LUGAR) return { erro: `${nome}: um lugar pode ter até ${MAXIMO_ITENS_LUGAR} itens.` };
  const itens: ItemRomaneio[] = [];
  for (const bruto of l.itens) {
    const { valor, erro } = validarItem(bruto, nome);
    if (!valor) return { erro };
    if (itens.some((i) => i.id === valor.id)) return { erro: `${nome}: item repetido.` };
    itens.push(valor);
  }

  const pagamentosBrutos = l.pagamentos ?? [];
  if (!Array.isArray(pagamentosBrutos)) return { erro: `${nome}: pagamentos inválidos.` };
  if (pagamentosBrutos.length > MAXIMO_PAGAMENTOS_LUGAR) return { erro: `${nome}: até ${MAXIMO_PAGAMENTOS_LUGAR} pagamentos por lugar.` };
  const pagamentos: PagamentoRomaneio[] = [];
  for (const bruto of pagamentosBrutos) {
    const { valor, erro } = validarPagamento(bruto, nome);
    if (!valor) return { erro };
    pagamentos.push(valor);
  }

  const acertadoEm = status === "acertado" ? (dataValida(l.acertadoEm) ? l.acertadoEm : hoje) : undefined;
  return {
    valor: {
      id: id(l.id),
      nome,
      ...opcional("contato", contato),
      ...opcional("levadoPor", levadoPor),
      status,
      ...(acertadoEm ? { acertadoEm } : {}),
      itens,
      pagamentos,
    },
  };
}

/** Corpo do POST/PUT de `/api/admin/romaneios` (contracts/api.md). */
export function validarRomaneio(corpo: unknown, hoje: string): { dados?: RomaneioEntrada; erro?: string } {
  if (!corpo || typeof corpo !== "object") return { erro: "Payload inválido." };
  const c = corpo as Record<string, unknown>;

  const nome = texto(c.nome);
  if (!nome) return { erro: "Informe o nome do romaneio." };
  if (nome.length > LIMITE_NOME_ROMANEIO) return { erro: `O nome do romaneio deve ter até ${LIMITE_NOME_ROMANEIO} caracteres.` };
  if (!dataValida(c.dataSaida)) return { erro: "Informe uma data de saída válida." };
  const observacao = texto(c.observacao);
  if (observacao.length > LIMITE_OBSERVACAO) return { erro: `A observação deve ter até ${LIMITE_OBSERVACAO} caracteres.` };

  if (!Array.isArray(c.lugares) || c.lugares.length === 0) return { erro: "Informe ao menos um lugar." };
  if (c.lugares.length > MAXIMO_LUGARES_ROMANEIO) return { erro: `Um romaneio pode ter até ${MAXIMO_LUGARES_ROMANEIO} lugares.` };
  const lugares: LugarRomaneio[] = [];
  for (const [indice, bruto] of c.lugares.entries()) {
    const { valor, erro } = validarLugar(bruto, indice + 1, hoje);
    if (!valor) return { erro };
    if (lugares.some((l) => l.id === valor.id)) return { erro: "Lugar repetido." };
    lugares.push(valor);
  }
  if (lugares.every((l) => l.itens.length === 0)) return { erro: "Adicione ao menos um item." };

  return { dados: { nome, dataSaida: c.dataSaida, ...opcional("observacao", observacao), lugares } };
}
