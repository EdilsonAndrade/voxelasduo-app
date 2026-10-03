"use client";

import { useEffect } from "react";
import { useCarrinho } from "./carrinho-context";

/** Esvazia o carrinho só depois que o pagamento do pedido foi confirmado. */
export default function LimparCarrinhoPago() {
  const { limpar } = useCarrinho();
  useEffect(() => {
    limpar();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- executa uma vez ao montar
  }, []);
  return null;
}
