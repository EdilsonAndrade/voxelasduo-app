import type { OpcaoFrete } from "@/lib/models/frete";
import type { StatusPedido } from "@/lib/models/pedido";
import {
  LIMITE_TEXTO_LINK,
  MAXIMO_ITENS_LINK,
  VALIDADE_MAXIMA_DIAS,
  VALIDADE_PADRAO_DIAS,
  type SituacaoLink,
} from "@/lib/models/linkPagamento";

/** Item como chega do admin (antes de conferir no banco). */
export interface ItemLinkEntrada {
  produtoId: string;
  variacaoId?: string;
  quantidade: number;
  precoCentavos: number;
}

export interface LinkEntrada {
  clienteNome?: string;
  observacao?: string;
  itens: ItemLinkEntrada[];
  freteGratis: boolean;
  validadeDias: number;
}

export interface ResultadoValidacaoLink {
  erros: Record<string, string>;
  dados: LinkEntrada | null;
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function inteiro(valor: unknown): number {
  return typeof valor === "number" && Number.isInteger(valor) ? valor : Number.NaN;
}

/** Valida o corpo do POST de link (formato e limites; produtos são conferidos no repositório). */
export function validarLinkEntrada(corpo: unknown): ResultadoValidacaoLink {
  const erros: Record<string, string> = {};
  const entrada = (corpo && typeof corpo === "object" ? corpo : {}) as Record<string, unknown>;

  const clienteNome = texto(entrada.clienteNome);
  const observacao = texto(entrada.observacao);
  if (clienteNome.length > LIMITE_TEXTO_LINK) erros.clienteNome = `Use até ${LIMITE_TEXTO_LINK} caracteres.`;
  if (observacao.length > LIMITE_TEXTO_LINK * 2) erros.observacao = `Use até ${LIMITE_TEXTO_LINK * 2} caracteres.`;

  const validadeBruta = entrada.validadeDias === undefined ? VALIDADE_PADRAO_DIAS : inteiro(entrada.validadeDias);
  if (!(validadeBruta >= 1 && validadeBruta <= VALIDADE_MAXIMA_DIAS)) {
    erros.validadeDias = `A validade deve ser de 1 a ${VALIDADE_MAXIMA_DIAS} dias.`;
  }

  const itensBrutos = Array.isArray(entrada.itens) ? entrada.itens : [];
  if (itensBrutos.length === 0) erros.itens = "Adicione pelo menos um item.";
  if (itensBrutos.length > MAXIMO_ITENS_LINK) erros.itens = `Use até ${MAXIMO_ITENS_LINK} itens.`;

  const itens: ItemLinkEntrada[] = [];
  const vistos = new Set<string>();
  itensBrutos.forEach((bruto, indice) => {
    const item = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
    const produtoId = texto(item.produtoId);
    const variacaoId = texto(item.variacaoId);
    const quantidade = inteiro(item.quantidade);
    const precoCentavos = inteiro(item.precoCentavos);
    if (!/^[a-f0-9]{24}$/i.test(produtoId)) erros[`itens[${indice}].produtoId`] = "Escolha o produto.";
    if (!(quantidade >= 1 && quantidade <= 999)) erros[`itens[${indice}].quantidade`] = "Quantidade de 1 a 999.";
    if (!(precoCentavos >= 1)) erros[`itens[${indice}].precoCentavos`] = "O preço deve ser maior que zero.";
    const chave = `${produtoId}:${variacaoId}`;
    if (vistos.has(chave)) erros[`itens[${indice}].produtoId`] = "Item repetido: some a quantidade na mesma linha.";
    vistos.add(chave);
    itens.push({ produtoId, ...(variacaoId ? { variacaoId } : {}), quantidade, precoCentavos });
  });

  if (Object.keys(erros).length > 0) return { erros, dados: null };
  return {
    erros,
    dados: {
      ...(clienteNome ? { clienteNome } : {}),
      ...(observacao ? { observacao } : {}),
      itens,
      freteGratis: entrada.freteGratis === true,
      validadeDias: validadeBruta,
    },
  };
}

/** Código público do link: 10 caracteres sem ambíguos (0/O, 1/l). */
export function gerarCodigoLink(): string {
  const alfabeto = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(10);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

/** Preço unitário com desconto percentual, arredondado ao centavo. */
export function precoComDesconto(originalCentavos: number, percentual: number): number {
  if (!Number.isFinite(percentual)) return originalCentavos;
  const limitado = Math.min(Math.max(percentual, 0), 100);
  return Math.round(originalCentavos * (1 - limitado / 100));
}

/** Desconto percentual equivalente a um preço final (uma casa decimal). */
export function percentualDesconto(originalCentavos: number, precoCentavos: number): number {
  if (!(originalCentavos > 0)) return 0;
  return Math.round((1 - precoCentavos / originalCentavos) * 1000) / 10;
}

export interface TotaisLink {
  originalCentavos: number;
  totalCentavos: number;
  descontoCentavos: number;
}

export function totaisDoLink(
  itens: { quantidade: number; precoOriginalCentavos: number; precoCentavos: number }[]
): TotaisLink {
  const originalCentavos = itens.reduce((acc, i) => acc + i.precoOriginalCentavos * i.quantidade, 0);
  const totalCentavos = itens.reduce((acc, i) => acc + i.precoCentavos * i.quantidade, 0);
  return { originalCentavos, totalCentavos, descontoCentavos: Math.max(0, originalCentavos - totalCentavos) };
}

/** Situação exibida no admin e usada para liberar ou bloquear o pagamento. */
export function situacaoDoLink(
  link: { validoAte: Date; canceladoEm?: Date; pedidoId?: unknown },
  statusPedido: StatusPedido | null | undefined,
  agora: Date = new Date()
): SituacaoLink {
  if (link.pedidoId && statusPedido && statusPedido !== "pendente" && statusPedido !== "cancelado") return "pago";
  if (link.canceladoEm) return "cancelado";
  if (link.pedidoId && statusPedido === "pendente") return "aguardando_pagamento";
  if (link.pedidoId && statusPedido === "cancelado") return "cancelado";
  if (link.validoAte.getTime() < agora.getTime()) return "vencido";
  return "ativo";
}

/** Formas de entrega do link: com frete grátis, PAC e SEDEX saem por R$ 0. */
export function opcoesFreteDoLink(opcoes: OpcaoFrete[], freteGratis: boolean): OpcaoFrete[] {
  if (!freteGratis) return opcoes;
  return opcoes.map((opcao) => ({ ...opcao, valorCentavos: 0, origem: "gratis" }));
}

/** Chave de idempotência do pedido do link — garante um pedido só por link. */
export function idempotenciaDoLink(codigo: string): string {
  return `link:${codigo}`;
}
