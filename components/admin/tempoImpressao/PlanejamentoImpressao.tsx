"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SelectBusca from "@/components/admin/SelectBusca";
import PlanoProdutoCard, { type PlanoProduto } from "./PlanoProdutoCard";
import styles from "./tempoImpressao.module.css";

/**
 * Tempo de Impressão (specs/035): escolhe um produto do catálogo (publicado ou
 * não), cadastra as partes com o tempo de impressão e planeja o horário de
 * início de cada uma. Produto que já está no menu não é duplicado: a tela rola
 * até o card dele.
 */
export default function PlanejamentoImpressao({
  planosIniciais,
  produtos,
  destacar,
}: {
  planosIniciais: PlanoProduto[];
  produtos: { id: string; nome: string }[];
  /** Produto vindo da Produção (`?produto=`): o card dele abre destacado. */
  destacar?: string;
}) {
  const [planos, setPlanos] = useState(planosIniciais);
  const [escolhido, setEscolhido] = useState("");
  const [destaque, setDestaque] = useState(destacar ?? "");

  useEffect(() => {
    if (!destaque) return;
    document.getElementById(`plano-${destaque}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [destaque]);

  function adicionar() {
    const produto = produtos.find((p) => p.id === escolhido);
    if (!produto) return;
    if (!planos.some((p) => p.produtoId === produto.id)) {
      setPlanos((atual) => [{ produtoId: produto.id, produtoNome: produto.nome, itens: [], novo: true }, ...atual]);
    }
    setDestaque(produto.id);
    setEscolhido("");
  }

  function salvo(plano: PlanoProduto) {
    setPlanos((atual) => atual.map((p) => (p.produtoId === plano.produtoId ? plano : p)));
  }

  function removido(produtoId: string) {
    setPlanos((atual) => atual.filter((p) => p.produtoId !== produtoId));
  }

  return (
    <div className={`container ${styles.pagina}`}>
      <div className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>Tempo de Impressão</h1>
          <p className={styles.subtitulo}>
            Tempo de cada parte e a que horas mandar para a impressora. Não altera o custo de produção do cadastro.
          </p>
        </div>
        <Link href="/admin/tempo-impressao/imprimir" className={`${styles.botao} ${styles.botaoSecundario}`}>
          Gerar ficha (PDF)
        </Link>
      </div>

      <div className={styles.adicionar}>
        <div className={styles.adicionarSelect}>
          <SelectBusca
            opcoes={produtos.map((p) => ({ valor: p.id, rotulo: p.nome }))}
            valor={escolhido}
            onChange={setEscolhido}
            placeholder="Escolha um produto do catálogo"
            placeholderBusca="Buscar produto…"
            rotuloAcessivel="Produto"
          />
        </div>
        <button type="button" className={styles.botao} onClick={adicionar} disabled={!escolhido}>
          Adicionar
        </button>
      </div>

      {planos.length === 0 ? (
        <p className={styles.vazio}>
          Nenhum produto ainda. Escolha um acima ou leve as peças de um produto pela tela de{" "}
          <Link href="/admin/producao">Produção</Link>.
        </p>
      ) : (
        planos.map((plano) => (
          <PlanoProdutoCard
            key={plano.produtoId}
            plano={plano}
            destaque={plano.produtoId === destaque}
            onSalvo={salvo}
            onRemovido={removido}
          />
        ))
      )}
    </div>
  );
}
