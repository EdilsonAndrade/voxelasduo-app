"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ProdutoApuradoCard, type ProdutoApurado } from "./ApuracaoProdutos";
import styles from "./producao.module.css";

/**
 * A apuração da impressora dentro da edição do produto: escolher as
 * impressões do custo e planejar o horário de cada placa. Lançar no estoque e
 * aplicar ao cadastro ficam na tela de Produção — aqui o formulário tem o
 * próprio estado e desfaria a mudança no próximo "Salvar".
 */
export default function ProducaoDoProduto({ produtoId }: { produtoId: string }) {
  const [produto, setProduto] = useState<ProdutoApurado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const resposta = await fetch(
        `/api/producao/apuracao?produtoId=${encodeURIComponent(produtoId)}`
      );
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(dados.erro ?? `Falha ao carregar a produção (HTTP ${resposta.status}).`);
        return;
      }
      setProduto((dados.produtos as ProdutoApurado[])[0] ?? null);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de rede ao carregar a produção.");
    } finally {
      setCarregando(false);
    }
  }, [produtoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <section className={`${styles.bloco} ${styles.blocoNoProduto}`}>
      <h2 className={styles.tituloBloco}>Produção na impressora</h2>
      <p className={styles.subtituloBloco}>
        Escolha as impressões que entram no custo e o horário em que cada placa deve terminar.
        Para lançar no estoque ou aplicar o custo, use a{" "}
        <Link href="/admin/producao">tela de Produção</Link>.
      </p>

      {carregando && <p className={styles.vazio}>Carregando…</p>}
      {erro && <p className={styles.erro}>{erro}</p>}
      {!carregando && !erro && !produto && (
        <p className={styles.vazio}>
          Nenhuma placa da impressora está mapeada para este produto. Mapeie um arquivo na{" "}
          <Link href="/admin/producao">tela de Produção</Link>.
        </p>
      )}
      {produto && <ProdutoApuradoCard produto={produto} onAlterado={carregar} comAcoes={false} />}
    </section>
  );
}
