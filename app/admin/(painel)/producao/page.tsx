import type { Metadata } from "next";
import PainelProducao from "@/components/admin/producao/PainelProducao";
import { listarProdutos } from "@/lib/produtos/repository";

export const metadata: Metadata = {
  title: "Produção · painel Voxelas Duo",
};

/**
 * Área de produção do admin (EDI-127). O servidor só prepara a lista de
 * produtos para os selects de mapeamento; o resto é carregado pelo painel,
 * que precisa recarregar vários blocos juntos depois de cada ação.
 */
export default async function ProducaoPage() {
  const produtos = await listarProdutos();

  return (
    <PainelProducao
      produtos={produtos
        .map((produto) => ({ id: produto._id!.toString(), nome: produto.nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))}
    />
  );
}
