import { NextResponse } from "next/server";
import { removerVinculo } from "@/lib/producao/repository";

/**
 * Remove o vínculo de um nome de arquivo — as impressões voltam para a lista
 * de pendentes (FR-017).
 *
 * O `nomeArquivo` chega **percent-encoded** no param de rota (comportamento
 * do Next 16, diferente de `searchParams`): decodificar antes de consultar,
 * senão um nome com espaço ou acento nunca é encontrado.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ nomeArquivo: string }> }
) {
  const { nomeArquivo } = await params;
  const nome = decodeURIComponent(nomeArquivo);

  const removido = await removerVinculo(nome);
  if (!removido) {
    return NextResponse.json({ erro: "Vínculo não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ removido: true, nomeArquivo: nome });
}
