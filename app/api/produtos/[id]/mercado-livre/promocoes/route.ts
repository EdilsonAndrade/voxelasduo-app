import { NextResponse } from "next/server";
import { buscarProdutoPorId } from "@/lib/produtos/repository";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import { calcularPrecoMinimoCanal, type TaxaCanal } from "@/lib/produtos/canais";
import {
  consultarCustoVenda,
  resolverCategoriaParaSimulacao,
} from "@/lib/estoque/canais/mercadoLivre/precos";
import { listarPromocoesElegiveis } from "@/lib/estoque/canais/mercadoLivre/promocoes";
import { obterVendedorId } from "@/lib/estoque/canais/mercadoLivre/mensagens";
import { obterAccessTokenValido } from "@/lib/estoque/canais/mercadoLivre/auth";

function ehErroDeToken(erro: unknown): boolean {
  return (
    erro instanceof Error &&
    (erro.message.includes("renovar token") || erro.message.includes("credencial do Mercado Livre"))
  );
}

type Params = { params: Promise<{ id: string }> };

/**
 * Promoções elegíveis do Mercado Livre para um produto (EDI-108, US3) —
 * protegida pelo proxy `/api/produtos/:path*`. Sem preço mínimo calculável
 * (custo/categoria ausentes) ou sem publicação no ML, devolve 404 com o
 * motivo específico em vez de quebrar; falha na consulta ao Mercado Livre
 * nunca é mascarada (contracts/preco-piso-canal.md).
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const produto = await buscarProdutoPorId(id);

  if (!produto) {
    return NextResponse.json(
      { erro: "produto_nao_encontrado", mensagem: "Produto não encontrado." },
      { status: 404 }
    );
  }

  const mercadoLivreId = produto.integracoes?.mercadoLivreId;
  if (!mercadoLivreId) {
    return NextResponse.json(
      {
        erro: "produto_nao_publicado",
        mensagem: "Este produto ainda não está publicado no Mercado Livre.",
      },
      { status: 404 }
    );
  }

  if (!produto.custoProducao) {
    return NextResponse.json(
      {
        erro: "custo_nao_configurado",
        mensagem: "Configure o custo de produção deste produto para calcular o preço mínimo.",
      },
      { status: 404 }
    );
  }

  try {
    const [taxasGlobais, token] = await Promise.all([buscarTaxasCanais(), obterAccessTokenValido()]);
    const margemMinimaPercentual =
      produto.taxasCanais?.margemMinimaPercentual ?? taxasGlobais.margemMinimaPercentual;

    const categoryId =
      produto.integracoes?.mercadoLivreCategoriaId ??
      (await resolverCategoriaParaSimulacao(produto.nome, produto.categoria));

    if (!categoryId) {
      return NextResponse.json(
        {
          erro: "categoria_nao_encontrada",
          mensagem: "Não foi possível identificar a categoria deste produto no Mercado Livre.",
        },
        { status: 404 }
      );
    }

    const precoAtualMLCentavos = produto.precosCanais?.mercadoLivre ?? produto.preco;
    const comissao = await consultarCustoVenda({
      categoryId,
      precoReais: precoAtualMLCentavos / 100,
    });
    const taxaML: TaxaCanal = {
      percentual: comissao.percentageFee,
      fixaCentavos: comissao.fixedFeeCentavos,
    };

    const cogs = calcularCustoProducao(produto.custoProducao);
    const precoMinimoCentavos = calcularPrecoMinimoCanal(
      cogs.totalCentavos,
      taxaML,
      margemMinimaPercentual
    );

    const sellerId = Number(await obterVendedorId(token));
    const candidatas = await listarPromocoesElegiveis(mercadoLivreId, sellerId);

    const promocoes = candidatas.map((candidata) => {
      const valeAPena =
        precoMinimoCentavos !== null && candidata.precoPromocionalCentavos >= precoMinimoCentavos;
      const comissaoNoPreco =
        Math.round((candidata.precoPromocionalCentavos * taxaML.percentual) / 100) +
        taxaML.fixaCentavos;
      return {
        ...candidata,
        valeAPena,
        lucroEstimadoCentavos: valeAPena
          ? candidata.precoPromocionalCentavos - cogs.totalCentavos - comissaoNoPreco
          : null,
      };
    });

    return NextResponse.json({ margemMinimaPercentual, precoMinimoCentavos, promocoes });
  } catch (erro) {
    if (ehErroDeToken(erro)) {
      return NextResponse.json(
        { erro: "token_invalido", mensagem: "Reconecte a conta do Mercado Livre para continuar." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        erro: "falha_mercado_livre",
        mensagem: "Não foi possível consultar as promoções do Mercado Livre no momento.",
      },
      { status: 502 }
    );
  }
}
