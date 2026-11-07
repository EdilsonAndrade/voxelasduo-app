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

/** Produto do catálogo que pode (ou não) ser peça de uma variação. */
export interface PecaCatalogo {
  id: string;
  nome: string;
  /** Custo sem a embalagem da peça — `null` = sem custo cadastrado. */
  custoCentavos: number | null;
  /** Motivo para não poder ser peça — `null` = pode. */
  bloqueio: string | null;
}

interface PecaForm {
  produtoId: string;
  /** Nome guardado na variação — usado se o produto saiu do catálogo. */
  nome: string;
  custoCentavos: number | null;
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
}: {
  produtoId: string;
  fotos: string[];
  variacoesIniciais: VariacaoKit[];
  catalogo: PecaCatalogo[];
  taxaSite: { percentual: number; fixaCentavos: number };
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
        : [...variacao.pecas, { produtoId: id, nome: peca.nome, custoCentavos: peca.custoCentavos, quantidade: "1" }],
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

      {fotos.length === 0 && (
        <p className={styles.mlLinkAviso}>Salve as fotos do produto primeiro para escolher a foto de cada variação.</p>
      )}

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
