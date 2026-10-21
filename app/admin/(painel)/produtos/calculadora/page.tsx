import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CalculadoraRapida from "@/components/admin/CalculadoraRapida";
import CalculosSalvos from "@/components/admin/CalculosSalvos";
import styles from "@/components/admin/admin.module.css";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import { valoresDoProduto } from "@/lib/produtos/calculadoraDoProduto";
import { normalizarValores } from "@/lib/produtos/calculadoraValores";
import { buscarCalculoDoProduto, buscarCalculoPreco, listarCalculosPreco } from "@/lib/produtos/calculosPreco";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import { buscarProdutoPorId } from "@/lib/produtos/repository";

// Precisa do padrão global de taxas atual — não pode ser pré-renderizada no build.
export const dynamic = "force-dynamic";

export default async function CalculadoraPrecoPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; produto?: string }>;
}) {
  const { id, produto: produtoParam } = await searchParams;

  // Vindo de um produto: reabre o cálculo dele, se já houver; senão começa um com os dados do cadastro.
  if (!id && produtoParam) {
    const existente = await buscarCalculoDoProduto(produtoParam);
    if (existente) redirect(`/admin/produtos/calculadora?id=${existente._id!.toString()}`);
  }

  const [taxasGlobais, calculos, calculo] = await Promise.all([
    buscarTaxasCanais(),
    listarCalculosPreco(),
    id ? buscarCalculoPreco(id) : null,
  ]);

  if (id && !calculo) notFound();

  const produtoId = calculo ? calculo.produtoId : produtoParam;
  const produto = produtoId ? await buscarProdutoPorId(produtoId) : null;
  if (!calculo && produtoParam && !produto) notFound();

  const custoCadastro = produto?.custoProducao ? calcularCustoProducao(produto.custoProducao).totalCentavos : null;
  const produtoVinculado = produto
    ? {
        id: produto._id!.toString(),
        custoCadastroCentavos: custoCadastro !== null && Number.isFinite(custoCadastro) ? custoCadastro : null,
      }
    : undefined;

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>{calculo ? `Calculadora de preço: ${calculo.nome}` : produto ? `Calculadora de preço: ${produto.nome}` : "Calculadora de preço"}</h1>
        <div className={styles.barAcoes}>
          {(calculo || produto) && (
            <Link href="/admin/produtos/calculadora" className={styles.btnGhost}>
              + Novo cálculo
            </Link>
          )}
          <Link href="/admin/produtos" className={styles.btnGhost}>
            Voltar aos produtos
          </Link>
        </div>
      </div>
      <CalculosSalvos
        abertoId={id}
        calculos={calculos.map((c) => ({
          id: c._id!.toString(),
          nome: c.nome,
          alturaCm: c.valores?.alturaCm?.trim() || undefined,
          atualizadoEm: c.atualizadoEm.toISOString(),
          virouProduto: Boolean(c.produtoId),
        }))}
      />
      <CalculadoraRapida
        key={id ?? (produto ? `produto-${produtoVinculado!.id}` : "novo")}
        taxasGlobais={taxasGlobais}
        produtoVinculado={produtoVinculado}
        calculoInicial={
          calculo
            ? {
                id: calculo._id!.toString(),
                nome: calculo.nome,
                linkModelo3d: calculo.linkModelo3d,
                linkShopee: calculo.linkShopee,
                linkMercadoLivre: calculo.linkMercadoLivre,
                // Cálculos antigos (custo por peça) chegam já convertidos para a versão 2.
                valores: normalizarValores(calculo.valores),
                produtoId: calculo.produtoId,
              }
            : produto
              ? {
                  // Ainda não salvo: ao salvar, o cálculo nasce já ligado ao produto.
                  nome: produto.nome,
                  linkModelo3d: produto.linkModelo3d,
                  valores: valoresDoProduto(produto),
                  produtoId: produtoVinculado!.id,
                }
              : undefined
        }
      />
    </div>
  );
}
