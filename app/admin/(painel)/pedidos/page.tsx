import { CANAIS_ORIGEM, STATUS_PEDIDO, type CanalOrigem, type StatusPedido } from "@/lib/models/pedido";
import { buscarProdutosPorIds, listarPedidos } from "@/lib/pedidos/repository";
import { paraPedidoResumo } from "@/lib/pedidos/apresentacao";
import PedidosLista from "@/components/admin/PedidosLista";
import styles from "@/components/admin/admin.module.css";

// Sempre busca dados atuais — mesmo motivo de app/admin/produtos/page.tsx
// (sem isso o Next.js pré-renderiza a listagem estaticamente no build).
export const dynamic = "force-dynamic";

export default async function AdminPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ canal?: string; status?: string }>;
}) {
  const { canal: canalParam, status: statusParam } = await searchParams;
  const canal = CANAIS_ORIGEM.includes(canalParam as CanalOrigem) ? (canalParam as CanalOrigem) : undefined;
  const status = STATUS_PEDIDO.includes(statusParam as StatusPedido) ? (statusParam as StatusPedido) : undefined;

  const { pedidos } = await listarPedidos({ canal, status });
  const produtos = await buscarProdutosPorIds(
    pedidos.flatMap((pedido) => pedido.itens.map((item) => item.produtoId.toString()))
  );
  const pedidosResumo = pedidos.map((pedido) => paraPedidoResumo(pedido, produtos));

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Pedidos recebidos</h1>
      </div>

      <PedidosLista pedidosIniciais={pedidosResumo} canalAtual={canal} statusAtual={status} />
    </div>
  );
}
