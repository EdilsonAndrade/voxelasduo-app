import { ROTULO_SITUACAO_LINK, type SituacaoLink } from "@/lib/models/linkPagamento";
import type { LinkComPedido } from "./repository";
import { situacaoDoLink, totaisDoLink, type TotaisLink } from "./regras";

/** Link pronto para JSON/props do admin (ids em texto, datas ISO). */
export interface LinkPagamentoResumo {
  id: string;
  codigo: string;
  clienteNome?: string;
  observacao?: string;
  itens: {
    produtoId: string;
    variacaoId?: string;
    nome: string;
    foto?: string;
    quantidade: number;
    precoOriginalCentavos: number;
    precoCentavos: number;
  }[];
  freteGratis: boolean;
  validoAte: string;
  criadoEm: string;
  situacao: SituacaoLink;
  rotuloSituacao: string;
  pedidoId?: string;
  numeroPedido?: number;
  totais: TotaisLink;
}

export function paraLinkResumo({ link, statusPedido, numeroPedido }: LinkComPedido, agora = new Date()): LinkPagamentoResumo {
  const situacao = situacaoDoLink(link, statusPedido, agora);
  return {
    id: link._id!.toString(),
    codigo: link.codigo,
    ...(link.clienteNome ? { clienteNome: link.clienteNome } : {}),
    ...(link.observacao ? { observacao: link.observacao } : {}),
    itens: link.itens.map((item) => ({
      produtoId: item.produtoId.toString(),
      ...(item.variacaoId ? { variacaoId: item.variacaoId } : {}),
      nome: item.nome,
      ...(item.foto ? { foto: item.foto } : {}),
      quantidade: item.quantidade,
      precoOriginalCentavos: item.precoOriginalCentavos,
      precoCentavos: item.precoCentavos,
    })),
    freteGratis: link.freteGratis,
    validoAte: link.validoAte.toISOString(),
    criadoEm: link.criadoEm.toISOString(),
    situacao,
    rotuloSituacao: ROTULO_SITUACAO_LINK[situacao],
    ...(link.pedidoId ? { pedidoId: link.pedidoId.toString() } : {}),
    ...(numeroPedido ? { numeroPedido } : {}),
    totais: totaisDoLink(link.itens),
  };
}
