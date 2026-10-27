import { NextResponse } from "next/server";
import { ErroKit } from "./repository";

/** `ErroKit` vira o status dele; qualquer outra falha sobe como 500 (visível na aba Network). */
export function respostaDeErroKit(falha: unknown) {
  if (falha instanceof ErroKit) {
    return NextResponse.json({ erro: falha.message, ...falha.extra }, { status: falha.status });
  }
  throw falha;
}
