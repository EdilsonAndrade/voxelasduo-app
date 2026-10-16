import Link from "next/link";
import { notFound } from "next/navigation";
import CalculadoraRapida from "@/components/admin/CalculadoraRapida";
import CalculosSalvos from "@/components/admin/CalculosSalvos";
import styles from "@/components/admin/admin.module.css";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import { normalizarValores } from "@/lib/produtos/calculadoraValores";
import { buscarCalculoPreco, listarCalculosPreco } from "@/lib/produtos/calculosPreco";

// Precisa do padrão global de taxas atual — não pode ser pré-renderizada no build.
export const dynamic = "force-dynamic";

export default async function CalculadoraPrecoPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const [taxasGlobais, calculos, calculo] = await Promise.all([
    buscarTaxasCanais(),
    listarCalculosPreco(),
    id ? buscarCalculoPreco(id) : null,
  ]);

  if (id && !calculo) notFound();

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>{calculo ? `Calculadora de preço: ${calculo.nome}` : "Calculadora de preço"}</h1>
        <div className={styles.barAcoes}>
          {calculo && (
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
        key={id ?? "novo"}
        taxasGlobais={taxasGlobais}
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
            : undefined
        }
      />
    </div>
  );
}
