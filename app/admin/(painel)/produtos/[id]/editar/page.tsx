import { notFound } from "next/navigation";
import ProdutoForm from "@/components/admin/ProdutoForm";
import { buscarProdutoPorId } from "@/lib/produtos/repository";
import { custoProducaoParaFormulario } from "@/lib/produtos/custoProducaoFormulario";
import { embalagemEnvioParaFormulario } from "@/lib/produtos/embalagemEnvioFormulario";
import { fichaTecnicaParaFormulario } from "@/lib/produtos/fichaTecnicaFormulario";
import { taxasCanaisParaFormulario } from "@/lib/produtos/taxasCanaisFormulario";
import { precosCanaisParaFormulario } from "@/lib/produtos/precosCanaisFormulario";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import styles from "@/components/admin/admin.module.css";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [produto, taxasGlobais] = await Promise.all([buscarProdutoPorId(id), buscarTaxasCanais()]);

  if (!produto) {
    notFound();
  }

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Editar produto</h1>
      </div>
      <ProdutoForm
        taxasGlobais={taxasGlobais}
        valoresIniciais={{
          id,
          nome: produto.nome,
          descricao: produto.descricao,
          precoReais: (produto.preco / 100).toFixed(2),
          estoque: String(produto.estoque),
          categoria: produto.categoria,
          fotos: produto.fotos,
          mercadoLivreId: produto.integracoes?.mercadoLivreId ?? "",
          mercadoLivrePermalink: produto.integracoes?.mercadoLivrePermalink ?? "",
          mercadoLivrePausado: produto.integracoes?.mercadoLivrePausado ?? false,
          mercadoLivreCategoriaId: produto.integracoes?.mercadoLivreCategoriaId ?? "",
          mercadoLivreCategoriaCaminho: produto.integracoes?.mercadoLivreCategoriaCaminho ?? "",
          shopeeItemId: produto.integracoes?.shopeeItemId ?? "",
          custoProducao: custoProducaoParaFormulario(produto.custoProducao),
          taxasCanais: taxasCanaisParaFormulario(produto.taxasCanais),
          precosCanais: precosCanaisParaFormulario(produto.precosCanais),
          embalagemEnvio: embalagemEnvioParaFormulario(produto.embalagemEnvio),
          fichaTecnica: fichaTecnicaParaFormulario(produto.fichaTecnica),
        }}
      />
    </div>
  );
}
