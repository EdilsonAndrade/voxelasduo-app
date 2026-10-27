import Link from "next/link";
import { notFound } from "next/navigation";
import ProdutoForm from "@/components/admin/ProdutoForm";
import ProducaoDoProduto from "@/components/admin/producao/ProducaoDoProduto";
import { buscarProdutoPorId } from "@/lib/produtos/repository";
import { produtoParaFormulario } from "@/lib/produtos/produtoFormulario";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import { listarCategoriasResumo } from "@/lib/categorias/repository";
import { buscarCalculoDoProduto } from "@/lib/produtos/calculosPreco";
import { resumoDoKitDoProduto } from "@/lib/kits/repository";
import kitStyles from "@/components/admin/kits/kits.module.css";
import styles from "@/components/admin/admin.module.css";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // As taxas antes do produto: a primeira leitura delas migra as margens antigas do produto (spec 034).
  const taxasGlobais = await buscarTaxasCanais();
  const [produto, categorias, calculo] = await Promise.all([
    buscarProdutoPorId(id),
    listarCategoriasResumo(),
    buscarCalculoDoProduto(id),
  ]);

  if (!produto) {
    notFound();
  }

  // Produto gerado pelo montador de kits (specs/037): link de volta e aviso de preço desatualizado.
  const kit = produto.kitId ? await resumoDoKitDoProduto(produto.kitId) : null;

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Editar produto</h1>
        <div className={styles.barAcoes}>
          <Link href={`/admin/produtos/calculadora?produto=${id}`} className={styles.btnGhost}>
            {calculo ? "Ver cálculo de preço" : "Levar para a calculadora"}
          </Link>
        </div>
      </div>
      {kit && (
        <p className={kit.desatualizado ? kitStyles.avisoProdutoAlerta : kitStyles.avisoProduto}>
          Produto gerado pelo kit <Link href={`/admin/kits/${kit.id}`}>{kit.nome}</Link>.
          {kit.desatualizado
            ? " Algum item do kit mudou desde que o preço foi definido: revise o kit e atualize o produto."
            : " Preço, peso e itens inclusos vêm do kit: altere no kit e clique em “Atualizar produto do kit”."}
        </p>
      )}
      <ProdutoForm
        taxasGlobais={taxasGlobais}
        categorias={categorias}
        valoresIniciais={produtoParaFormulario(produto, id)}
        margensAntigas={produto.margensParaRevisar}
      />
      <ProducaoDoProduto produtoId={id} />
    </div>
  );
}
