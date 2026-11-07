import Link from "next/link";
import { notFound } from "next/navigation";
import ProdutoForm from "@/components/admin/ProdutoForm";
import ProducaoDoProduto from "@/components/admin/producao/ProducaoDoProduto";
import VariacoesKit from "@/components/admin/VariacoesKit";
import { buscarProdutoPorId, listarProdutos } from "@/lib/produtos/repository";
import { motivoPecaInvalida, temVariacoes } from "@/lib/produtos/variacoes";
import { custoDaPeca } from "@/lib/produtos/variacoesRepository";
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
  const [produto, categorias, calculo, catalogo] = await Promise.all([
    buscarProdutoPorId(id),
    listarCategoriasResumo(),
    buscarCalculoDoProduto(id),
    listarProdutos(),
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
        comVariacoes={temVariacoes(produto)}
      />
      {!produto.kitId && (
        <VariacoesKit
          produtoId={id}
          fotos={produto.fotos}
          variacoesIniciais={produto.variacoes ?? []}
          catalogo={catalogo.map((p) => ({
            id: p._id!.toString(),
            nome: p.nome,
            custoCentavos: custoDaPeca(p),
            bloqueio: motivoPecaInvalida(p),
          }))}
          taxaSite={{
            percentual: produto.taxasCanais?.siteTaxaPercentual ?? taxasGlobais.siteTaxaPercentual,
            fixaCentavos: produto.taxasCanais?.siteTaxaFixaCentavos ?? taxasGlobais.siteTaxaFixaCentavos,
          }}
        />
      )}
      <ProducaoDoProduto produtoId={id} />
    </div>
  );
}
