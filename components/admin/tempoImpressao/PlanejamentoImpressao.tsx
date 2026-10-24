"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SelectBusca from "@/components/admin/SelectBusca";
import PlanoProdutoCard, { type PlanoProduto } from "./PlanoProdutoCard";
import styles from "./tempoImpressao.module.css";

/**
 * Tempo de Impressão (specs/035): escolhe um produto do catálogo (publicado ou
 * não) ou dá nome a algo que ainda não é produto, cadastra as partes com o
 * tempo de impressão e planeja o horário de início de cada uma. Produto que já
 * está no menu não é duplicado: a tela rola até o card dele.
 */
export default function PlanejamentoImpressao({
  planosIniciais,
  produtos,
  destacar,
}: {
  planosIniciais: PlanoProduto[];
  produtos: { id: string; nome: string; linkModelo3d?: string }[];
  /** Produto vindo da Produção (`?produto=`): o card dele abre destacado. */
  destacar?: string;
}) {
  const [planos, setPlanos] = useState(planosIniciais);
  const [escolhido, setEscolhido] = useState("");
  const [nomeAvulso, setNomeAvulso] = useState("");
  const [destaque, setDestaque] = useState(
    () => planosIniciais.find((p) => destacar && p.produtoId === destacar)?.chave ?? ""
  );

  useEffect(() => {
    if (!destaque) return;
    document.getElementById(`plano-${destaque}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [destaque]);

  function adicionarProduto() {
    const produto = produtos.find((p) => p.id === escolhido);
    if (!produto) return;
    const existente = planos.find((p) => p.produtoId === produto.id);
    if (existente) {
      setDestaque(existente.chave);
    } else {
      const chave = `novo-${crypto.randomUUID()}`;
      setPlanos((atual) => [
        { chave, produtoId: produto.id, produtoNome: produto.nome, linkModelo3d: produto.linkModelo3d, itens: [], novo: true },
        ...atual,
      ]);
      setDestaque(chave);
    }
    setEscolhido("");
  }

  function adicionarAvulso(evento: React.FormEvent) {
    evento.preventDefault();
    const nome = nomeAvulso.trim();
    if (!nome) return;
    const chave = `novo-${crypto.randomUUID()}`;
    setPlanos((atual) => [{ chave, produtoNome: nome, itens: [], novo: true }, ...atual]);
    setDestaque(chave);
    setNomeAvulso("");
  }

  function salvo(plano: PlanoProduto) {
    setPlanos((atual) => atual.map((p) => (p.chave === plano.chave ? plano : p)));
  }

  function removido(chave: string) {
    setPlanos((atual) => atual.filter((p) => p.chave !== chave));
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
        <div className={styles.adicionarGrupo}>
          <span className={styles.adicionarRotulo}>Produto do catálogo</span>
          <div className={styles.adicionarLinha}>
            <div className={styles.adicionarSelect}>
              <SelectBusca
                opcoes={produtos.map((p) => ({ valor: p.id, rotulo: p.nome }))}
                valor={escolhido}
                onChange={setEscolhido}
                placeholder="Escolha um produto"
                placeholderBusca="Buscar produto…"
                rotuloAcessivel="Produto do catálogo"
              />
            </div>
            <button type="button" className={styles.botao} onClick={adicionarProduto} disabled={!escolhido}>
              Adicionar
            </button>
          </div>
        </div>
        <form className={styles.adicionarGrupo} onSubmit={adicionarAvulso}>
          <label className={styles.adicionarRotulo} htmlFor="nome-avulso">
            Ou algo que ainda não é produto
          </label>
          <div className={styles.adicionarLinha}>
            <input
              id="nome-avulso"
              className={`${styles.entrada} ${styles.adicionarSelect}`}
              value={nomeAvulso}
              onChange={(e) => setNomeAvulso(e.target.value)}
              placeholder="Ex.: Boneco de neve 15 cm"
              maxLength={120}
            />
            <button type="submit" className={styles.botao} disabled={!nomeAvulso.trim()}>
              Adicionar
            </button>
          </div>
        </form>
      </div>

      {planos.length === 0 ? (
        <p className={styles.vazio}>
          Nada aqui ainda. Escolha um produto ou digite um nome acima, ou leve as peças de um produto pela tela de{" "}
          <Link href="/admin/producao">Produção</Link>.
        </p>
      ) : (
        planos.map((plano) => (
          <PlanoProdutoCard
            key={plano.chave}
            plano={plano}
            destaque={plano.chave === destaque}
            onSalvo={salvo}
            onRemovido={removido}
          />
        ))
      )}
    </div>
  );
}
