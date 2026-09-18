import { ObjectId } from "mongodb";
import type { Pedido, RastreioPedido, StatusPedido } from "@/lib/models/pedido";
import { colecaoPedidos } from "./repository";

/**
 * Atualiza manualmente o status de um pedido a partir do painel administrativo
 * (Tarefa 8/EDI-81). Sem validação de transição de estado — quem opera é a
 * própria administradora, qualquer valor do enum é aceito a partir de
 * qualquer status atual (research.md #2). O chamador (rota) garante que
 * `novoStatus` já é um valor válido do enum antes de chegar aqui.
 */
export async function atualizarStatusPedido(
  id: string,
  novoStatus: StatusPedido
): Promise<Pedido | null> {
  const colecao = await colecaoPedidos();
  const resultado = await colecao.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { status: novoStatus, atualizadoEm: new Date() } },
    { returnDocument: "after" }
  );

  return resultado;
}

/** Registra/atualiza o rastreio de um pedido (Tarefa 10/EDI-84 — exibido em "Meus Pedidos"). */
export async function atualizarRastreioPedido(
  id: string,
  rastreio: RastreioPedido
): Promise<Pedido | null> {
  const colecao = await colecaoPedidos();
  const resultado = await colecao.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { rastreio, atualizadoEm: new Date() } },
    { returnDocument: "after" }
  );

  return resultado;
}

/**
 * Preenche ou limpa o aviso de "envio aguardando liberação para postagem"
 * (EDI-105 — substatus `buffered` do Mercado Livre). `data: null` limpa o
 * campo quando o envio deixa desse estado (research.md #3 do EDI-105).
 */
export async function atualizarAguardandoLiberacaoPedido(
  id: string,
  data: Date | null
): Promise<Pedido | null> {
  const colecao = await colecaoPedidos();
  const resultado = await colecao.findOneAndUpdate(
    { _id: new ObjectId(id) },
    data
      ? { $set: { envioAguardandoLiberacaoAte: data, atualizadoEm: new Date() } }
      : { $unset: { envioAguardandoLiberacaoAte: "" }, $set: { atualizadoEm: new Date() } },
    { returnDocument: "after" }
  );

  return resultado;
}
