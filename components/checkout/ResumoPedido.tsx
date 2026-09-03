import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./checkout.module.css";

export interface LinhaResumo {
  nome: string;
  quantidade: number;
  precoUnitario: number;
}

interface ResumoPedidoProps {
  itens: LinhaResumo[];
  totalCentavos: number;
  titulo?: string;
}

export default function ResumoPedido({
  itens,
  totalCentavos,
  titulo = "resumo do pedido",
}: ResumoPedidoProps) {
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
      <div className={styles.resumoTotal}>
        <span>total</span>
        <span className={styles.resumoTotalValor}>{formatarPreco(totalCentavos)}</span>
      </div>
    </aside>
  );
}
