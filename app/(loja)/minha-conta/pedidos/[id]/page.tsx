import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/clienteConfig";
import { buscarClientePorId } from "@/lib/clientes/repository";
import { pedidoPertenceAoCliente } from "@/lib/clientes/pedidosAssociados";
import ListaPedidos from "@/components/cliente/ListaPedidos";
import MinhaContaNav from "@/components/cliente/MinhaContaNav";
import { paraPedidoDetalhado } from "@/lib/pedidos/apresentacao";
import { buscarPedidoPorId, buscarProdutosPorIds } from "@/lib/pedidos/repository";
import styles from "@/components/cliente/cliente.module.css";

export default async function DetalhePedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/entrar?callbackUrl=/minha-conta/pedidos/${id}`);
  }

  const cliente = await buscarClientePorId(session.user.id);
  if (!cliente) {
    redirect(`/entrar?callbackUrl=/minha-conta/pedidos/${id}`);
  }

  const pedido = await buscarPedidoPorId(id);
  // Nunca revela se o pedido existe quando não pertence ao cliente autenticado (FR-014).
  if (!pedido || !pedidoPertenceAoCliente(pedido, cliente)) {
    notFound();
  }

  const produtos = await buscarProdutosPorIds(pedido.itens.map((item) => item.produtoId.toString()));

  return (
    <div className={styles.paginaConta}>
      <MinhaContaNav ativo="pedidos" />
      <p>
        <Link href="/minha-conta/pedidos">← voltar aos meus pedidos</Link>
      </p>
      <h1 className={styles.titulo}>Pedido</h1>
      <ListaPedidos pedidos={[paraPedidoDetalhado(pedido, produtos)]} />
    </div>
  );
}
