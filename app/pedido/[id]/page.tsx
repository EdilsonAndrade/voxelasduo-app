import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarPedidoPorId, buscarProdutosPorIds } from "@/lib/pedidos/repository";
import ResumoPedido from "@/components/checkout/ResumoPedido";
import LimparCarrinhoPago from "@/components/carrinho/LimparCarrinhoPago";
import PagamentoBrick from "@/components/pagamento/PagamentoBrick";
import { codigoPedido } from "@/lib/pedidos/numero";
import { ROTULO_SERVICO_FRETE } from "@/lib/models/frete";
import { nomeComVariacao } from "@/lib/produtos/variacoes";
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
    nome: nomeComVariacao(produtos.get(item.produtoId.toString())?.nome ?? "Produto", item.variacaoNome),
    quantidade: item.quantidade,
    precoUnitario: item.precoUnitario,
  }));

  const pago = pedido.status === "pago";

  return (
    <div className="container">
      <div className={styles.pagina}>
        <div className={styles.confirmacao}>
          {/* Pedido de link de pagamento não usou o carrinho: não esvazia. */}
          {pago && !pedido.linkPagamentoId && <LimparCarrinhoPago />}
          <span className={styles.confirmacaoBadge}>
            {pago ? "pagamento confirmado" : "pedido pendente de pagamento"}
          </span>
          <h1 className={styles.titulo}>{pago ? "Pagamento aprovado!" : "Pedido criado!"} <small>#{codigoPedido(pedido)}</small></h1>
          <p className={styles.confirmacaoTexto}>
            {pago
              ? "recebemos a confirmação do seu pagamento. seu pedido já está sendo preparado."
              : "recebemos seu pedido. finalize o pagamento abaixo para confirmar a compra."}
          </p>
          <ResumoPedido
            itens={itens}
            totalCentavos={pedido.valorTotal}
            titulo="resumo do seu pedido"
            frete={
              pedido.frete
                ? { rotulo: ROTULO_SERVICO_FRETE[pedido.frete.servico], valorCentavos: pedido.frete.valorCentavos }
                : null
            }
            subtotalCentavos={pedido.frete ? pedido.valorTotal - pedido.frete.valorCentavos : undefined}
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
