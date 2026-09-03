"use client";

import Link from "next/link";
import { useCarrinho } from "@/components/carrinho/carrinho-context";
import { calcularTotais } from "@/lib/carrinho/carrinho";
import { formatarPreco } from "@/lib/produtos/formato";
import styles from "@/components/carrinho/carrinho.module.css";

export default function CarrinhoPage() {
  const { itens, alterar, remover } = useCarrinho();
  const totais = calcularTotais(itens);

  return (
    <div className="container">
      <div className={styles.pagina}>
        <p className={styles.eyebrow}>sua sacola de ideias</p>
        <h1 className={styles.titulo}>Carrinho</h1>

        {itens.length === 0 ? (
          <div className={styles.vazio}>
            <p className={styles.vazioMensagem}>seu carrinho está vazio… que tal uma ideia nova?</p>
            <Link href="/produtos" className={styles.vazioLink}>
              ver produtos →
            </Link>
          </div>
        ) : (
          <div className={styles.layout}>
            <div className={styles.lista}>
              {itens.map((item) => (
                <div className={styles.item} key={item.produtoId}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.itemFoto} src={item.foto} alt={item.nome} />
                  <div className={styles.itemInfo}>
                    <Link
                      href={`/produtos/${encodeURIComponent(item.categoria)}/${encodeURIComponent(item.slug)}`}
                      className={styles.itemNome}
                    >
                      {item.nome}
                    </Link>
                    <span className={styles.itemPreco}>
                      {formatarPreco(item.preco)} cada
                    </span>
                    <div className={styles.itemAcoes}>
                      <div className={styles.quantidade}>
                        <button
                          type="button"
                          onClick={() => alterar(item.produtoId, item.quantidade - 1)}
                          disabled={item.quantidade <= 1}
                          aria-label="diminuir quantidade"
                        >
                          −
                        </button>
                        <output aria-live="polite">{item.quantidade}</output>
                        <button
                          type="button"
                          onClick={() => alterar(item.produtoId, item.quantidade + 1)}
                          disabled={item.quantidade >= item.estoque}
                          aria-label="aumentar quantidade"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className={styles.remover}
                        onClick={() => remover(item.produtoId)}
                      >
                        remover
                      </button>
                    </div>
                  </div>
                  <div className={styles.itemSubtotal}>
                    {formatarPreco(item.preco * item.quantidade)}
                  </div>
                </div>
              ))}
            </div>

            <aside className={styles.resumo}>
              <p className={styles.resumoTitulo}>resumo da compra</p>
              <div className={styles.resumoLinhas}>
                {itens.map((item) => (
                  <div className={styles.resumoLinha} key={item.produtoId}>
                    <span>
                      {item.nome} × {item.quantidade}
                    </span>
                    <span>{formatarPreco(item.preco * item.quantidade)}</span>
                  </div>
                ))}
              </div>
              <div className={styles.resumoTotal}>
                <span>total</span>
                <span className={styles.resumoTotalValor}>
                  {formatarPreco(totais.totalCentavos)}
                </span>
              </div>
              <Link href="/checkout" className={styles.cta}>
                Finalizar compra
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
