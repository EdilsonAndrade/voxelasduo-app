import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./checkout.module.css";

export interface LinhaResumo {
  nome: string;
  quantidade: number;
  precoUnitario: number;
}

/** Frete exibido no resumo (spec 039) — `valorCentavos` 0 aparece como "grátis". */
export interface FreteResumo {
  rotulo: string;
  valorCentavos: number;
}

interface ResumoPedidoProps {
  itens: LinhaResumo[];
  totalCentavos: number;
  titulo?: string;
  /** Quando informado, mostra subtotal + frete antes do total. */
  frete?: FreteResumo | null;
  /** Subtotal dos produtos — exibido junto do frete. */
  subtotalCentavos?: number;
  /** Texto da linha de frete enquanto nenhuma forma de entrega foi escolhida. */
  freteAEscolher?: boolean;
}

export default function ResumoPedido({
  itens,
  totalCentavos,
  titulo = "resumo do pedido",
  frete,
  subtotalCentavos,
  freteAEscolher = false,
}: ResumoPedidoProps) {
  const mostrarFrete = Boolean(frete) || freteAEscolher;
  return (
    <aside className={styles.resumo}>
      <p className={styles.resumoTitulo}>{titulo}</p>
      <div className={styles.resumoLinhas}>
        {itens.map((item) => (
          <div className={styles.resumoLinha} key={`${item.nome}-${item.quantidade}`}>
            <span>
              {item.nome} × {item.quantidade}
            </span>
            <span>{formatarPreco(item.precoUnitario * item.quantidade)}</span>
          </div>
        ))}
      </div>
      {mostrarFrete && (
        <div className={`${styles.resumoLinhas} ${styles.resumoSubtotais}`}>
          {subtotalCentavos !== undefined && (
            <div className={styles.resumoLinha}>
              <span>subtotal</span>
              <span>{formatarPreco(subtotalCentavos)}</span>
            </div>
          )}
          <div className={styles.resumoLinha}>
            <span>frete{frete ? ` · ${frete.rotulo}` : ""}</span>
            <span>
              {!frete ? "escolha a entrega" : frete.valorCentavos === 0 ? "grátis" : formatarPreco(frete.valorCentavos)}
            </span>
          </div>
        </div>
      )}
      <div className={styles.resumoTotal}>
        <span>total</span>
        <span className={styles.resumoTotalValor}>{formatarPreco(totalCentavos)}</span>
      </div>
    </aside>
  );
}
