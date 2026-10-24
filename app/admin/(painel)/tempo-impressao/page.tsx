import type { Metadata } from "next";
import PlanejamentoImpressao from "@/components/admin/tempoImpressao/PlanejamentoImpressao";
import { listarPlanos } from "@/lib/producao/planosImpressaoRepository";
import { listarProdutos } from "@/lib/produtos/repository";

export const metadata: Metadata = {
  title: "Tempo de Impressão · painel Voxelas Duo",
};

export const dynamic = "force-dynamic";

/** Planejamento de impressões (specs/035): produtos do catálogo (publicados ou não) e itens avulsos. */
export default async function TempoImpressaoPage({ searchParams }: { searchParams: Promise<{ produto?: string }> }) {
  const [{ produto }, planos, produtos] = await Promise.all([searchParams, listarPlanos(), listarProdutos()]);

  return (
    <PlanejamentoImpressao
      destacar={produto}
      planosIniciais={planos.map((plano) => ({
        chave: plano.id,
        id: plano.id,
        produtoId: plano.produtoId,
        produtoNome: plano.produtoNome,
        linkModelo3d: plano.linkModelo3d,
        itens: plano.itens,
      }))}
      produtos={produtos
        .map((p) => ({ id: p._id!.toString(), nome: p.nome, linkModelo3d: p.linkModelo3d }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))}
    />
  );
}
