import { notFound, redirect } from "next/navigation";
import ProdutoForm from "@/components/admin/ProdutoForm";
import styles from "@/components/admin/admin.module.css";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import { buscarProdutoPorId } from "@/lib/produtos/repository";
import { produtoParaDuplicar } from "@/lib/produtos/produtoFormulario";
import { listarCategoriasResumo } from "@/lib/categorias/repository";
import { totalMinutos } from "@/lib/producao/planosImpressao";
import { buscarPlano } from "@/lib/producao/planosImpressaoRepository";

// Precisa do padrão global de taxas atual — não pode ser pré-renderizada no build.
export const dynamic = "force-dynamic";

export default async function NovoProdutoPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicarDe?: string; planoImpressao?: string }>;
}) {
  const { duplicarDe, planoImpressao } = await searchParams;
  const [taxasGlobais, original, categorias, plano] = await Promise.all([
    buscarTaxasCanais(),
    duplicarDe ? buscarProdutoPorId(duplicarDe) : null,
    listarCategoriasResumo(),
    // Item avulso do Tempo de Impressão virando produto (specs/035).
    !duplicarDe && planoImpressao ? buscarPlano(planoImpressao) : null,
  ]);

  if (duplicarDe && !original) {
    notFound();
  }
  if (planoImpressao && !duplicarDe) {
    if (!plano) notFound();
    // Já virou produto: abre o cadastro dele em vez de criar outro.
    if (plano.produtoId) redirect(`/admin/produtos/${plano.produtoId}/editar`);
  }
  const minutos = plano ? totalMinutos(plano.itens) : 0;

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>{original ? `Duplicar produto: ${original.nome}` : "Novo produto"}</h1>
      </div>
      <ProdutoForm
        taxasGlobais={taxasGlobais}
        categorias={categorias}
        valoresIniciais={original ? produtoParaDuplicar(original) : undefined}
        doTempoImpressao={
          plano
            ? {
                planoId: plano._id!.toString(),
                nome: plano.nome ?? "",
                tempoImpressaoHoras: minutos > 0 ? String(Math.round((minutos / 60) * 100) / 100) : "",
              }
            : undefined
        }
      />
    </div>
  );
}
