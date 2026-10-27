import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import EditorKit from "@/components/admin/kits/EditorKit";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import { valoresDoComponente } from "@/lib/kits/componentes";
import { buscarKitDetalhe } from "@/lib/kits/repository";
import { PLANOS_IMPRESSAO_COLLECTION, type PlanoImpressao } from "@/lib/models/planoImpressao";
import { totalMinutos } from "@/lib/producao/planosImpressao";
import { VAZIO_CUSTO_PRODUCAO } from "@/lib/produtos/custoProducaoFormulario";
import { listarProdutos } from "@/lib/produtos/repository";

export const metadata: Metadata = {
  title: "Kit · painel Voxelas Duo",
};

export const dynamic = "force-dynamic";

/** Editor do kit (specs/037) — `novo` abre um kit vazio. */
export default async function KitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const novo = id === "novo";
  if (!novo && !ObjectId.isValid(id)) notFound();

  const client = await getMongoClient();
  const [taxasGlobais, kit, produtos, planos] = await Promise.all([
    buscarTaxasCanais(),
    novo ? null : buscarKitDetalhe(id),
    listarProdutos(),
    client
      .db(DB_NAME)
      .collection<PlanoImpressao>(PLANOS_IMPRESSAO_COLLECTION)
      .find({ produtoId: { $type: "string" } }, { projection: { produtoId: 1, itens: 1 } })
      .toArray(),
  ]);
  if (!novo && !kit) notFound();

  const minutos = new Map(planos.map((p) => [p.produtoId!, totalMinutos(p.itens)]));

  return (
    <EditorKit
      kitInicial={kit}
      taxasGlobais={taxasGlobais}
      embalagemPadraoCentavos={Math.round(Number(VAZIO_CUSTO_PRODUCAO.custoEmbalagemReais) * 100)}
      produtos={produtos
        .map((p) => {
          const produtoId = p._id!.toString();
          return {
            id: produtoId,
            nome: p.nome,
            valores: valoresDoComponente(p, minutos.get(produtoId)),
            deKit: Boolean(p.kitId),
          };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))}
    />
  );
}
