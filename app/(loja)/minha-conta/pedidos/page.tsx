import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/clienteConfig";
import { buscarClientePorId } from "@/lib/clientes/repository";
import { buscarPedidosDoCliente } from "@/lib/clientes/pedidosAssociados";
import ListaPedidos from "@/components/cliente/ListaPedidos";
import MinhaContaNav from "@/components/cliente/MinhaContaNav";
import { paraPedidoDetalhado } from "@/lib/pedidos/apresentacao";
import { buscarProdutosPorIds } from "@/lib/pedidos/repository";
import styles from "@/components/cliente/cliente.module.css";

export const metadata = { title: "Meus pedidos — Voxelas Duo" };

export default async function MeusPedidosPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar?callbackUrl=/minha-conta/pedidos");
  }

  const cliente = await buscarClientePorId(session.user.id);
  if (!cliente) {
    redirect("/entrar?callbackUrl=/minha-conta/pedidos");
  }

  const pedidos = await buscarPedidosDoCliente(cliente);
  const produtos = await buscarProdutosPorIds(
    pedidos.flatMap((pedido) => pedido.itens.map((item) => item.produtoId.toString()))
  );

  return (
    <div className={styles.paginaConta}>
      <MinhaContaNav ativo="pedidos" />
      <h1 className={styles.titulo}>Meus pedidos</h1>
      <ListaPedidos pedidos={pedidos.map((pedido) => paraPedidoDetalhado(pedido, produtos))} />
    </div>
  );
}
