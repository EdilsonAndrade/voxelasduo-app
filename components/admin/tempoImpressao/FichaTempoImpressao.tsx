import Link from "next/link";
import ImprimirButton from "@/components/admin/ImprimirButton";
import { terminoPrevisto } from "@/lib/producao/agenda";
import { minutosEmHoras, quantidadeDoItem, totalMinutos, totalPecas } from "@/lib/producao/planosImpressao";
import type { PlanoProduto } from "./PlanoProdutoCard";
import styles from "./tempoImpressao.module.css";

function termino(inicio: string | undefined, minutos: number): string {
  const fim = inicio ? terminoPrevisto(inicio, minutos) : null;
  if (!fim) return "—";
  if (fim.diasDepois === 0) return fim.horario;
  return `${fim.horario} ${fim.diasDepois === 1 ? "(dia seg.)" : `(+${fim.diasDepois} dias)`}`;
}

/**
 * Ficha em lista do Tempo de Impressão (specs/035): cada produto com o total e,
 * se tiver mais de uma parte, as partes abaixo. "Imprimir / salvar PDF" usa a
 * impressão do navegador, como a folha de orçamentos.
 */
export default function FichaTempoImpressao({ planos }: { planos: PlanoProduto[] }) {
  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className={`container ${styles.ficha}`}>
      <div className={styles.fichaControles}>
        <ImprimirButton className={styles.botao} />
        <Link href="/admin/tempo-impressao" className={styles.botaoTexto}>
          Voltar ao Tempo de Impressão
        </Link>
      </div>

      <h1 className={styles.fichaTitulo}>Tempo de impressão</h1>
      <p className={styles.fichaData}>Gerada em {hoje}</p>

      {planos.length === 0 ? (
        <p className={styles.vazio}>Nenhum produto no Tempo de Impressão.</p>
      ) : (
        <ul className={styles.fichaLista}>
          <li className={`${styles.fichaProdutoLinha} ${styles.fichaCabecalho}`} aria-hidden="true">
            <span>Produto / parte</span>
            <span className={styles.direita}>Qtd</span>
            <span className={styles.direita}>Tempo</span>
            <span className={styles.direita}>Início</span>
            <span className={styles.direita}>Término</span>
          </li>
          {planos.map((plano) => {
            const unica = plano.itens.length === 1 ? plano.itens[0] : null;
            return (
              <li key={plano.produtoId} className={styles.fichaProduto}>
                <div className={styles.fichaProdutoLinha}>
                  <span>{plano.produtoNome}</span>
                  <span className={styles.direita}>{totalPecas(plano.itens)}</span>
                  <span className={styles.direita}>{minutosEmHoras(totalMinutos(plano.itens))}</span>
                  <span className={styles.direita}>{unica?.inicio ?? ""}</span>
                  <span className={styles.direita}>{unica ? termino(unica.inicio, unica.minutos) : ""}</span>
                </div>
                {!unica && (
                  <ul className={styles.fichaPartes}>
                    {plano.itens.map((item) => (
                      <li key={item.id} className={styles.fichaParte}>
                        <span>{item.nome}</span>
                        <span className={styles.direita}>{quantidadeDoItem(item)}</span>
                        <span className={styles.direita}>{minutosEmHoras(item.minutos)}</span>
                        <span className={styles.direita}>{item.inicio ?? "—"}</span>
                        <span className={styles.direita}>{termino(item.inicio, item.minutos)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
