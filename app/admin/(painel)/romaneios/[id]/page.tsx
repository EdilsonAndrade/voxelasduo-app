import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import EditorRomaneio from "@/components/admin/romaneios/EditorRomaneio";
import { listarPlanos } from "@/lib/producao/planosImpressaoRepository";
import { estaPublicado } from "@/lib/produtos/publicacao";
import { listarProdutos } from "@/lib/produtos/repository";
import { opcoesDeBusca } from "@/lib/romaneios/opcoes";
import { buscarRomaneio } from "@/lib/romaneios/repository";

export const metadata: Metadata = {
  title: "Romaneio · painel Voxelas Duo",
};

export const dynamic = "force-dynamic";

/** Editor do romaneio (specs/038) — `novo` abre um romaneio vazio com um lugar. */
export default async function RomaneioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const novo = id === "novo";
  if (!novo && !ObjectId.isValid(id)) notFound();

  const [romaneio, produtos, planos] = await Promise.all([novo ? null : buscarRomaneio(id), listarProdutos(), listarPlanos()]);
  if (!novo && !romaneio) notFound();

  const opcoes = opcoesDeBusca(
    produtos.map((p) => ({ id: p._id!.toString(), nome: p.nome, precoCentavos: p.preco, publicado: estaPublicado(p) })),
    planos.map((p) => ({ id: p.id, produtoId: p.produtoId, nome: p.nome, itens: p.itens }))
  );

  return <EditorRomaneio key={id} inicial={romaneio} opcoes={opcoes} />;
}
