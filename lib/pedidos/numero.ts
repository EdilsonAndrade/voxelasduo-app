import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";

const CONTADORES_COLLECTION = "contadores";
/** Primeiro número de pedido = 1001 (evita "#1", "#2" no começo). */
const NUMERO_INICIAL = 1000;

/** Próximo número sequencial e amigável de pedido (incremento atômico). */
export async function proximoNumeroPedido(): Promise<number> {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<{ _id: string; valor: number }>(CONTADORES_COLLECTION);
  const doc = await colecao.findOneAndUpdate(
    { _id: "pedidos" },
    { $inc: { valor: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return NUMERO_INICIAL + (doc?.valor ?? 1);
}

/**
 * Código exibido ao cliente e à loja: o número sequencial; pedidos antigos
 * (sem número) usam os 6 últimos caracteres do id, em maiúsculas.
 */
export function codigoPedido(pedido: { _id?: { toString(): string }; numero?: number }): string {
  if (pedido.numero) return String(pedido.numero);
  return (pedido._id?.toString() ?? "").slice(-6).toUpperCase();
}
