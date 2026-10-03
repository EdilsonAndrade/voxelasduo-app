"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ConfirmModal from "./ConfirmModal";
import LinhaPrecoProduto, {
  linhaAlterada,
  type CampoPreco,
  type EstadoLinha,
  type PrecosLinha,
} from "./LinhaPrecoProduto";
import MarcarCarrosselProduto, { type CarrosselOpcao } from "./MarcarCarrosselProduto";
import TrocarCategoriaProduto from "./TrocarCategoriaProduto";
import type { CategoriaResumo } from "@/lib/models/categoria";
import type { PrecosCanaisProduto, Produto } from "@/lib/models/produto";
import { formatarPreco } from "@/lib/produtos/formato";
import {
  ajustarPrecoEvento,
  centavosParaTexto,
  erroEstoque,
  erroPrecoMercadoLivre,
  erroPrecoSite,
  percentualAjusteValido,
  textoParaCentavos,
  textoParaEstoque,
} from "@/lib/produtos/precoLista";
import adminStyles from "./admin.module.css";
import styles from "./listaProdutos.module.css";

/** Produto já preparado pelo servidor para a lista do admin (EDI-126). */
export interface ProdutoLinha {
  id: string;
  nome: string;
  /** Primeira foto do produto (miniatura) — `null` sem fotos. */
  foto: string | null;
  categoria: string;
  estoque: number;
  precoCentavos: number;
  precoMercadoLivreCentavos: number | null;
  precoShopeeCentavos: number | null;
  /** Custo total por peça (`calcularCustoProducao().totalCentavos`) — `null` sem custo configurado. */
  custoCentavos: number | null;
  /** Ajuste do evento já gravado — `null` = preços normais. */
  ajusteEvento: { percentual: number; precoAnterior: number } | null;
  mercadoLivrePermalink: string | null;
  noCatalogoFacebook: boolean;
  /** `false` = rascunho: cadastrado, mas ainda fora da loja. */
  publicado: boolean;
  carrosseis: string[];
}

type Aviso = { tipo: "ok" | "erro"; texto: string } | null;

function textosDe(precos: PrecosLinha): EstadoLinha["textos"] {
  return {
    site: centavosParaTexto(precos.site),
    mercadoLivre: centavosParaTexto(precos.mercadoLivre),
    shopee: centavosParaTexto(precos.shopee),
  };
}

/** Estado da linha a partir do produto devolvido pela API depois de salvar/restaurar. */
function estadoDoProduto(
  produto: Produto
): Pick<EstadoLinha, "original" | "textos" | "ajusteAtivo" | "estoqueOriginal" | "estoqueTexto"> {
  const original = {
    site: produto.preco,
    mercadoLivre: produto.precosCanais?.mercadoLivre ?? null,
    shopee: produto.precosCanais?.shopee ?? null,
  };
  return {
    original,
    textos: textosDe(original),
    estoqueOriginal: produto.estoque,
    estoqueTexto: String(produto.estoque),
    ajusteAtivo: produto.ajusteEvento
      ? { percentual: produto.ajusteEvento.percentual, precoAnterior: produto.ajusteEvento.precoAnterior }
      : null,
  };
}

function estadoInicial(produtos: ProdutoLinha[]): Record<string, EstadoLinha> {
  const estados: Record<string, EstadoLinha> = {};
  for (const p of produtos) {
    const original = { site: p.precoCentavos, mercadoLivre: p.precoMercadoLivreCentavos, shopee: p.precoShopeeCentavos };
    estados[p.id] = {
      original,
      textos: textosDe(original),
      estoqueOriginal: p.estoque,
      estoqueTexto: String(p.estoque),
      ajustePendente: null,
      ajusteAtivo: p.ajusteEvento,
      salvando: false,
      status: null,
    };
  }
  return estados;
}

function mensagemErro(corpo: { erro?: string; campos?: Record<string, string> }, status: number): string {
  const campos = corpo.campos ?? {};
  return (
    campos.percentual ?? campos.preco ?? campos.estoque ?? campos.precosCanais ?? corpo.erro ?? `Erro ${status}.`
  );
}

