import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarPedidoPorId, buscarProdutosPorIds } from "@/lib/pedidos/repository";
import ResumoPedido from "@/components/checkout/ResumoPedido";
import styles from "@/components/checkout/checkout.module.css";

export default async function PedidoConfirmacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pedido = await buscarPedidoPorId(id);

  if (!pedido) {
    notFound();
  }

  const produtos = await buscarProdutosPorIds(
    pedido.itens.map((item) => item.produtoId.toString())
  );

  const itens = pedido.itens.map((item) => ({
    nome: produtos.get(item.produtoId.toString())?.nome ?? "Produto",
    quantidade: item.quantidade,
    precoUnitario: item.precoUnitario,
  }));

  return (
    <div className="container">
      <div className={styles.pagina}>
        <div className={styles.confirmacao}>
          <span className={styles.confirmacaoBadge}>pedido pendente de pagamento</span>
          <h1 className={styles.titulo}>Pedido criado!</h1>
          <p className={styles.confirmacaoTexto}>
            recebemos seu pedido. em breve você receberá instruções de pagamento.
          </p>
          <ResumoPedido
            itens={itens}
            totalCentavos={pedido.valorTotal}
            titulo="resumo do seu pedido"
          />
          <Link href="/produtos" className={styles.confirmacaoLink}>
            continuar vendo produtos →
          </Link>
        </div>
      </div>
    </div>
  );
}
