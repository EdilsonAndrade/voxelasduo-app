import { NextResponse } from "next/server";
import { consultarCustoVenda, resolverCategoriaParaSimulacao } from "@/lib/estoque/canais/mercadoLivre/precos";

interface SimularPrecoPayload {
  nome?: unknown;
  categoria?: unknown;
  precoReais?: unknown;
}

/**
 * Simula a comissão real do Mercado Livre para um preço/categoria ainda não
 * necessariamente salvos (contracts/simular-preco.md) — usada tanto no
 * cadastro quanto na edição de produto, antes de o produto (ou o anúncio)
 * existir.
 */
export async function POST(request: Request) {
  const payload = (await request.json()) as SimularPrecoPayload;

  const nome = payload.nome;
  const categoria = payload.categoria;
  const precoReais = payload.precoReais;

  const camposInvalidos: Record<string, string> = {};
  if (typeof nome !== "string" || nome.trim().length === 0) {
    camposInvalidos.nome = "Informe o nome do produto.";
  }
  if (typeof categoria !== "string" || categoria.trim().length === 0) {
    camposInvalidos.categoria = "Informe a categoria do produto.";
  }
  if (typeof precoReais !== "number" || !Number.isFinite(precoReais) || precoReais <= 0) {
    camposInvalidos.precoReais = "O preço deve ser maior que zero.";
  }

  if (Object.keys(camposInvalidos).length > 0) {
    return NextResponse.json(
      { erro: "entrada_invalida", campos: camposInvalidos },
      { status: 400 }
    );
  }

  try {
    const categoryId = await resolverCategoriaParaSimulacao(nome as string, categoria as string);

    if (!categoryId) {
      return NextResponse.json(
        {
          erro: "categoria_nao_encontrada",
          mensagem:
            "Não foi possível determinar uma categoria do Mercado Livre para essa combinação de nome/categoria.",
        },
        { status: 404 }
      );
    }

    const comissao = await consultarCustoVenda({ categoryId, precoReais: precoReais as number });
    return NextResponse.json(comissao);
  } catch {
    return NextResponse.json(
      {
        erro: "falha_mercado_livre",
        mensagem: "Não foi possível consultar a comissão no Mercado Livre no momento.",
      },
      { status: 502 }
    );
  }
}
