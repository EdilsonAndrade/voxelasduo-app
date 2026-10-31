import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import EditorKit, { type ItemInicialKit } from "@/components/admin/kits/EditorKit";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import { custoProducaoItemNovo, custoSemEmbalagem, valoresDoComponente } from "@/lib/kits/componentes";
import { pecaDoPlano } from "@/lib/kits/doTempoImpressao";
import { precoSugeridoItemNovo } from "@/lib/kits/precificacaoKit";
import { buscarKitDetalhe } from "@/lib/kits/repository";
import type { TaxasCanaisConfig } from "@/lib/models/configuracao";
import { MAXIMO_ITENS_KIT, type ValoresComponente } from "@/lib/models/kit";
import { PLANOS_IMPRESSAO_COLLECTION, type PlanoImpressao } from "@/lib/models/planoImpressao";
import { totalMinutos } from "@/lib/producao/planosImpressao";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import { VAZIO_CUSTO_PRODUCAO } from "@/lib/produtos/custoProducaoFormulario";
import { listarProdutos } from "@/lib/produtos/repository";

export const metadata: Metadata = {
  title: "Kit · painel Voxelas Duo",
};

export const dynamic = "force-dynamic";

interface OpcaoProduto {
  id: string;
  nome: string;
  valores: ValoresComponente;
  deKit: boolean;
}

/**
 * Itens enviados pelo Tempo de Impressão (`?planos=id,id`), na ordem escolhida:
 * plano de produto entra como o produto; item avulso entra como item novo, com
 * peso e tempo de 1 peça e o preço sugerido da loja. Margem = a do plano.
 */
function itensDosPlanos(
  ids: string[],
  planos: PlanoImpressao[],
  porId: Map<string, OpcaoProduto>,
  taxasGlobais: TaxasCanaisConfig
): { itens: ItemInicialKit[]; ignorados: string[] } {
  const itens: ItemInicialKit[] = [];
  const ignorados: string[] = [];
  const planoPorId = new Map(planos.map((p) => [p._id!.toString(), p]));

  for (const id of ids) {
    const plano = planoPorId.get(id);
    if (!plano) continue;
    const peca = pecaDoPlano(plano.itens);
    const nome = plano.nome ?? "Item sem nome";

    if (plano.produtoId) {
      const produto = porId.get(plano.produtoId);
      if (!produto) ignorados.push(`${nome}: o produto não está mais no catálogo.`);
      else if (produto.deKit) ignorados.push(`${produto.nome}: é o produto de um kit e não pode entrar em outro kit.`);
      else if (itens.some((i) => i.produtoId === produto.id)) continue;
      else itens.push({ produtoId: produto.id, valores: produto.valores, margemPercentual: peca.margemPercentual });
      continue;
    }

    const custo = peca.pesoGramas !== null ? custoProducaoItemNovo(peca.pesoGramas, peca.tempoMinutos) : null;
    const preco = custo ? precoSugeridoItemNovo(calcularCustoProducao(custo).totalCentavos, taxasGlobais) : null;
    if (!custo || !preco) {
      ignorados.push(`${nome}: informe o peso de todas as partes no Tempo de Impressão.`);
      continue;
    }
    itens.push({
      valores: {
        nome,
        precoCentavos: preco,
        pesoGramas: peca.pesoGramas,
        tempoMinutos: peca.tempoMinutos,
        custoCentavos: custoSemEmbalagem(custo),
      },
      margemPercentual: peca.margemPercentual,
    });
  }

  if (itens.length > MAXIMO_ITENS_KIT) {
    ignorados.push(`Só os ${MAXIMO_ITENS_KIT} primeiros itens entraram: é o máximo de um kit.`);
    itens.length = MAXIMO_ITENS_KIT;
  }
  return { itens, ignorados };
}

/** Editor do kit (specs/037) — `novo` abre um kit vazio, ou com os itens vindos do Tempo de Impressão. */
export default async function KitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ planos?: string }>;
}) {
  const [{ id }, { planos: planosParam }] = await Promise.all([params, searchParams]);
  const novo = id === "novo";
  if (!novo && !ObjectId.isValid(id)) notFound();
  const idsPlanos = novo
    ? [...new Set((planosParam ?? "").split(",").map((p) => p.trim()))].filter((p) => ObjectId.isValid(p))
    : [];

  const client = await getMongoClient();
  const [taxasGlobais, kit, produtos, planos, planosEnviados] = await Promise.all([
    buscarTaxasCanais(),
    novo ? null : buscarKitDetalhe(id),
    listarProdutos(),
    client
      .db(DB_NAME)
      .collection<PlanoImpressao>(PLANOS_IMPRESSAO_COLLECTION)
      .find({ produtoId: { $type: "string" } }, { projection: { produtoId: 1, itens: 1 } })
      .toArray(),
    idsPlanos.length > 0
      ? client
          .db(DB_NAME)
          .collection<PlanoImpressao>(PLANOS_IMPRESSAO_COLLECTION)
          .find({ _id: { $in: idsPlanos.map((p) => new ObjectId(p)) } })
          .toArray()
      : Promise.resolve([]),
  ]);
  if (!novo && !kit) notFound();

  const minutos = new Map(planos.map((p) => [p.produtoId!, totalMinutos(p.itens)]));
  const opcoes: OpcaoProduto[] = produtos
    .map((p) => {
      const produtoId = p._id!.toString();
      return {
        id: produtoId,
        nome: p.nome,
        valores: valoresDoComponente(p, minutos.get(produtoId)),
        deKit: Boolean(p.kitId),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
  const doTempoImpressao =
    idsPlanos.length > 0
      ? itensDosPlanos(idsPlanos, planosEnviados, new Map(opcoes.map((o) => [o.id, o])), taxasGlobais)
      : undefined;

  return (
    <EditorKit
      // Outra seleção do Tempo de Impressão monta o editor de novo, com os itens dela.
      key={novo ? `novo-${idsPlanos.join(",")}` : id}
      kitInicial={kit}
      doTempoImpressao={doTempoImpressao}
      taxasGlobais={taxasGlobais}
      embalagemPadraoCentavos={Math.round(Number(VAZIO_CUSTO_PRODUCAO.custoEmbalagemReais) * 100)}
      produtos={opcoes}
    />
  );
}
