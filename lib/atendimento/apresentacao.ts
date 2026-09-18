import type { Produto } from "@/lib/models/produto";
import type { Pedido } from "@/lib/models/pedido";
import type {
  MensagemPosVendaMercadoLivre,
  PerguntaMercadoLivre,
  ReclamacaoMercadoLivre,
} from "@/lib/models/atendimento";

export interface ItemAtendimento {
  id: string;
  texto: string;
  linkOrigem: string;
  criadoEm: Date;
  /** Nome do produto do catálogo (pergunta) ou identificação do pedido (reclamação/mensagem), quando houver vínculo. */
  referencia?: string;
}

/** Monta o item de "Perguntas pendentes" a partir do documento persistido (FR-006, FR-013). */
export function paraItemPergunta(pergunta: PerguntaMercadoLivre, produto?: Produto | null): ItemAtendimento {
  return {
    id: pergunta._id!.toString(),
    texto: pergunta.texto,
    linkOrigem: pergunta.linkOrigem,
    criadoEm: pergunta.criadoEm,
    referencia: produto?.nome,
  };
}

/** Monta o item de "Reclamações pendentes" (FR-007, FR-013), com o motivo como texto principal. */
export function paraItemReclamacao(
  reclamacao: ReclamacaoMercadoLivre,
  pedido?: Pedido | null
): ItemAtendimento {
  return {
    id: reclamacao._id!.toString(),
    texto: reclamacao.motivo,
    linkOrigem: reclamacao.linkOrigem,
    criadoEm: reclamacao.criadoEm,
    referencia: pedido ? `Pedido de ${pedido.cliente.nome}` : undefined,
  };
}

/** Monta o item de "Mensagens pendentes" (FR-009, FR-013). */
export function paraItemMensagem(
  mensagem: MensagemPosVendaMercadoLivre,
  pedido?: Pedido | null
): ItemAtendimento {
  return {
    id: mensagem._id!.toString(),
    texto: mensagem.texto,
    linkOrigem: mensagem.linkOrigem,
    criadoEm: mensagem.criadoEm,
    referencia: pedido ? `Pedido de ${pedido.cliente.nome}` : undefined,
  };
}
