"use client";

import { useEffect, useRef, useState } from "react";
import { useCarrinho } from "./carrinho-context";
import styles from "./carrinho.module.css";

interface BotaoAdicionarCarrinhoProps {
  produtoId: string;
  nome: string;
  foto: string;
  preco: number;
  estoque: number;
}

export default function BotaoAdicionarCarrinho({
  produtoId,
  nome,
  foto,
  preco,
  estoque,
}: BotaoAdicionarCarrinhoProps) {
  const { adicionar } = useCarrinho();
  const [quantidade, setQuantidade] = useState(1);
  const [adicionado, setAdicionado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (temporizador.current) {
        clearTimeout(temporizador.current);
      }
    };
  }, []);

  const semEstoque = estoque === 0;

  function confirmarAdicao() {
    adicionar({ produtoId, nome, foto, preco, estoque, quantidade });
    setAdicionado(true);
    if (temporizador.current) {
      clearTimeout(temporizador.current);
    }
    temporizador.current = setTimeout(() => setAdicionado(false), 2200);
  }

  if (semEstoque) {
    return <p className={styles.esgotado}>esgotado por enquanto…</p>;
  }

  return (
    <div className={styles.compra}>
      <div className={styles.quantidade}>
        <button
          type="button"
          onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
          disabled={quantidade <= 1}
          aria-label="diminuir quantidade"
        >
          −
        </button>
        <output aria-live="polite">{quantidade}</output>
        <button
          type="button"
          onClick={() => setQuantidade((q) => Math.min(estoque, q + 1))}
          disabled={quantidade >= estoque}
          aria-label="aumentar quantidade"
        >
          +
        </button>
      </div>
      <button type="button" className={styles.botao} onClick={confirmarAdicao}>
        Adicionar ao carrinho
      </button>
      {adicionado && (
        <p className={styles.feedback} role="status">
          adicionado ✓
        </p>
      )}
    </div>
  );
}
