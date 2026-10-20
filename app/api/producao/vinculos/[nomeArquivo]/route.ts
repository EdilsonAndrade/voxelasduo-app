import { NextResponse } from "next/server";
import { definirHorarioTermino, removerVinculo } from "@/lib/producao/repository";

const HORARIO = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Grava o horário em que a placa deve terminar ("HH:MM"); `null` volta ao
 * padrão. Mesmo cuidado do DELETE com o `nomeArquivo` percent-encoded.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ nomeArquivo: string }> }
) {
  const { nomeArquivo } = await params;
  const nome = decodeURIComponent(nomeArquivo);
  const corpo = await request.json().catch(() => null);
  const horario = corpo?.horarioTermino;

  if (horario !== null && (typeof horario !== "string" || !HORARIO.test(horario))) {
    return NextResponse.json(
      { erro: "Informe `horarioTermino` no formato HH:MM (ou null para o padrão)." },
      { status: 400 }
    );
  }

  const atualizado = await definirHorarioTermino(nome, horario);
  if (!atualizado) {
    return NextResponse.json({ erro: "Vínculo não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ nomeArquivo: nome, horarioTermino: horario });
}

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
