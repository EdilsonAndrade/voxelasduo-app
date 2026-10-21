import type { Metadata } from "next";
import ControleVendas from "@/components/admin/controleVendas/ControleVendas";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import { listarItensControle } from "@/lib/controleVendas/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Controle de vendas · painel Voxelas Duo",
};

/** Produção e vendas lançadas à mão por produto, com lucro por canal, impressão e exportação. */
export default async function ControleVendasPage() {
  const [itens, taxas] = await Promise.all([listarItensControle(), buscarTaxasCanais()]);
  return <ControleVendas itensIniciais={itens} taxas={taxas} />;
}
