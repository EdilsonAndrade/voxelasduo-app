import type { PedidoEventoJson, StatusPedidoEvento } from "@/lib/models/pedidoEvento";
import { mascararTelefone } from "@/lib/eventos/telefone";
import type { EntradaFila, FotoFila } from "./offline/fila";

/** Estado do formulário de pedido de evento (também é o rascunho guardado no aparelho). */
export interface FotoForm {
  chave: string;
  blob?: Blob;
  url?: string;
}

export interface ItemForm {
  id: string;
  descricao: string;
  quantidade: number;
  fotos: FotoForm[];
}

export interface PedidoForm {
  id: string;
  /** false = editando um pedido que já existe. */
  novo: boolean;
  evento: string;
  nome: string;
  telefone: string;
  itens: ItemForm[];
  valor: string;
  observacao: string;
  status: StatusPedidoEvento;
  criadoEm: string;
}

export function novoItem(): ItemForm {
  return { id: crypto.randomUUID(), descricao: "", quantidade: 1, fotos: [] };
}

export function novoPedidoForm(evento: string): PedidoForm {
  return {
    id: crypto.randomUUID(),
    novo: true,
    evento,
    nome: "",
    telefone: "",
    itens: [novoItem()],
    valor: "",
    observacao: "",
    status: "anotado",
    criadoEm: new Date().toISOString(),
  };
}

/** "30" / "30,5" / "1.234,50" → centavos; vazio → null; inválido → NaN. */
export function valorParaCentavos(valor: string): number | null {
  const limpo = valor.trim().replace(/[R$\s]/g, "");
  if (!limpo) return null;
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return Number.NaN;
  return Math.round(Number(normalizado) * 100);
}

export function centavosParaValor(centavos: number | null): string {
  if (centavos === null) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

export function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Formulário → entrada da fila (as fotos viram chaves; blobs/URLs vão para `fotos`). */
export function formParaEntrada(form: PedidoForm, autor: string): Omit<EntradaFila, "estado" | "enfileiradoEm"> {
  const fotos: Record<string, FotoFila> = {};
  const itens = form.itens.map((item) => {
    item.fotos.forEach((foto) => {
      fotos[foto.chave] = foto.url ? { url: foto.url } : { blob: foto.blob };
    });
    return {
      id: item.id,
      descricao: item.descricao.trim(),
      quantidade: item.quantidade,
      fotos: item.fotos.map((foto) => foto.chave),
    };
  });

  const centavos = valorParaCentavos(form.valor);

  return {
    id: form.id,
    autor,
    fotos,
    pedido: {
      evento: form.evento.trim(),
      cliente: { nome: form.nome.trim(), telefone: form.telefone },
      itens,
      valorCentavos: centavos === null || Number.isNaN(centavos) ? null : centavos,
      observacao: form.observacao.trim(),
      status: form.status,
      criadoEm: form.criadoEm,
    },
  };
}

export function entradaParaForm(entrada: EntradaFila): PedidoForm {
  const p = entrada.pedido;
  return {
    id: entrada.id,
    novo: false,
    evento: p.evento,
    nome: p.cliente.nome,
    telefone: mascararTelefone(p.cliente.telefone),
    itens: p.itens.map((item) => ({
      id: item.id,
      descricao: item.descricao,
      quantidade: item.quantidade,
      fotos: item.fotos.map((chave) => ({ chave, ...entrada.fotos[chave] })),
    })),
    valor: centavosParaValor(p.valorCentavos),
    observacao: p.observacao,
    status: p.status,
    criadoEm: p.criadoEm,
  };
}

export function pedidoParaForm(pedido: PedidoEventoJson): PedidoForm {
  return {
    id: pedido._id,
    novo: false,
    evento: pedido.evento,
    nome: pedido.cliente.nome,
    telefone: mascararTelefone(pedido.cliente.telefone),
    itens: pedido.itens.map((item) => ({
      id: item.id,
      descricao: item.descricao,
      quantidade: item.quantidade,
      fotos: item.fotos.map((url) => ({ chave: url, url })),
    })),
    valor: centavosParaValor(pedido.valorCentavos),
    observacao: pedido.observacao,
    status: pedido.status,
    criadoEm: pedido.criadoEm,
  };
}
