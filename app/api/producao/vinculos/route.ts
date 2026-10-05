import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { buscarProdutoPorId } from "@/lib/produtos/repository";
import { listarVinculos, salvarVinculo } from "@/lib/producao/repository";
import { PARTE_PECA_UNICA } from "@/lib/models/producao";

export async function GET() {
  const vinculos = await listarVinculos();
  return NextResponse.json({ vinculos });
}

interface Payload {
  nomeArquivo?: string;
  produtoId?: string;
  parte?: string;
  rendimentoPorPlaca?: number;
  unidadesPorProduto?: number;
}

function inteiroPositivo(valor: unknown): boolean {
  return typeof valor === "number" && Number.isInteger(valor) && valor > 0;
}

/**
 * Cria ou atualiza o vínculo de um nome de arquivo com uma **parte** de um
 * produto (FR-013 a FR-015). Vários nomes podem apontar para o mesmo produto,
 * cada um como uma parte distinta; peça única é o caso de uma parte só.
 */
export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  const nomeArquivo = payload.nomeArquivo?.trim();
  if (!nomeArquivo) {
    return NextResponse.json({ erro: "Informe o nome do arquivo." }, { status: 400 });
  }

  if (!payload.produtoId || !ObjectId.isValid(payload.produtoId)) {
    return NextResponse.json({ erro: "Produto inválido." }, { status: 400 });
  }

  if (!inteiroPositivo(payload.rendimentoPorPlaca)) {
    return NextResponse.json(
      { erro: "Rendimento por placa deve ser um inteiro maior que zero." },
      { status: 400 }
    );
  }

  const unidadesPorProduto = payload.unidadesPorProduto ?? 1;
  if (!inteiroPositivo(unidadesPorProduto)) {
    return NextResponse.json(
      { erro: "Unidades por produto deve ser um inteiro maior que zero." },
      { status: 400 }
    );
  }

  const produto = await buscarProdutoPorId(payload.produtoId);
  if (!produto) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }

  const vinculo = await salvarVinculo({
    nomeArquivo,
    produtoId: new ObjectId(payload.produtoId),
    parte: payload.parte?.trim() || PARTE_PECA_UNICA,
    rendimentoPorPlaca: payload.rendimentoPorPlaca!,
    unidadesPorProduto,
  });

  return NextResponse.json({ vinculo });
}
