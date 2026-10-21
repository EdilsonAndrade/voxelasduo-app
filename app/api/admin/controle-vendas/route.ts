import { NextResponse } from "next/server";
import { listarItensControle } from "@/lib/controleVendas/repository";

/** Produtos com produção e vendas lançadas à mão — protegido pelo proxy `/api/admin/*`. */
export async function GET() {
  return NextResponse.json({ itens: await listarItensControle() });
}