function plural(n: number, um: string, varios: string): string {
  return n === 1 ? um : varios;
}

/**
 * Lista de produtos do admin: seleção para a lista de preços impressa,
 * preços editáveis por linha, custo de produção e ajuste de preços do evento
 * (EDI-126).
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
  const [linhas, setLinhas] = useState(() => estadoInicial(produtos));
  // As gravações em sequência leem o estado mais recente, não o do render que as disparou.
  const linhasRef = useRef(linhas);
  useEffect(() => {
    linhasRef.current = linhas;
  }, [linhas]);
  const [percentualTexto, setPercentualTexto] = useState("30");
  const [aviso, setAviso] = useState<Aviso>(null);
  const [emLote, setEmLote] = useState(false);
  const [confirmarRestauracao, setConfirmarRestauracao] = useState(false);

  const todosMarcados = produtos.length > 0 && produtos.every((p) => selecionados.has(p.id));
  const idsSelecionados = produtos.filter((p) => selecionados.has(p.id)).map((p) => p.id);
  const idsAlterados = produtos.filter((p) => linhaAlterada(linhas[p.id])).map((p) => p.id);
  const idsAjustePendente = produtos.filter((p) => linhas[p.id].ajustePendente !== null).map((p) => p.id);
  const idsAjusteAtivo = produtos.filter((p) => linhas[p.id].ajusteAtivo !== null).map((p) => p.id);
  const percentuaisAtivos = [...new Set(idsAjusteAtivo.map((id) => linhas[id].ajusteAtivo!.percentual))];
  const urlLista = `/admin/produtos/lista-precos?ids=${idsSelecionados.join(",")}`;
  // Depois de Aplicar, só Salvar ou Descartar: evita somar dois ajustes na mesma tela.
  const ajusteTravado = idsAjustePendente.length > 0;

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

  function atualizarLinha(id: string, mudanca: Partial<EstadoLinha>) {
    setLinhas((atual) => {
      const nova = { ...atual, [id]: { ...atual[id], ...mudanca } };
      linhasRef.current = nova;
      return nova;
    });
  }

  function editar(id: string, campo: CampoPreco, valor: string) {
    setLinhas((atual) => ({
      ...atual,
      [id]: { ...atual[id], textos: { ...atual[id].textos, [campo]: valor }, status: null },
    }));
  }

  function editarEstoque(id: string, valor: string) {
    setLinhas((atual) => ({ ...atual, [id]: { ...atual[id], estoqueTexto: valor, status: null } }));
  }

  /** Grava uma linha; com ajuste pendente, usa o endpoint que guarda os preços de antes (FR-016). */
  async function salvar(id: string): Promise<boolean> {
    const estado = linhasRef.current[id];
    const site = textoParaCentavos(estado.textos.site);
    const mercadoLivre = textoParaCentavos(estado.textos.mercadoLivre);
    const shopee = textoParaCentavos(estado.textos.shopee);
    const estoque = textoParaEstoque(estado.estoqueTexto);

    const erro =
      erroPrecoSite(site) ??
      erroPrecoMercadoLivre(mercadoLivre) ??
      (shopee !== null && !(shopee > 0) ? "Preço da Shopee inválido. Use, por exemplo, 49,90." : null) ??
      erroEstoque(estoque);
    if (erro) {
      atualizarLinha(id, { status: { tipo: "erro", texto: erro } });
      return false;
    }

    // `precosCanais` vai inteiro: o servidor substitui o objeto todo.
    const precosCanais: PrecosCanaisProduto = {};
    if (mercadoLivre !== null) precosCanais.mercadoLivre = mercadoLivre;
    if (shopee !== null) precosCanais.shopee = shopee;

    const comAjuste = estado.ajustePendente !== null;
    const estoqueMudou = estoque !== estado.estoqueOriginal;
    atualizarLinha(id, { salvando: true, status: null });

    async function enviar(url: string, method: string, corpoEnvio: unknown) {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpoEnvio),
      }).catch(() => null);
      if (!r) return { ok: false as const, texto: "Sem conexão. Tente salvar de novo." };
      const json = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false as const, texto: mensagemErro(json, r.status) };
      return { ok: true as const, produto: json.produto as Produto };
    }

    // O ajuste do evento tem endpoint próprio, que só mexe em preço. Quando a
    // linha também mudou de estoque, o estoque vai num PATCH logo depois — é a
    // única forma de salvar as duas coisas pelo mesmo botão.
    const primeiro = comAjuste
      ? await enviar(`/api/produtos/${id}/ajuste-evento`, "POST", {
          percentual: estado.ajustePendente,
          preco: site,
          precosCanais,
        })
      : await enviar(`/api/produtos/${id}`, "PATCH", { preco: site, precosCanais, estoque });

    if (!primeiro.ok) {
      atualizarLinha(id, { salvando: false, status: { tipo: "erro", texto: primeiro.texto } });
      return false;
    }

    let produtoFinal = primeiro.produto;
    if (comAjuste && estoqueMudou) {
      const segundo = await enviar(`/api/produtos/${id}`, "PATCH", { estoque });
      if (!segundo.ok) {
        // O preço do evento já foi gravado; só o estoque falhou — a linha precisa dizer isso.
        atualizarLinha(id, {
          ...estadoDoProduto(produtoFinal),
          ajustePendente: null,
          salvando: false,
          status: { tipo: "erro", texto: `Preço salvo, estoque não: ${segundo.texto}` },
        });
        return false;
      }
      produtoFinal = segundo.produto;
    }

    atualizarLinha(id, {
      ...estadoDoProduto(produtoFinal),
      ajustePendente: null,
      salvando: false,
      status: { tipo: "ok", texto: "Salvo" },
    });
    return true;
  }

  async function salvarTodos() {
    setEmLote(true);
    setAviso(null);
    let falhas = 0;
    // Uma por vez: cada linha mostra o próprio resultado e o Mercado Livre não recebe rajadas.
    for (const id of idsAlterados) {
      if (!(await salvar(id))) falhas++;
    }
    setEmLote(false);
    setAviso(
      falhas === 0
        ? { tipo: "ok", texto: "Alterações salvas." }
        : {
            tipo: "erro",
            texto: `${falhas} ${plural(falhas, "linha não foi salva", "linhas não foram salvas")}. Veja o erro em cada uma.`,
          }
    );
  }

  /** Preenche os preços do evento nos marcados, sem gravar (FR-014/FR-015). */
  function aplicarAjuste() {
    const percentual = Number(percentualTexto.trim().replace(",", "."));
    if (!percentualAjusteValido(percentual)) {
      setAviso({ tipo: "erro", texto: "Informe um percentual de 1 a 90." });
      return;
    }

    const alvo = produtos.filter((p) => selecionados.has(p.id));
    const pulados = alvo.filter((p) => linhas[p.id].ajusteAtivo !== null).length;
    const aplicar = alvo.filter((p) => linhas[p.id].ajusteAtivo === null);

    setLinhas((atual) => {
      const nova = { ...atual };
      for (const p of aplicar) {
        // Sempre a partir do preço gravado: é ele que o "Restaurar" devolve.
        const { original } = atual[p.id];
        const ajustado: PrecosLinha = {
          site: ajustarPrecoEvento(original.site, percentual),
          mercadoLivre: original.mercadoLivre !== null ? ajustarPrecoEvento(original.mercadoLivre, percentual) : null,
          shopee: original.shopee !== null ? ajustarPrecoEvento(original.shopee, percentual) : null,
        };
        nova[p.id] = { ...atual[p.id], textos: textosDe(ajustado), ajustePendente: percentual, status: null };
      }
      return nova;
    });

    const partes: string[] = [];
    if (aplicar.length > 0) {
      partes.push(
        `Ajuste de ${percentual}% preenchido em ${aplicar.length} ${plural(aplicar.length, "produto", "produtos")}. Confira os preços e clique em Salvar todos.`
      );
    }
    if (pulados > 0) {
      partes.push(
        `${pulados} ${plural(pulados, "produto já tinha ajuste e foi pulado", "produtos já tinham ajuste e foram pulados")}: restaure os preços antes de aplicar outro.`
      );
    }
    setAviso({ tipo: aplicar.length > 0 ? "ok" : "erro", texto: partes.join(" ") });
  }

  function descartarAjuste() {
    setLinhas((atual) => {
      const nova = { ...atual };
      for (const id of idsAjustePendente) {
        nova[id] = { ...atual[id], textos: textosDe(atual[id].original), ajustePendente: null, status: null };
      }
      return nova;
    });
    setAviso(null);
  }

  /** Devolve os preços de antes do ajuste em todos os produtos ajustados (FR-017). */
  async function restaurarTodos() {
    setConfirmarRestauracao(false);
    setEmLote(true);
    setAviso(null);
    let falhas = 0;
    for (const id of idsAjusteAtivo) {
      atualizarLinha(id, { salvando: true, status: null });
      const resposta = await fetch(`/api/produtos/${id}/ajuste-evento`, { method: "DELETE" }).catch(() => null);
      const corpo = resposta ? await resposta.json().catch(() => ({})) : {};
      if (!resposta?.ok) {
        falhas++;
        atualizarLinha(id, {
          salvando: false,
          status: {
            tipo: "erro",
            texto: resposta ? mensagemErro(corpo, resposta.status) : "Sem conexão. Tente restaurar de novo.",
          },
        });
        continue;
      }
      atualizarLinha(id, {
        ...estadoDoProduto(corpo.produto as Produto),
        ajustePendente: null,
        salvando: false,
        status: { tipo: "ok", texto: "Restaurado" },
      });
    }
    setEmLote(false);
    setAviso(
      falhas === 0
        ? { tipo: "ok", texto: "Preços de antes do evento restaurados." }
        : {
            tipo: "erro",
            texto: `${falhas} ${plural(falhas, "produto não foi restaurado", "produtos não foram restaurados")}. Veja o erro em cada linha.`,
          }
    );
  }

  // Avisa antes de sair com preços não salvos (FR-008).
  const haAlterados = idsAlterados.length > 0;
  useEffect(() => {
    if (!haAlterados) return;
    const avisar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [haAlterados]);

  return (
    <>
      <section className={styles.painelAjuste} aria-labelledby="titulo-ajuste-evento">
        <div className={styles.painelTexto}>
          <h2 id="titulo-ajuste-evento" className={styles.painelTitulo}>
            Ajuste do evento
          </h2>
          <p className={styles.painelDescricao}>
            Comissão que o evento cobra por peça vendida. Os preços do site, Mercado Livre e Shopee dos produtos
            marcados sobem para você receber o mesmo valor de hoje (arredondado para ,90).
          </p>
        </div>
        <div className={styles.painelControles}>
          <label className={styles.campoPercentual}>
            <span className={styles.rotuloCampo}>Comissão</span>
            <span className={styles.entrada}>
              <input
                type="text"
                inputMode="decimal"
                value={percentualTexto}
                onChange={(evento) => setPercentualTexto(evento.target.value)}
                aria-label="Comissão do evento em %"
                disabled={ajusteTravado || emLote}
              />
              <span aria-hidden="true">%</span>
            </span>
          </label>
          {ajusteTravado ? (
            <button type="button" className={adminStyles.btnGhost} onClick={descartarAjuste} disabled={emLote}>
              Descartar ajuste
            </button>
          ) : (
            <button
              type="button"
              className={adminStyles.btnPrimary}
              onClick={aplicarAjuste}
              disabled={idsSelecionados.length === 0 || emLote}
              title={idsSelecionados.length === 0 ? "Marque os produtos que vão para o evento" : undefined}
            >
              Aplicar nos marcados{idsSelecionados.length > 0 ? ` (${idsSelecionados.length})` : ""}
            </button>
          )}
        </div>

        {idsAjusteAtivo.length > 0 && (
          <div className={styles.ajusteAtivo} role="status">
            <span>
              <strong>Ajuste do evento ativo</strong> em {idsAjusteAtivo.length}{" "}
              {plural(idsAjusteAtivo.length, "produto", "produtos")} ({percentuaisAtivos.join("%, ")}%).
            </span>
            <button
              type="button"
              className={adminStyles.btnGhost}
              onClick={() => setConfirmarRestauracao(true)}
              disabled={emLote}
            >
              Restaurar preços anteriores
            </button>
          </div>
        )}

        {aviso && (
          <p className={aviso.tipo === "ok" ? styles.avisoOk : styles.avisoErro} role="status">
            {aviso.texto}
          </p>
        )}
      </section>

      <ConfirmModal
        aberto={confirmarRestauracao}
        titulo="Restaurar preços anteriores?"
        mensagem={`${idsAjusteAtivo.length} ${plural(idsAjusteAtivo.length, "produto volta", "produtos voltam")} ao preço de antes do ajuste do evento, no site, no Mercado Livre e na Shopee.`}
        textoConfirmar="Restaurar preços"
        onConfirmar={() => void restaurarTodos()}
        onCancelar={() => setConfirmarRestauracao(false)}
      />

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
            <th className={styles.colFoto}>Foto</th>
            <th>Produto</th>
            <th>Categoria</th>
            <th>Estoque</th>
            <th>Preços</th>
            <th>Canais</th>
            <th>Destaques</th>
            <th className={styles.colCusto}>Custo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((produto) => {
            const marcado = selecionados.has(produto.id);
            const classes = [
              styles.linha,
              produto.publicado ? "" : styles.linhaRascunho,
              marcado ? styles.linhaMarcada : "",
              linhaAlterada(linhas[produto.id]) ? styles.linhaAlterada : "",
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
                <td className={styles.colFoto}>
                  {produto.foto && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={produto.foto} alt={produto.nome} className={styles.miniatura} loading="lazy" />
                  )}
                </td>
                <td className={styles.colNome}>
                  {produto.nome}{" "}
                  {!produto.publicado && (
                    <span className={adminStyles.badgeZero} title="Rascunho: fora da loja até ser publicado">
                      Rascunho
                    </span>
                  )}
                </td>
                <td className={styles.colCategoria} data-rotulo="Categoria">
                  <TrocarCategoriaProduto
                    produtoId={produto.id}
                    produtoNome={produto.nome}
                    categoriaInicial={produto.categoria}
                    categorias={categorias}
                  />
                </td>
                <td className={styles.colEstoque} data-rotulo="Estoque">
                  <div
                    className={
                      textoParaEstoque(linhas[produto.id].estoqueTexto) === 0
                        ? `${styles.entrada} ${styles.entradaEstoque} ${styles.entradaEsgotado}`
                        : `${styles.entrada} ${styles.entradaEstoque}`
                    }
                  >
                    <input
                      inputMode="numeric"
                      value={linhas[produto.id].estoqueTexto}
                      onChange={(e) => editarEstoque(produto.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void salvar(produto.id);
                      }}
                      aria-label={`Estoque de ${produto.nome}`}
                    />
                    <span className={styles.unidade}>un.</span>
                  </div>
                </td>
                <td className={styles.colPrecos}>
                  <LinhaPrecoProduto
                    produtoNome={produto.nome}
                    estado={linhas[produto.id]}
                    custoCentavos={produto.custoCentavos}
                    onEditar={(campo, valor) => editar(produto.id, campo, valor)}
                    onSalvar={() => void salvar(produto.id)}
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
                <td className={styles.colCusto} data-rotulo="Custo">
                  {produto.custoCentavos === null ? (
                    <span className={styles.semCusto} title="Custo de produção não configurado">
                      —
                    </span>
                  ) : (
                    <span className={styles.custo}>{formatarPreco(produto.custoCentavos)}</span>
                  )}
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
        {idsAlterados.length > 0 && (
          <button type="button" className={styles.btnSalvarTodos} onClick={() => void salvarTodos()} disabled={emLote}>
            {emLote ? "Salvando…" : `Salvar todos os alterados (${idsAlterados.length})`}
          </button>
        )}
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
