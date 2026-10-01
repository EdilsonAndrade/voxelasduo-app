"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LinhaPrecoProduto from "./LinhaPrecoProduto";
import MarcarCarrosselProduto, { type CarrosselOpcao } from "./MarcarCarrosselProduto";
import TrocarCategoriaProduto from "./TrocarCategoriaProduto";
import type { CategoriaResumo } from "@/lib/models/categoria";
import { formatarPreco } from "@/lib/produtos/formato";
import adminStyles from "./admin.module.css";
import styles from "./listaProdutos.module.css";

/** Produto já preparado pelo servidor para a lista do admin (EDI-126). */
export interface ProdutoLinha {
  id: string;
  nome: string;
  categoria: string;
  estoque: number;
  precoCentavos: number;
  precoMercadoLivreCentavos: number | null;
  precoShopeeCentavos: number | null;
  /** Custo total por peça (`calcularCustoProducao().totalCentavos`) — `null` sem custo configurado. */
  custoCentavos: number | null;
  mercadoLivrePermalink: string | null;
  noCatalogoFacebook: boolean;
  carrosseis: string[];
}

/**
 * Lista de produtos do admin: seleção para a lista de preços impressa,
 * preços editáveis por linha e custo de produção (EDI-126).
 */
export default function ListaProdutosAdmin({
  produtos,
  categorias,
  carrosseis,
}: {
  produtos: ProdutoLinha[];
  categorias: CategoriaResumo[];
  carrosseis: CarrosselOpcao[];
}) {
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set());
  const [alterados, setAlterados] = useState<Set<string>>(() => new Set());

  const todosMarcados = produtos.length > 0 && produtos.every((p) => selecionados.has(p.id));

  function alternar(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function alternarTodos() {
    setSelecionados(todosMarcados ? new Set() : new Set(produtos.map((p) => p.id)));
  }

  // Um callback estável por produto, para o efeito da linha não disparar a cada render.
  const avisosAlteracao = useMemo(() => {
    const mapa = new Map<string, (alterado: boolean) => void>();
    for (const p of produtos) {
      mapa.set(p.id, (alterado: boolean) =>
        setAlterados((atual) => {
          if (atual.has(p.id) === alterado) return atual;
          const novo = new Set(atual);
          if (alterado) novo.add(p.id);
          else novo.delete(p.id);
          return novo;
        })
      );
    }
    return mapa;
  }, [produtos]);

  // Avisa antes de sair com preços não salvos (FR-008).
  useEffect(() => {
    if (alterados.size === 0) return;
    const avisar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [alterados.size]);

  const idsSelecionados = produtos.filter((p) => selecionados.has(p.id)).map((p) => p.id);
  const urlLista = `/admin/produtos/lista-precos?ids=${idsSelecionados.join(",")}`;

  return (
    <>
      {alterados.size > 0 && (
        <p className={styles.avisoPendentes} role="status">
          {alterados.size === 1
            ? "1 produto com preço não salvo."
            : `${alterados.size} produtos com preço não salvo.`}{" "}
          Clique em Salvar em cada linha.
        </p>
      )}

      <table className={styles.tabela}>
        <thead>
          <tr>
            <th className={styles.colSelecao}>
              <input
                type="checkbox"
                className={styles.caixa}
                checked={todosMarcados}
                onChange={alternarTodos}
                aria-label="Marcar todos para a lista de preços"
              />
            </th>
            <th>Produto</th>
            <th>Categoria</th>
            <th>Estoque</th>
            <th className={styles.colCusto}>Custo</th>
            <th>Preços</th>
            <th>Canais</th>
            <th>Destaques</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((produto) => {
            const marcado = selecionados.has(produto.id);
            const classes = [
              styles.linha,
              marcado ? styles.linhaMarcada : "",
              alterados.has(produto.id) ? styles.linhaAlterada : "",
            ].join(" ");
            return (
              <tr key={produto.id} className={classes}>
                <td className={styles.colSelecao}>
                  <input
                    type="checkbox"
                    className={styles.caixa}
                    checked={marcado}
                    onChange={() => alternar(produto.id)}
                    aria-label={`Incluir ${produto.nome} na lista de preços`}
                  />
                </td>
                <td className={styles.colNome}>{produto.nome}</td>
                <td className={styles.colCategoria} data-rotulo="Categoria">
                  <TrocarCategoriaProduto
                    produtoId={produto.id}
                    produtoNome={produto.nome}
                    categoriaInicial={produto.categoria}
                    categorias={categorias}
                  />
                </td>
                <td className={styles.colEstoque} data-rotulo="Estoque">
                  <span className={produto.estoque === 0 ? adminStyles.badgeZero : adminStyles.badge}>
                    {produto.estoque} un.
                  </span>
                </td>
                <td className={styles.colCusto} data-rotulo="Custo">
                  {produto.custoCentavos === null ? (
                    <span className={styles.semCusto} title="Custo de produção não configurado">
                      —
                    </span>
                  ) : (
                    <span className={styles.custo}>{formatarPreco(produto.custoCentavos)}</span>
                  )}
                </td>
                <td className={styles.colPrecos}>
                  <LinhaPrecoProduto
                    produtoId={produto.id}
                    produtoNome={produto.nome}
                    precoInicial={produto.precoCentavos}
                    precoMercadoLivreInicial={produto.precoMercadoLivreCentavos}
                    precoShopee={produto.precoShopeeCentavos}
                    custoCentavos={produto.custoCentavos}
                    onAlteradoChange={avisosAlteracao.get(produto.id)!}
                  />
                </td>
                <td className={styles.colCanais}>
                  {produto.mercadoLivrePermalink ? (
                    <a
                      href={produto.mercadoLivrePermalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={adminStyles.badgeCanalMercadoLivre}
                      title="Abrir anúncio no Mercado Livre"
                    >
                      Mercado Livre ↗
                    </a>
                  ) : (
                    <span className={adminStyles.badgeCanalShopeeEmBreve} title="Sem anúncio no Mercado Livre">
                      Mercado Livre
                    </span>
                  )}{" "}
                  {/* Sem link: a loja da Shopee ainda depende de vendas manuais para ser liberada. */}
                  <span className={adminStyles.badgeCanalShopeeEmBreve} title="Loja da Shopee ainda sem link">
                    Shopee
                  </span>{" "}
                  {produto.noCatalogoFacebook ? (
                    <span className={adminStyles.badgeCanalFacebook} title="No catálogo do Facebook/Instagram">
                      Facebook
                    </span>
                  ) : (
                    <span
                      className={adminStyles.badgeCanalShopeeEmBreve}
                      title="Fora do catálogo do Facebook/Instagram"
                    >
                      Facebook
                    </span>
                  )}
                </td>
                <td className={styles.colDestaques}>
                  <MarcarCarrosselProduto
                    produtoId={produto.id}
                    produtoNome={produto.nome}
                    carrosseis={carrosseis}
                    marcadosIniciais={produto.carrosseis}
                  />
                </td>
                <td className={styles.colAcoes}>
                  <Link href={`/admin/produtos/${produto.id}/editar`} className={adminStyles.btnGhost}>
                    editar
                  </Link>{" "}
                  <Link
                    href={`/admin/produtos/novo?duplicarDe=${produto.id}`}
                    className={adminStyles.btnGhost}
                    title="Cria um novo produto com os mesmos dados e preços (sem fotos, estoque e anúncios)"
                  >
                    duplicar
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className={styles.barraSelecao}>
        <label className={styles.marcarTodos}>
          <input type="checkbox" className={styles.caixa} checked={todosMarcados} onChange={alternarTodos} />
          {todosMarcados ? "Desmarcar todos" : "Marcar todos"}
        </label>
        <span className={styles.contagem}>
          {idsSelecionados.length === 0
            ? "Marque os produtos que vão para a lista de preços."
            : idsSelecionados.length === 1
              ? "1 produto marcado"
              : `${idsSelecionados.length} produtos marcados`}
        </span>
        {idsSelecionados.length > 0 ? (
          <a href={urlLista} target="_blank" rel="noopener" className={adminStyles.btnPrimary}>
            Gerar lista de preços ({idsSelecionados.length})
          </a>
        ) : (
          <button type="button" className={adminStyles.btnPrimary} disabled>
            Gerar lista de preços
          </button>
        )}
      </div>
    </>
  );
}
