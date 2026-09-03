import { NextResponse } from "next/server";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { PEDIDOS_COLLECTION, type Pedido } from "@/lib/models/pedido";

// Esqueleto da rota: lista pedidos sem regra de negócio de checkout/pagamento.
// Fluxo completo é escopo das Tarefas 3-5 (EDI-76 a EDI-78).
export async function GET() {
  const client = await getMongoClient();
  const pedidos = await client
    .db(DB_NAME)
    .collection<Pedido>(PEDIDOS_COLLECTION)
    .find({})
    .toArray();

  return NextResponse.json({ pedidos });
}
