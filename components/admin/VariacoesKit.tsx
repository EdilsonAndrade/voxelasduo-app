"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import SelectBusca from "./SelectBusca";
import styles from "./admin.module.css";
import v from "./variacoesKit.module.css";
import ImagemOtimizada from "@/components/ImagemOtimizada";
import { MAXIMO_VARIACOES, type VariacaoKit } from "@/lib/models/produto";
import { formatarPreco } from "@/lib/produtos/formato";
import { custoDaVariacao } from "@/lib/produtos/variacoes";
import { sugerirPrecosVariacao, type ConfigSugestaoVariacao } from "@/lib/produtos/sugestaoVariacao";

/** Desconto padrão da Shopee (promoção/oferta relâmpago) usado no preço sugerido. */
const DESCONTO_SHOPEE_PADRAO = "30";

/** Produto do catálogo que pode (ou não) ser peça de uma variação. */
export interface PecaCatalogo {
  id: string;
  nome: string;
  /** Custo sem a embalagem da peça — `null` = sem custo cadastrado. */
  custoCentavos: number | null;
  /** Peso da peça em gramas (custo de produção ou ficha técnica) — `null` = não cadastrado. */
  pesoGramas: number | null;
  /** Motivo para não poder ser peça — `null` = pode. */
  bloqueio: string | null;
}

interface PecaForm {
  produtoId: string;
  /** Nome guardado na variação — usado se o produto saiu do catálogo. */
  nome: string;
  custoCentavos: number | null;
  /** `null` = peça sem peso cadastrado (ou removida do catálogo). */
  pesoGramas: number | null;
  quantidade: string;
}

interface VariacaoForm {
  chave: string;
  id?: string;
  nome: string;
  pecas: PecaForm[];
  embalagemReais: string;
  precoReais: string;
  shopeeReais: string;
  mercadoLivreReais: string;
  estoque: string;
  foto: string;
}

const reais = (centavos?: number) => (centavos === undefined ? "" : (centavos / 100).toFixed(2));
const centavos = (texto: string) => {
  const n = Math.round(parseFloat(texto.replace(",", ".")) * 100);
  return Number.isFinite(n) ? n : NaN;
};

/** 850 → "850 g"; 1234 → "1,234 kg". */
const formatarPeso = (gramas: number) =>
  gramas >= 1000 ? `${(gramas / 1000).toFixed(3).replace(".", ",")} kg` : `${Math.round(gramas)} g`;

let contador = 0;
const novaChave = () => `v${Date.now()}-${contador++}`;

function paraFormulario(variacao: VariacaoKit, catalogo: Map<string, PecaCatalogo>): VariacaoForm {
  return {
    chave: variacao.id,
    id: variacao.id,
    nome: variacao.nome,
    pecas: variacao.pecas.map((p) => {
      const atual = catalogo.get(p.produtoId);
      return {
        produtoId: p.produtoId,
        nome: atual?.nome ?? `${p.ultimo.nome} (removido)`,
        custoCentavos: atual ? atual.custoCentavos : p.ultimo.custoCentavos,
        pesoGramas: atual ? atual.pesoGramas : null,
        quantidade: String(p.quantidade),
      };
    }),
    embalagemReais: reais(variacao.embalagemCentavos),
    precoReais: reais(variacao.preco),
    shopeeReais: reais(variacao.precosCanais?.shopee),
    mercadoLivreReais: reais(variacao.precosCanais?.mercadoLivre),
    estoque: String(variacao.estoque),
    foto: variacao.foto ?? "",
  };
}

/**
 * Variações de kit do produto (specs/041, EDI-138): cada variação tem peças,
 * embalagem, preço do site, preços de referência dos marketplaces, estoque e
 * foto. Salva separado do formulário do produto, pela rota de variações.
 */
