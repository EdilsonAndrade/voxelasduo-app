import { NextResponse } from "next/server";
import {
  listarImpressorasDaConta,
  mensagemDoErro,
  statusDoErro,
} from "@/lib/producao/servico";

/**
 * Impressoras vinculadas à conta conectada. Serve ao seletor da importação —
 * uma conta pode ter mais de uma máquina, e nem sempre se quer o histórico de
 * todas junto.
 */
export async function GET() {
  try {
    const impressoras = await listarImpressorasDaConta();
    return NextResponse.json({ impressoras });
  } catch (erro) {
    return NextResponse.json({ erro: mensagemDoErro(erro) }, { status: statusDoErro(erro) });
  }
}
