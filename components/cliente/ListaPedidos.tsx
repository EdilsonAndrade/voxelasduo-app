import Link from "next/link";
import type { PedidoDetalhado } from "@/lib/pedidos/apresentacao";
import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./cliente.module.css";

const LABEL_STATUS: Record<PedidoDetalhado["status"], string> = {
  pendente: "Aguardando pagamento",
  pago: "Pago",
  em_producao: "Em produção",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const LABEL_CANAL: Record<PedidoDetalhado["canalOrigem"], string> = {
  site: "Site",
  mercado_livre: "Mercado Livre",
  shopee: "Shopee",
};

// Trilha de produção (pago → em produção → enviado → entregue) — só faz sentido
// depois que o pedido foi pago; "pendente" e "cancelado" não entram na trilha.
const ETAPAS_TRILHA: PedidoDetalhado["status"][] = ["pago", "em_producao", "enviado", "entregue"];

function formatarData(data: Date | string): string {
  return new Date(data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Trilha({ status }: { status: PedidoDetalhado["status"] }) {
  if (!ETAPAS_TRILHA.includes(status)) {
    return null;
  }
  const etapaAtual = ETAPAS_TRILHA.indexOf(status);

  return (
    <ol className={styles.trilha}>
      {ETAPAS_TRILHA.map((etapa, indice) => (
        <li
          key={etapa}
          className={`${styles.trilhaEtapa} ${indice <= etapaAtual ? styles.trilhaEtapaFeita : ""}`}
        >
          <span className={styles.trilhaPonto} />
          <span className={styles.trilhaRotulo}>{LABEL_STATUS[etapa]}</span>
        </li>
      ))}
    </ol>
  );
}

export default function ListaPedidos({ pedidos }: { pedidos: PedidoDetalhado[] }) {
  if (pedidos.length === 0) {
    return (
      <div className={styles.vazio}>
        <p className={styles.vazioTexto}>Ainda não vimos nenhum pedido seu por aqui.</p>
        <Link href="/produtos" className={styles.vazioLink}>
          ver produtos →
        </Link>
      </div>
    );
  }

  return (
    <ul className={styles.listaPedidos}>
      {pedidos.map((pedido) => (
        <li key={pedido.id} className={styles.pedidoCard}>
          <div className={styles.pedidoTopo}>
            <span className={styles.badgeCanal}>{LABEL_CANAL[pedido.canalOrigem]}</span>
            <span className={styles.pedidoData}>{formatarData(pedido.criadoEm)}</span>
          </div>

          <ul className={styles.pedidoItens}>
            {pedido.itens.map((item, indice) => (
              <li key={indice}>
                {item.quantidade}x {item.nome}
              </li>
            ))}
          </ul>

          <div className={styles.pedidoRodape}>
            <span className={styles.pedidoValor}>{formatarPreco(pedido.valorTotal)}</span>
            <span className={styles.badgeStatus}>{LABEL_STATUS[pedido.status]}</span>
          </div>

          <Trilha status={pedido.status} />

          {pedido.rastreio && (
            <p className={styles.rastreio}>
              Rastreio: <strong>{pedido.rastreio.codigo}</strong> ({pedido.rastreio.transportadora})
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
