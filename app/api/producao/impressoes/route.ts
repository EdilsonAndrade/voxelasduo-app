import { NextResponse } from "next/server";
import { listarImpressoesComVinculo, type FiltroConsulta } from "@/lib/producao/consulta";
import type { ResultadoImpressao } from "@/lib/models/producao";

function data(valor: string | null): Date | undefined {
  if (!valor) return undefined;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function inteiro(valor: string | null): number | undefined {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/** Lista as impressões importadas, com o vínculo resolvido (contracts/producao-api.md). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const resultado = searchParams.get("resultado");
  const vinculo = searchParams.get("vinculo");

  const filtro: FiltroConsulta = {
    de: data(searchParams.get("de")),
    ate: data(searchParams.get("ate")),
    produtoId: searchParams.get("produtoId") ?? undefined,
    impressoraId: searchParams.get("impressoraId") ?? undefined,
    resultado:
      resultado === "concluida" || resultado === "interrompida"
        ? (resultado as ResultadoImpressao)
        : undefined,
    vinculo: vinculo === "comVinculo" || vinculo === "semVinculo" ? vinculo : undefined,
    pagina: inteiro(searchParams.get("pagina")),
    porPagina: inteiro(searchParams.get("porPagina")),
  };

  const { total, impressoes } = await listarImpressoesComVinculo(filtro);
  return NextResponse.json({ total, impressoes });
}
