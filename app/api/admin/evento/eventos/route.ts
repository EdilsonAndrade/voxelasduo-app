import { NextResponse } from "next/server";
import { listarEventos } from "@/lib/eventos/repository";

/** Eventos já usados, do mais recente para o mais antigo (sugestões do campo "Evento"). */
export async function GET() {
  return NextResponse.json({ eventos: await listarEventos() });
}
