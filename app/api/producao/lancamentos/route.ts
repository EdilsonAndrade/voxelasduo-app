import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { sincronizarAnuncioProduto } from "@/lib/estoque/sincronizacao";
import { buscarProdutoPorId, incrementarEstoque } from "@/lib/produtos/repository";
import {
  conjuntosDisponiveis,
  dividirConsumo,
  planejarLancamento,
} from "@/lib/producao/lancamento";
import {
  consumirSaldoImpressao,
  listarImpressoesPorNomes,
  listarVinculosDoProduto,
  registrarLancamento,
} from "@/lib/producao/repository";
import type { ConsumoLancamento } from "@/lib/models/producao";

interface Payload {
  produtoId?: string;
  quantidade?: number;
  quantidadePerdida?: number;
}

function inteiroNaoNegativo(valor: unknown): boolean {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 0;
}

/**
 * Dá entrada no estoque a partir da produção (FR-032 a FR-039).
 *
 * É o **único** caminho pelo qual esta feature altera estoque: a importação
 * nunca mexe (FR-037). A idempotência vem do saldo da impressão, consumido
 * com atualização atômica (`consumirSaldoImpressao`), então repetir a chamada
 * não lança o dobro.
 *
 * Não há transação entre as partes de um produto multipartes: o consumo é uma
 * atualização atômica por impressão e o documento de lançamento registra o
 * que foi efetivamente consumido (research.md #7).
 */
export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  if (!payload.produtoId || !ObjectId.isValid(payload.produtoId)) {
    return NextResponse.json({ erro: "Produto inválido." }, { status: 400 });
  }

  const quantidade = payload.quantidade ?? 0;
  const quantidadePerdida = payload.quantidadePerdida ?? 0;

  if (!inteiroNaoNegativo(quantidade) || !inteiroNaoNegativo(quantidadePerdida)) {
    return NextResponse.json(
      { erro: "Quantidade e perda devem ser inteiros não negativos." },
      { status: 400 }
    );
  }
  if (quantidade + quantidadePerdida <= 0) {
    return NextResponse.json(
      { erro: "Quantidade deve ser um inteiro maior que zero." },
      { status: 400 }
    );
  }

  const produto = await buscarProdutoPorId(payload.produtoId);
  if (!produto) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }

  const vinculos = await listarVinculosDoProduto(new ObjectId(payload.produtoId));
  if (vinculos.length === 0) {
    return NextResponse.json(
      { erro: "Produto não possui vínculo de produção." },
      { status: 409 }
    );
  }

  const impressoes = await listarImpressoesPorNomes(vinculos.map((v) => v.nomeArquivo));
  const total = quantidade + quantidadePerdida;
  const plano = planejarLancamento(vinculos, impressoes, total);

  if (!plano) {
    const disponiveis = conjuntosDisponiveis(vinculos, impressoes);
    return NextResponse.json(
      {
        erro:
          disponiveis === 0
            ? "Saldo insuficiente: não há conjuntos completos disponíveis."
            : `Saldo insuficiente: há ${disponiveis} ${
                disponiveis === 1 ? "conjunto completo" : "conjuntos completos"
              } disponíveis.`,
      },
      { status: 409 }
    );
  }

  const itens = dividirConsumo(plano, quantidade, vinculos);
  const consumo: ConsumoLancamento[] = [];

  for (const item of itens) {
    const ok = await consumirSaldoImpressao(
      item.impressao._id!,
      item.lancadas,
      item.perdidas,
      item.rendimentoPorPlaca
    );

    if (!ok) {
      // Outra requisição consumiu o saldo no meio do caminho. Registra o que
      // já foi consumido (para o estoque não ficar sem rastro) e devolve o
      // erro real, em vez de prosseguir com um lançamento parcial silencioso.
      if (consumo.length > 0) {
        const lancadasAteAqui = itens
          .slice(0, consumo.length)
          .reduce((t, i) => t + i.lancadas, 0);
        await registrarLancamento({
          produtoId: produto._id!,
          quantidade: 0,
          quantidadePerdida: 0,
          consumo,
          usuarioEmail: (await auth())?.user?.email ?? undefined,
        });
        return NextResponse.json(
          {
            erro: `Saldo consumido por outra operação no meio do lançamento. ${lancadasAteAqui} unidades de partes foram reservadas e precisam de conferência.`,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { erro: "Saldo insuficiente: outra operação consumiu as peças." },
        { status: 409 }
      );
    }

    consumo.push({
      impressaoId: item.impressao._id!,
      parte: item.parte,
      unidades: item.unidades,
    });
  }

  const atualizado = quantidade > 0 ? await incrementarEstoque(payload.produtoId, quantidade) : produto;

  const lancamento = await registrarLancamento({
    produtoId: produto._id!,
    quantidade,
    quantidadePerdida,
    consumo,
    usuarioEmail: (await auth())?.user?.email ?? undefined,
  });

  // Propaga aos canais pelo mesmo caminho do abatimento por venda: falha de
  // canal vira pendência na fila, nunca exceção para quem lançou (FR-039).
  if (quantidade > 0) {
    await sincronizarAnuncioProduto(payload.produtoId, undefined);
  }

  return NextResponse.json({
    lancamentoId: lancamento._id!.toString(),
    estoqueAtual: atualizado?.estoque ?? produto.estoque,
    consumo: consumo.map((c) => ({
      impressaoId: c.impressaoId.toString(),
      parte: c.parte,
      unidades: c.unidades,
    })),
  });
}
