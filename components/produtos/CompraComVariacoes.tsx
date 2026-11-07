"use client";

import { useState } from "react";
import BotaoAdicionarCarrinho from "@/components/carrinho/BotaoAdicionarCarrinho";
import ImagemOtimizada from "@/components/ImagemOtimizada";
import { formatarPreco } from "@/lib/produtos/formato";
import { nomeComVariacao } from "@/lib/produtos/variacoes";
import GaleriaFotosProduto from "./GaleriaFotosProduto";
import styles from "./produtos.module.css";
import carrinho from "@/components/carrinho/carrinho.module.css";

export interface VariacaoVitrine {
  id: string;
  nome: string;
  preco: number;
  estoque: number;
  foto: string;
  /** "2× Estrela", "Árvore" — o que vem no kit. */
  itens: string[];
}

/**
 * Página do produto com variações de kit (specs/041): o cliente escolhe o
 * kit e preço, foto, estoque e itens inclusos trocam na hora. A escolha vai
 * para a URL (`?variacao=`) para o link poder ser compartilhado.
 */
export default function CompraComVariacoes({
  produtoId,
  nome,
  descricao,
  categoria,
  categoriaNome,
  slug,
  fotos,
  variacoes,
  variacaoInicial,
}: {
  produtoId: string;
  nome: string;
  descricao: string;
  categoria: string;
  categoriaNome: string;
  slug: string;
  fotos: string[];
  variacoes: VariacaoVitrine[];
  variacaoInicial?: string;
}) {
  const [escolhidaId, setEscolhidaId] = useState<string | undefined>(() =>
    variacoes.some((v) => v.id === variacaoInicial && v.estoque > 0) ? variacaoInicial : undefined
  );
  const escolhida = variacoes.find((v) => v.id === escolhidaId);
  const disponiveis = variacoes.filter((v) => v.estoque > 0);
  const menorPreco = Math.min(...(disponiveis.length > 0 ? disponiveis : variacoes).map((v) => v.preco));

  function escolher(id: string) {
    setEscolhidaId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("variacao", id);
    window.history.replaceState(null, "", url);
  }

  const indiceFoto = escolhida ? Math.max(0, fotos.indexOf(escolhida.foto)) : 0;

  return (
    <div className={styles.detail}>
      <GaleriaFotosProduto key={escolhida?.id ?? "produto"} fotos={fotos} nome={nome} indiceInicial={indiceFoto} />

      <div className={styles.detailInfo}>
        <h1>{nome}</h1>
        <div className={styles.detailPrice} aria-live="polite">
          {escolhida ? formatarPreco(escolhida.preco) : <><span className={styles.aPartirDe}>a partir de</span> {formatarPreco(menorPreco)}</>}
        </div>

        <fieldset className={styles.variacoes}>
          <legend>
            escolha o kit{escolhida ? <>: <strong>{escolhida.nome}</strong></> : null}
          </legend>
          {variacoes.map((v) => {
            const esgotada = v.estoque === 0;
            return (
              <label key={v.id} className={v.id === escolhidaId ? styles.variacaoAtiva : styles.variacao} data-esgotada={esgotada || undefined}>
                <input
                  type="radio"
                  name="variacao"
                  value={v.id}
                  className={styles.srOnly}
                  checked={v.id === escolhidaId}
                  disabled={esgotada}
                  onChange={() => escolher(v.id)}
                />
                {v.foto && <ImagemOtimizada src={v.foto} alt="" sizes="48px" className={styles.variacaoFoto} />}
                <span className={styles.variacaoTexto}>
                  <span className={styles.variacaoNome}>{v.nome}</span>
                  <span className={styles.variacaoPreco}>{esgotada ? "esgotado" : formatarPreco(v.preco)}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <p className={styles.detailDesc}>{descricao}</p>

        <div className={styles.datasheet}>
          <div className={styles.datasheetTitle}>ficha técnica</div>
          <dl>
            <dt>categoria</dt>
            <dd>{categoriaNome}</dd>
            <dt>estoque</dt>
            <dd>{escolhida ? `${escolhida.estoque} ${escolhida.estoque === 1 ? "kit" : "kits"}` : "escolha um kit"}</dd>
            {escolhida && escolhida.itens.length > 0 && (
              <>
                <dt>vem no kit</dt>
                <dd>
                  <ul className={styles.itensKit}>
                    {escolhida.itens.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </dd>
              </>
            )}
          </dl>
        </div>

        {escolhida ? (
          <BotaoAdicionarCarrinho
            key={escolhida.id}
            produtoId={produtoId}
            nome={nomeComVariacao(nome, escolhida.nome)}
            foto={escolhida.foto}
            categoria={categoria}
            slug={slug}
            preco={escolhida.preco}
            estoque={escolhida.estoque}
            variacaoId={escolhida.id}
            variacaoNome={escolhida.nome}
          />
        ) : disponiveis.length === 0 ? (
          <p className={carrinho.esgotado}>esgotado por enquanto…</p>
        ) : (
          <div className={carrinho.compra}>
            <button type="button" className={carrinho.botao} disabled>
              Escolha um kit para adicionar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
