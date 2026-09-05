import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarPedidoPorId, buscarProdutosPorIds } from "@/lib/pedidos/repository";
import ResumoPedido from "@/components/checkout/ResumoPedido";
import PagamentoBrick from "@/components/pagamento/PagamentoBrick";
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

  const pago = pedido.status === "pago";

  return (
    <div className="container">
      <div className={styles.pagina}>
        <div className={styles.confirmacao}>
          <span className={styles.confirmacaoBadge}>
            {pago ? "pagamento confirmado" : "pedido pendente de pagamento"}
          </span>
          <h1 className={styles.titulo}>{pago ? "Pagamento aprovado!" : "Pedido criado!"}</h1>
          <p className={styles.confirmacaoTexto}>
            {pago
              ? "recebemos a confirmação do seu pagamento. seu pedido já está sendo preparado."
              : "recebemos seu pedido. finalize o pagamento abaixo para confirmar a compra."}
          </p>
          <ResumoPedido
            itens={itens}
            totalCentavos={pedido.valorTotal}
            titulo="resumo do seu pedido"
          />
          {!pago && (
            <PagamentoBrick pedidoId={id} valorTotalCentavos={pedido.valorTotal} />
          )}
          <Link href="/produtos" className={styles.confirmacaoLink}>
            continuar vendo produtos →
          </Link>
        </div>
      </div>
    </div>
  );
}
