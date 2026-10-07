import { NextResponse } from "next/server";
import { listarNomesProdutos } from "@/lib/produtos/repository";

/** Nomes dos produtos do catálogo (sugestões do campo "O que é?" de cada item). */
export async function GET() {
  return NextResponse.json({ produtos: await listarNomesProdutos() });
}
