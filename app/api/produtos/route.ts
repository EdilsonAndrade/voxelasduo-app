import { NextResponse } from "next/server";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { PRODUTOS_COLLECTION, type Produto } from "@/lib/models/produto";

// Esqueleto da rota: lista produtos sem paginação, filtro ou busca.
// CRUD completo é escopo da Tarefa 2 (EDI-75).
export async function GET() {
  const client = await getMongoClient();
  const produtos = await client
    .db(DB_NAME)
    .collection<Produto>(PRODUTOS_COLLECTION)
    .find({})
    .toArray();

  return NextResponse.json({ produtos });
}