export default function VariacoesKit({
  produtoId,
  fotos,
  variacoesIniciais,
  catalogo,
  taxaSite,
  sugestao,
}: {
  produtoId: string;
  fotos: string[];
  variacoesIniciais: VariacaoKit[];
  catalogo: PecaCatalogo[];
  taxaSite: { percentual: number; fixaCentavos: number };
  /** Taxas e margens da loja para o preço sugerido de cada canal. */
  sugestao: ConfigSugestaoVariacao;
}) {
  const router = useRouter();
  const mapaCatalogo = useMemo(() => new Map(catalogo.map((p) => [p.id, p])), [catalogo]);
  const opcoesPecas = useMemo(
    () =>
      catalogo
        .filter((p) => p.id !== produtoId && !p.bloqueio)
        .map((p) => ({ valor: p.id, rotulo: p.custoCentavos === null ? `${p.nome} (sem custo)` : p.nome })),
    [catalogo, produtoId]
  );

  const [variacoes, setVariacoes] = useState<VariacaoForm[]>(() => variacoesIniciais.map((x) => paraFormulario(x, mapaCatalogo)));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [descontoShopee, setDescontoShopee] = useState(DESCONTO_SHOPEE_PADRAO);
  const descontoShopeeNumero = Number(descontoShopee.replace(",", "."));
  const pontos = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
  const salvas = new Set(variacoesIniciais.map((x) => x.id));

  function alterar(chave: string, mudanca: Partial<VariacaoForm>) {
    setVariacoes((lista) => lista.map((x) => (x.chave === chave ? { ...x, ...mudanca } : x)));
    setAviso(null);
  }

  function adicionar(base?: VariacaoForm) {
    setVariacoes((lista) => [
      ...lista,
      base
        ? { ...base, chave: novaChave(), id: undefined, nome: `${base.nome} (cópia)`, pecas: base.pecas.map((p) => ({ ...p })) }
        : {
            chave: novaChave(),
            nome: "",
            pecas: [],
            embalagemReais: "",
            precoReais: "",
            shopeeReais: "",
            mercadoLivreReais: "",
            estoque: "0",
            foto: fotos[0] ?? "",
          },
    ]);
  }

  function mover(indice: number, delta: number) {
    setVariacoes((lista) => {
      const destino = indice + delta;
      if (destino < 0 || destino >= lista.length) return lista;
      const nova = [...lista];
      [nova[indice], nova[destino]] = [nova[destino], nova[indice]];
      return nova;
    });
  }

  function adicionarPeca(variacao: VariacaoForm, id: string) {
    const peca = mapaCatalogo.get(id);
    if (!peca) return;
    const existente = variacao.pecas.find((p) => p.produtoId === id);
    alterar(variacao.chave, {
      pecas: existente
        ? variacao.pecas.map((p) => (p.produtoId === id ? { ...p, quantidade: String((parseInt(p.quantidade, 10) || 0) + 1) } : p))
        : [...variacao.pecas, { produtoId: id, nome: peca.nome, custoCentavos: peca.custoCentavos, pesoGramas: peca.pesoGramas, quantidade: "1" }],
    });
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setCampos({});
    setAviso(null);
    try {
      const corpo = {
        variacoes: variacoes.map((x) => {
          const shopee = centavos(x.shopeeReais);
          const mercadoLivre = centavos(x.mercadoLivreReais);
          return {
            ...(x.id ? { id: x.id } : {}),
            nome: x.nome,
            pecas: x.pecas.map((p) => ({ produtoId: p.produtoId, quantidade: Number(p.quantidade) })),
            embalagemCentavos: x.embalagemReais.trim() === "" ? 0 : centavos(x.embalagemReais),
            preco: centavos(x.precoReais),
            precosCanais: {
              ...(x.shopeeReais.trim() ? { shopee } : {}),
              ...(x.mercadoLivreReais.trim() ? { mercadoLivre } : {}),
            },
            estoque: Number(x.estoque),
            ...(x.foto ? { foto: x.foto } : {}),
          };
        }),
      };
      const resposta = await fetch(`/api/produtos/${produtoId}/variacoes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(dados.erro ?? `Não foi possível salvar as variações (HTTP ${resposta.status}).`);
        setCampos(dados.campos ?? {});
        return;
      }
      const atualizadas: VariacaoKit[] = dados.produto?.variacoes ?? [];
      setVariacoes(atualizadas.map((x) => paraFormulario(x, mapaCatalogo)));
      setAviso(atualizadas.length > 0 ? "Variações salvas. Preço e estoque do produto foram atualizados." : "Variações removidas.");
      router.refresh();
    } catch (falha) {
      setErro(`Não foi possível salvar as variações: ${falha instanceof Error ? falha.message : String(falha)}`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className={v.secao} aria-labelledby="variacoes-kit-titulo">
      <header className={v.cabecalho}>
        <div>
          <h2 id="variacoes-kit-titulo">Variações de kit</h2>
          <p className={styles.mlLinkAviso}>
            Um anúncio com opções de kit, como na Shopee (Kit 3, Kit 4, Kit Completo). Cada opção tem peças, preço, estoque e foto. Com
            variações, o preço do produto passa a ser o menor deles e o estoque, a soma.
          </p>
        </div>
      </header>

      <p className={styles.mlLinkAviso}>
        {fotos.length === 0
          ? "Salve as fotos do produto primeiro para escolher a foto de cada variação."
          : `As fotos e as peças disponíveis são as já salvas (${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"}). Enviou fotos ou criou peças agora? Salve as variações, salve o produto e recarregue a página.`}
      </p>

      <div className={v.descontoShopee}>
        <label htmlFor="var-desconto-shopee">Desconto que vou dar na Shopee (%)</label>
        <input
          id="var-desconto-shopee"
          inputMode="decimal"
          value={descontoShopee}
          onChange={(e) => setDescontoShopee(e.target.value)}
        />
        <span>
          Promoção ou oferta relâmpago, em cima do preço cheio.
          {sugestao.cupomLoja ? ` O cupom de loja de ${pontos(sugestao.cupomLoja.percentual)}% já entra na conta.` : " Sem cupom de loja configurado."}{" "}
          O preço sugerido garante {pontos(sugestao.margemMinimaPercentual)}% de lucro sobre o que o cliente paga na Shopee e{" "}
          {pontos(sugestao.margemDesejadaPercentual)}% no site e no Mercado Livre.
        </span>
      </div>

      {variacoes.length === 0 && <p className={v.vazio}>Nenhuma variação. Produto vendido como peça única.</p>}

      <ol className={v.lista}>
        {variacoes.map((variacao, i) => {
          const erroDe = (nome: string) => campos[`variacoes[${i}].${nome}`];
          const custo = custoDaVariacao(
            variacao.pecas.map((p) => ({ quantidade: Number(p.quantidade) || 0, custoCentavos: p.custoCentavos })),
            Number.isFinite(centavos(variacao.embalagemReais)) ? centavos(variacao.embalagemReais) : 0
          );
          const preco = centavos(variacao.precoReais);
          const taxa = Number.isFinite(preco) ? Math.round((preco * taxaSite.percentual) / 100) + taxaSite.fixaCentavos : 0;
          const lucro = Number.isFinite(preco) && preco > 0 ? preco - taxa - custo.custoCentavos : null;
          const peso = variacao.pecas.reduce(
            (acc, p) => {
              const quantidade = Number(p.quantidade) || 0;
              if (p.pesoGramas === null) return { ...acc, incompleto: true };
              return { ...acc, gramas: acc.gramas + p.pesoGramas * quantidade };
            },
            { gramas: 0, incompleto: false }
          );
          const sugerido =
            variacao.pecas.length > 0 && Number.isFinite(descontoShopeeNumero)
              ? sugerirPrecosVariacao(custo.custoCentavos, descontoShopeeNumero, sugestao)
              : null;

          return (
            <li key={variacao.chave} className={v.cartao}>
              <div className={v.topo}>
                <div className={styles.field}>
                  <label htmlFor={`var-nome-${variacao.chave}`}>Nome da variação</label>
                  <input
                    id={`var-nome-${variacao.chave}`}
                    placeholder="Kit 3 peças"
                    value={variacao.nome}
                    onChange={(e) => alterar(variacao.chave, { nome: e.target.value })}
                  />
                  {erroDe("nome") && <span className={styles.fieldError}>{erroDe("nome")}</span>}
                </div>
                <div className={v.acoesTopo}>
                  <button type="button" className={styles.btnGhost} onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir variação">
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => mover(i, 1)}
                    disabled={i === variacoes.length - 1}
                    aria-label="Descer variação"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => adicionar(variacao)}
                    disabled={variacoes.length >= MAXIMO_VARIACOES}
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={() => setVariacoes((lista) => lista.filter((x) => x.chave !== variacao.chave))}
                  >
                    Remover
                  </button>
                </div>
              </div>

              <div className={styles.field}>
                <label>Peças do kit</label>
                {variacao.pecas.length > 0 && (
                  <ul className={v.pecas}>
                    {variacao.pecas.map((peca) => (
                      <li key={peca.produtoId}>
                        <input
                          className={v.qtd}
                          inputMode="numeric"
                          aria-label={`Quantidade de ${peca.nome}`}
                          value={peca.quantidade}
                          onChange={(e) =>
                            alterar(variacao.chave, {
                              pecas: variacao.pecas.map((p) => (p.produtoId === peca.produtoId ? { ...p, quantidade: e.target.value } : p)),
                            })
                          }
                        />
                        <span className={v.pecaNome}>× {peca.nome}</span>
                        <span className={v.pecaCusto}>{peca.custoCentavos === null ? "sem custo" : formatarPreco(peca.custoCentavos)}</span>
                        <button
                          type="button"
                          className={v.removerPeca}
                          aria-label={`Tirar ${peca.nome}`}
                          onClick={() =>
                            alterar(variacao.chave, { pecas: variacao.pecas.filter((p) => p.produtoId !== peca.produtoId) })
                          }
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <SelectBusca
                  opcoes={opcoesPecas}
                  valor=""
                  onChange={(id) => adicionarPeca(variacao, id)}
                  placeholder="+ Adicionar peça"
                  placeholderBusca="Buscar produto…"
                  rotuloAcessivel="Adicionar peça à variação"
                />
                {erroDe("pecas") && <span className={styles.fieldError}>{erroDe("pecas")}</span>}
              </div>

              <div className={v.grade}>
                <div className={styles.field}>
                  <label htmlFor={`var-emb-${variacao.chave}`}>Embalagem do kit (R$)</label>
                  <input
                    id={`var-emb-${variacao.chave}`}
                    inputMode="decimal"
                    placeholder="5.00"
                    value={variacao.embalagemReais}
                    onChange={(e) => alterar(variacao.chave, { embalagemReais: e.target.value })}
                  />
                  {erroDe("embalagemCentavos") && <span className={styles.fieldError}>{erroDe("embalagemCentavos")}</span>}
                </div>
                <div className={styles.field}>
                  <label htmlFor={`var-preco-${variacao.chave}`}>Preço no site (R$)</label>
                  <input
                    id={`var-preco-${variacao.chave}`}
                    inputMode="decimal"
                    placeholder="55.93"
                    value={variacao.precoReais}
                    onChange={(e) => alterar(variacao.chave, { precoReais: e.target.value })}
                  />
                  {erroDe("preco") && <span className={styles.fieldError}>{erroDe("preco")}</span>}
                </div>
                <div className={styles.field}>
                  <label htmlFor={`var-estoque-${variacao.chave}`}>Estoque</label>
                  <input
                    id={`var-estoque-${variacao.chave}`}
                    inputMode="numeric"
                    value={variacao.estoque}
                    onChange={(e) => alterar(variacao.chave, { estoque: e.target.value })}
                  />
                  {erroDe("estoque") && <span className={styles.fieldError}>{erroDe("estoque")}</span>}
                </div>
                <div className={styles.field}>
                  <label htmlFor={`var-shopee-${variacao.chave}`}>Preço cheio Shopee (R$)</label>
                  <input
                    id={`var-shopee-${variacao.chave}`}
                    inputMode="decimal"
                    placeholder="opcional"
                    value={variacao.shopeeReais}
                    onChange={(e) => alterar(variacao.chave, { shopeeReais: e.target.value })}
                  />
                  {erroDe("precosCanais.shopee") && <span className={styles.fieldError}>{erroDe("precosCanais.shopee")}</span>}
                </div>
                <div className={styles.field}>
                  <label htmlFor={`var-ml-${variacao.chave}`}>Preço Mercado Livre (R$)</label>
                  <input
                    id={`var-ml-${variacao.chave}`}
                    inputMode="decimal"
                    placeholder="opcional"
                    value={variacao.mercadoLivreReais}
                    onChange={(e) => alterar(variacao.chave, { mercadoLivreReais: e.target.value })}
                  />
                  {erroDe("precosCanais.mercadoLivre") && (
                    <span className={styles.fieldError}>{erroDe("precosCanais.mercadoLivre")}</span>
                  )}
                </div>
              </div>

              {fotos.length > 0 && (
                <fieldset className={v.fotos}>
                  <legend>Foto da variação</legend>
                  {fotos.map((foto, indice) => (
                    <label key={foto} className={variacao.foto === foto ? v.fotoEscolhida : v.foto}>
                      <input
                        type="radio"
                        name={`var-foto-${variacao.chave}`}
                        className={v.srOnly}
                        checked={variacao.foto === foto}
                        onChange={() => alterar(variacao.chave, { foto })}
                      />
                      <ImagemOtimizada src={foto} alt={`Foto ${indice + 1}`} sizes="64px" width={64} height={64} />
                    </label>
                  ))}
                </fieldset>
              )}

              <div className={v.resumo}>
                <span>
                  Custo <strong>{formatarPreco(custo.custoCentavos)}</strong>
                  {custo.incompleto && " (incompleto: há peça sem custo)"}
                </span>
                {variacao.pecas.length > 0 && (
                  <span title="Soma do peso das peças × quantidade. Para o frete, some a caixa e a proteção.">
                    Peso das peças <strong>{formatarPeso(peso.gramas)}</strong>
                    {peso.incompleto && " (incompleto: há peça sem peso)"}
                  </span>
                )}
                {lucro !== null && (
                  <span className={lucro < 0 ? v.negativo : undefined}>
                    No site sobra <strong>{formatarPreco(lucro)}</strong> ({Math.round((lucro / preco) * 1000) / 10}%) após a taxa de{" "}
                    {formatarPreco(taxa)}
                  </span>
                )}
                {variacao.id && salvas.has(variacao.id) ? (
                  <Link href={`/admin/produtos/calculadora?produto=${produtoId}&variacao=${variacao.id}`} className={styles.btnGhost}>
                    Calcular
                  </Link>
                ) : (
                  <span className={styles.mlLinkAviso}>Salve para abrir na calculadora.</span>
                )}
              </div>

              {sugerido && (sugerido.siteCentavos !== null || sugerido.shopee) && (
                <div className={v.sugestao}>
                  <p className={v.sugestaoTitulo}>
                    Preço sugerido{custo.incompleto ? " (há peça sem custo: o preço real é maior)" : ""}
                  </p>
                  <ul className={v.sugestaoCanais}>
                    <li>
                      Site <strong>{sugerido.siteCentavos === null ? "—" : formatarPreco(sugerido.siteCentavos)}</strong>
                    </li>
                    <li>
                      Shopee cheio <strong>{sugerido.shopee ? formatarPreco(sugerido.shopee.cheioCentavos) : "—"}</strong>
                    </li>
                    <li>
                      Mercado Livre{" "}
                      <strong>{sugerido.mercadoLivreCentavos === null ? "—" : formatarPreco(sugerido.mercadoLivreCentavos)}</strong>
                    </li>
                  </ul>
                  {sugerido.shopee && (
                    <p className={v.sugestaoShopee}>
                      Na Shopee: cadastre <strong>{formatarPreco(sugerido.shopee.cheioCentavos)}</strong>, dê{" "}
                      {pontos(sugerido.shopee.descontoPercentual)}% de desconto (− {formatarPreco(sugerido.shopee.descontoCentavos)})
                      {sugerido.shopee.cupomLojaCentavos > 0 && <> + cupom de loja (− {formatarPreco(sugerido.shopee.cupomLojaCentavos)})</>}. O
                      cliente paga <strong>{formatarPreco(sugerido.shopee.pagoCentavos)}</strong> e sobram{" "}
                      <strong>{formatarPreco(sugerido.shopee.lucroCentavos)}</strong> ({pontos(sugerido.shopee.margemPercentual)}%) depois
                      da taxa.
                      {sugerido.shopee.acimaDe80 && " Acima de R$ 79,99 pagos, a Shopee cobra taxa fixa maior (já considerada)."}
                    </p>
                  )}
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() =>
                      alterar(variacao.chave, {
                        ...(sugerido.siteCentavos !== null ? { precoReais: reais(sugerido.siteCentavos) } : {}),
                        ...(sugerido.shopee ? { shopeeReais: reais(sugerido.shopee.cheioCentavos) } : {}),
                        ...(sugerido.mercadoLivreCentavos !== null ? { mercadoLivreReais: reais(sugerido.mercadoLivreCentavos) } : {}),
                      })
                    }
                  >
                    Usar sugestão
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className={v.rodape}>
        <button type="button" className={styles.btnGhost} onClick={() => adicionar()} disabled={variacoes.length >= MAXIMO_VARIACOES}>
          + Adicionar variação
        </button>
        <button type="button" className={styles.btnPrimary} onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar variações"}
        </button>
        {aviso && <span className={styles.formSuccess}>{aviso}</span>}
        {erro && <span className={styles.fieldError}>{erro}</span>}
        {campos.variacoes && <span className={styles.fieldError}>{campos.variacoes}</span>}
      </div>
      <p className={styles.mlLinkAviso}>
        Na Shopee e no Mercado Livre, as variações são cadastradas manualmente no anúncio: os preços acima são só referência.
      </p>
    </section>
  );
}
