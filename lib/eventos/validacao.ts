import {
  LIMITES_PEDIDO_EVENTO as L,
  STATUS_PEDIDO_EVENTO,
  type PedidoEventoPayload,
  type StatusPedidoEvento,
} from "@/lib/models/pedidoEvento";
import { somenteDigitos } from "./telefone";

export type ErrosPedidoEvento = Record<string, string>;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuidValido(valor: unknown): valor is string {
  return typeof valor === "string" && UUID_REGEX.test(valor);
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

/** Host das fotos aceitas no pedido (Vercel Blob da loja). */
export function urlFotoEventoValida(url: unknown): boolean {
  if (typeof url !== "string") return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/**
 * Validação do pedido de evento — usada no aparelho (antes de entrar na fila)
 * e no servidor. No aparelho, as fotos ainda não enviadas entram em `fotos`
 * como chaves locais: aqui só importa a quantidade; o formato das URLs é
 * conferido à parte por `urlFotoEventoValida`, só no servidor.
 * As chaves de erro seguem o contrato (`cliente.nome`, `itens.0` …).
 */
export function validarPedidoEvento(entrada: unknown): ErrosPedidoEvento {
  const erros: ErrosPedidoEvento = {};
  const p = (typeof entrada === "object" && entrada !== null ? entrada : {}) as Record<string, unknown>;
  const cliente = (typeof p.cliente === "object" && p.cliente !== null ? p.cliente : {}) as Record<string, unknown>;

  const evento = texto(p.evento);
  if (evento.length < L.eventoMin) erros.evento = "Escolha ou escreva o nome do evento.";
  else if (evento.length > L.eventoMax) erros.evento = `O nome do evento pode ter até ${L.eventoMax} letras.`;

  const nome = texto(cliente.nome);
  if (nome.length < L.nomeMin) erros["cliente.nome"] = "Escreva o nome do cliente.";
  else if (nome.length > L.nomeMax) erros["cliente.nome"] = `O nome pode ter até ${L.nomeMax} letras.`;

  const telefone = somenteDigitos(texto(cliente.telefone));
  if (telefone.length === 0) erros["cliente.telefone"] = "Falta o WhatsApp do cliente.";
  else if (telefone.length < 10 || telefone.length > 11)
    erros["cliente.telefone"] = "WhatsApp incompleto. Coloque o DDD e o número.";

  if (!Array.isArray(p.itens) || p.itens.length === 0) {
    erros.itens = "Coloque pelo menos um item.";
  } else if (p.itens.length > L.itensMax) {
    erros.itens = `No máximo ${L.itensMax} itens por pedido.`;
  } else {
    p.itens.forEach((bruto, i) => {
      const item = (typeof bruto === "object" && bruto !== null ? bruto : {}) as Record<string, unknown>;
      const descricao = texto(item.descricao);
      const fotos = Array.isArray(item.fotos) ? item.fotos : [];
      if (!uuidValido(item.id)) erros[`itens.${i}`] = "Item inválido. Remova e adicione de novo.";
      else if (descricao.length === 0 && fotos.length === 0)
        erros[`itens.${i}`] = "Coloque uma foto ou escreva o que é.";
      else if (descricao.length > L.descricaoMax)
        erros[`itens.${i}`] = `A descrição pode ter até ${L.descricaoMax} letras.`;
      else if (fotos.length > L.fotosPorItem) erros[`itens.${i}`] = `No máximo ${L.fotosPorItem} fotos por item.`;

      const q = item.quantidade;
      if (typeof q !== "number" || !Number.isInteger(q) || q < L.quantidadeMin || q > L.quantidadeMax)
        erros[`itens.${i}.quantidade`] = `A quantidade vai de ${L.quantidadeMin} a ${L.quantidadeMax}.`;
    });
  }

  const valor = p.valorCentavos;
  if (
    valor !== null &&
    valor !== undefined &&
    (typeof valor !== "number" || !Number.isInteger(valor) || valor < 0 || valor > L.valorMaxCentavos)
  ) {
    erros.valorCentavos = "Valor inválido.";
  }

  if (p.observacao !== undefined && typeof p.observacao !== "string") erros.observacao = "Observação inválida.";
  else if (texto(p.observacao).length > L.observacaoMax)
    erros.observacao = `A observação pode ter até ${L.observacaoMax} letras.`;

  if (p.status !== undefined && !STATUS_PEDIDO_EVENTO.includes(p.status as StatusPedidoEvento))
    erros.status = "Status inválido.";

  if (p.criadoEm !== undefined && (typeof p.criadoEm !== "string" || Number.isNaN(Date.parse(p.criadoEm))))
    erros.criadoEm = "Data inválida.";

  return erros;
}

/** Normaliza o payload já validado (trim, telefone só com dígitos, padrões). */
export function normalizarPedidoEvento(p: PedidoEventoPayload): PedidoEventoPayload {
  return {
    evento: p.evento.trim().replace(/\s+/g, " "),
    cliente: { nome: p.cliente.nome.trim().replace(/\s+/g, " "), telefone: somenteDigitos(p.cliente.telefone) },
    itens: p.itens.map((item) => ({
      id: item.id,
      descricao: (item.descricao ?? "").trim(),
      quantidade: item.quantidade,
      fotos: Array.isArray(item.fotos) ? item.fotos : [],
    })),
    valorCentavos: p.valorCentavos ?? null,
    observacao: (p.observacao ?? "").trim(),
    status: p.status ?? "anotado",
    criadoEm: p.criadoEm ?? new Date().toISOString(),
  };
}

/** Nome do evento normalizado para evitar "Feira", "feira " e "Féira" como eventos diferentes. */
export function normalizarNomeEvento(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
