import { notFound } from "next/navigation";
import ProdutosCarrosselOrdem from "@/components/admin/ProdutosCarrosselOrdem";
import SecaoHomeForm from "@/components/admin/SecaoHomeForm";
import { buscarSecao } from "@/lib/home/repository";
import { paraProdutoCarrossel } from "@/lib/home/secoesPublicas";
import { dadosEditaveis } from "@/lib/home/serializacao";
import { ROTULOS_TIPO_SECAO } from "@/lib/models/secaoHome";
import { listarProdutosPorIds } from "@/lib/produtos/repository";
import styles from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";

export default async function EditarSecaoHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ criada?: string }>;
}) {
  const [{ id }, { criada }] = await Promise.all([params, searchParams]);
  const secao = await buscarSecao(id);

  if (!secao) notFound();

  let produtosCarrossel = null;
  if (secao.tipo === "carrossel") {
    const produtos = await listarProdutosPorIds(secao.produtoIds);
    const porId = new Map(produtos.map((p) => [p._id!.toString(), p]));
    // Mantém a ordem de `produtoIds` e ignora produtos que não existem mais.
    produtosCarrossel = secao.produtoIds
      .map((pid) => porId.get(pid.toString()))
      .filter((p) => p !== undefined)
      .map(paraProdutoCarrossel);
  }

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Editar {ROTULOS_TIPO_SECAO[secao.tipo].toLowerCase()}</h1>
      </div>
      <SecaoHomeForm
        id={id}
        inicial={dadosEditaveis(secao)}
        mensagemInicial={criada ? "Seção criada." : undefined}
      />
      {produtosCarrossel && <ProdutosCarrosselOrdem secaoId={id} produtosIniciais={produtosCarrossel} />}
    </div>
  );
}
