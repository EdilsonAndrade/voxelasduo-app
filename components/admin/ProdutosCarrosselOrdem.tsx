"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProdutoCarrossel } from "@/lib/home/secoesPublicas";
import { formatarPreco } from "@/lib/produtos/formato";
import adminStyles from "./admin.module.css";
import styles from "./secoesHome.module.css";

/** Ordem dos produtos do carrossel (FR-011) — a marcação em si é feita na lista de Produtos. */
export default function ProdutosCarrosselOrdem({
  secaoId,
  produtosIniciais,
}: {
  secaoId: string;
  produtosIniciais: ProdutoCarrossel[];
}) {
  const [produtos, setProdutos] = useState(produtosIniciais);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(novos: ProdutoCarrossel[]) {
    const anteriores = produtos;
    setProdutos(novos);
    setErro(null);

    const resposta = await fetch(`/api/admin/home/secoes/${secaoId}/produtos`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produtoIds: novos.map((p) => p.id) }),
    });

    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => ({}));
      setProdutos(anteriores);
      setErro(corpo.erro ?? `Erro ${resposta.status} ao salvar a ordem.`);
    }
  }

  function mover(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= produtos.length) return;
    const novos = [...produtos];
    [novos[indice], novos[destino]] = [novos[destino], novos[indice]];
    salvar(novos);
  }

  return (
    <section className={styles.produtosCarrossel}>
      <h2>Produtos do carrossel</h2>
      <p className={styles.dica}>
        A home mostra os produtos nesta ordem. Para incluir produtos, use a coluna Destaques em{" "}
        <Link href={`/admin/produtos?carrossel=${secaoId}`}>Produtos</Link>.
      </p>

      {erro && <p className={adminStyles.formError}>{erro}</p>}

      {produtos.length === 0 ? (
        <p className={adminStyles.empty}>Nenhum produto marcado. Enquanto estiver vazio, o carrossel não aparece na home.</p>
      ) : (
        <ol className={styles.lista}>
          {produtos.map((produto, indice) => (
            <li key={produto.id} className={styles.produtoLinha}>
              <div className={styles.ordemBotoes}>
                <button type="button" onClick={() => mover(indice, -1)} disabled={indice === 0} aria-label={`Subir ${produto.nome}`}>
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => mover(indice, 1)}
                  disabled={indice === produtos.length - 1}
                  aria-label={`Descer ${produto.nome}`}
                >
                  ↓
                </button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {produto.foto ? <img src={produto.foto} alt="" /> : <span />}
              <div className={styles.linhaInfo}>
                <span className={styles.linhaTitulo}>{produto.nome}</span>
                <span className={styles.linhaTipo}>
                  {formatarPreco(produto.preco)}
                  {produto.esgotado ? " · esgotado" : ""}
                </span>
              </div>
              <button
                type="button"
                className={adminStyles.btnGhost}
                onClick={() => salvar(produtos.filter((p) => p.id !== produto.id))}
              >
                tirar do carrossel
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
