"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCarrinho } from "@/components/carrinho/carrinho-context";
import { calcularTotais } from "@/lib/carrinho/carrinho";
import FormularioCheckout from "@/components/checkout/FormularioCheckout";
import ResumoPedido from "@/components/checkout/ResumoPedido";
import styles from "@/components/checkout/checkout.module.css";

export default function CheckoutPage() {
  const { itens, pronto } = useCarrinho();
  const router = useRouter();
  const totais = calcularTotais(itens);

  useEffect(() => {
    if (pronto && itens.length === 0) {
      router.replace("/carrinho");
    }
  }, [pronto, itens.length, router]);

  if (!pronto || itens.length === 0) {
    return null;
  }

  return (
    <div className="container">
      <div className={styles.pagina}>
        <p className={styles.eyebrow}>quase lá…</p>
        <h1 className={styles.titulo}>Checkout</h1>

        <div className={styles.layout}>
          <FormularioCheckout
            aoConcluir={(pedidoId) => {
              router.push(`/pedido/${pedidoId}`);
            }}
          />
          <ResumoPedido
            itens={itens.map((item) => ({
              nome: item.nome,
              quantidade: item.quantidade,
              precoUnitario: item.preco,
            }))}
            totalCentavos={totais.totalCentavos}
          />
        </div>
      </div>
    </div>
  );
}
