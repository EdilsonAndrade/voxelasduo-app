"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SelectBusca from "@/components/admin/SelectBusca";
import styles from "@/components/admin/admin.module.css";
import { percentualDesconto, precoComDesconto } from "@/lib/linksPagamento/regras";
import { VALIDADE_PADRAO_DIAS } from "@/lib/models/linkPagamento";
import { formatarPreco } from "@/lib/produtos/formato";
import { centavosParaTexto, textoParaCentavos } from "@/lib/produtos/precoLista";
import { textoWhatsApp, urlDoLink } from "./compartilhar";
import l from "./linksPagamento.module.css";

/** Produto (ou variação de kit) que pode entrar no link. */
export interface OpcaoCatalogoLink {
  /** `${produtoId}:${variacaoId ?? ""}` */
  valor: string;
  produtoId: string;
  variacaoId?: string;
  nome: string;
  precoCentavos: number;
  estoque: number;
  /** Custo de produção da unidade — `null` = sem custo cadastrado. */
  custoCentavos: number | null;
}

interface Linha {
  uid: number;
  valor: string;
  quantidade: string;
  preco: string;
  desconto: string;
}

interface LinkCriado {
  codigo: string;
  totalCentavos: number;
}

let proximoUid = 1;
const novaLinha = (): Linha => ({ uid: proximoUid++, valor: "", quantidade: "1", preco: "", desconto: "" });

function numero(texto: string): number {
  return Number(texto.replace(",", ".").trim());
}

export default function EditorLinkPagamento({
  catalogo,
  taxaSite,
}: {
  catalogo: OpcaoCatalogoLink[];
  taxaSite: { percentual: number; fixaCentavos: number };
}) {
  const porValor = useMemo(() => new Map(catalogo.map((o) => [o.valor, o])), [catalogo]);
  const opcoes = useMemo(
    () =>
      catalogo.map((o) => ({
        valor: o.valor,
        rotulo: `${o.nome} · ${formatarPreco(o.precoCentavos)}${o.estoque <= 0 ? " (sem estoque)" : ""}`,
      })),
    [catalogo]
  );

  const [linhas, setLinhas] = useState<Linha[]>([novaLinha()]);
  const [clienteNome, setClienteNome] = useState("");
  const [observacao, setObservacao] = useState("");
  const [validadeDias, setValidadeDias] = useState(String(VALIDADE_PADRAO_DIAS));
  const [freteGratis, setFreteGratis] = useState(false);
  const [descontoGeral, setDescontoGeral] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [criado, setCriado] = useState<LinkCriado | null>(null);
  const [copiado, setCopiado] = useState(false);

  function alterar(uid: number, mudanca: Partial<Linha>) {
    setLinhas((atuais) => atuais.map((linha) => (linha.uid === uid ? { ...linha, ...mudanca } : linha)));
  }

  function escolher(uid: number, valor: string) {
    const opcao = porValor.get(valor);
    alterar(uid, { valor, preco: opcao ? centavosParaTexto(opcao.precoCentavos) : "", desconto: "" });
  }

  function mudarDesconto(linha: Linha, texto: string) {
    const opcao = porValor.get(linha.valor);
    const percentual = numero(texto);
    alterar(linha.uid, {
      desconto: texto,
      ...(opcao && texto.trim() !== "" && Number.isFinite(percentual)
        ? { preco: centavosParaTexto(precoComDesconto(opcao.precoCentavos, percentual)) }
        : {}),
    });
  }

  function mudarPreco(linha: Linha, texto: string) {
    const opcao = porValor.get(linha.valor);
    const centavos = textoParaCentavos(texto);
    alterar(linha.uid, {
      preco: texto,
      desconto:
        opcao && centavos !== null && Number.isFinite(centavos)
          ? String(percentualDesconto(opcao.precoCentavos, centavos)).replace(".", ",")
          : "",
    });
  }

  function aplicarDescontoGeral() {
    const percentual = numero(descontoGeral);
    if (!Number.isFinite(percentual)) return;
    setLinhas((atuais) =>
      atuais.map((linha) => {
        const opcao = porValor.get(linha.valor);
        return opcao
          ? { ...linha, desconto: descontoGeral, preco: centavosParaTexto(precoComDesconto(opcao.precoCentavos, percentual)) }
          : linha;
      })
    );
  }

  const calculo = useMemo(() => {
    let original = 0;
    let total = 0;
    let custo = 0;
    let custoIncompleto = false;
    for (const linha of linhas) {
      const opcao = porValor.get(linha.valor);
      const quantidade = Math.trunc(numero(linha.quantidade));
      const preco = textoParaCentavos(linha.preco);
      if (!opcao || !(quantidade > 0) || preco === null || !Number.isFinite(preco)) continue;
      original += opcao.precoCentavos * quantidade;
      total += preco * quantidade;
      if (opcao.custoCentavos === null) custoIncompleto = true;
      else custo += opcao.custoCentavos * quantidade;
    }
    const taxa = total > 0 ? Math.round((total * taxaSite.percentual) / 100) + taxaSite.fixaCentavos : 0;
    const lucro = total - taxa - custo;
    return { original, total, desconto: Math.max(0, original - total), custo, custoIncompleto, taxa, lucro };
  }, [linhas, porValor, taxaSite]);

  async function gerar() {
    if (enviando) return;
    setEnviando(true);
    setErros({});
    setErroGeral(null);
    const itens = linhas
      .filter((linha) => linha.valor)
      .map((linha) => {
        const opcao = porValor.get(linha.valor)!;
        return {
          produtoId: opcao.produtoId,
          ...(opcao.variacaoId ? { variacaoId: opcao.variacaoId } : {}),
          quantidade: Math.trunc(numero(linha.quantidade)),
          precoCentavos: textoParaCentavos(linha.preco) ?? 0,
        };
      });
    try {
      const resposta = await fetch("/api/admin/links-pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteNome,
          observacao,
          validadeDias: Math.trunc(numero(validadeDias)),
          freteGratis,
          itens,
        }),
      });
      const dados = (await resposta.json().catch(() => ({}))) as {
        erro?: string;
        campos?: Record<string, string>;
        link?: { codigo: string; totais: { totalCentavos: number } };
      };
      if (!resposta.ok || !dados.link) {
        setErros(dados.campos ?? {});
        setErroGeral(`${dados.erro ?? "Não foi possível gerar o link."} (status ${resposta.status})`);
        return;
      }
      setCriado({ codigo: dados.link.codigo, totalCentavos: dados.link.totais.totalCentavos });
    } catch {
      setErroGeral("Não foi possível gerar o link. Verifique sua conexão.");
    } finally {
      setEnviando(false);
    }
  }

  // Erros chegam pelo índice dos itens enviados (só as linhas com produto).
  const indiceEnviado = new Map<number, number>();
  linhas.filter((linha) => linha.valor).forEach((linha, indice) => indiceEnviado.set(linha.uid, indice));
  function erroDaLinha(uid: number): string | null {
    const indice = indiceEnviado.get(uid);
    if (indice === undefined) return null;
    const campos = ["produtoId", "variacaoId", "quantidade", "precoCentavos"];
    for (const campo of campos) {
      const mensagem = erros[`itens[${indice}].${campo}`];
      if (mensagem) return mensagem;
    }
    return null;
  }

  if (criado) {
    const url = urlDoLink(window.location.origin, criado.codigo);
    return (
      <div className={l.pronto}>
        <p className={l.prontoTitulo}>Link gerado · {formatarPreco(criado.totalCentavos)} em produtos</p>
        <div className={l.url}>
          <input readOnly value={url} aria-label="Link de pagamento" onFocus={(e) => e.currentTarget.select()} />
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={async () => {
              await navigator.clipboard.writeText(url).catch(() => undefined);
              setCopiado(true);
            }}
          >
            {copiado ? "Copiado" : "Copiar link"}
          </button>
        </div>
        <div className={l.acoes}>
          <a
            className={styles.btnGhost}
            href={`https://wa.me/?text=${encodeURIComponent(textoWhatsApp(url, clienteNome))}`}
            target="_blank"
            rel="noreferrer"
          >
            Enviar pelo WhatsApp
          </a>
          <a className={styles.btnGhost} href={url} target="_blank" rel="noreferrer">
            Abrir como o cliente vê
          </a>
          <Link className={styles.btnGhost} href="/admin/links-pagamento">
            Ver todos os links
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={l.editor}>
      <section className={l.bloco}>
        <h2 className={l.blocoTitulo}>Itens</h2>
        <ul className={l.linhas}>
          {linhas.map((linha) => {
            const opcao = porValor.get(linha.valor);
            const quantidade = Math.trunc(numero(linha.quantidade));
            const erro = erroDaLinha(linha.uid);
            return (
              <li key={linha.uid} className={l.linha}>
                <div className={l.linhaProduto}>
                  <SelectBusca
                    opcoes={opcoes}
                    valor={linha.valor}
                    onChange={(valor) => escolher(linha.uid, valor)}
                    placeholder="Escolha o produto ou kit"
                    rotuloAcessivel="Produto"
                  />
                  {opcao && (
                    <span className={l.dica}>
                      Site {formatarPreco(opcao.precoCentavos)} · estoque {opcao.estoque}
                      {quantidade > opcao.estoque ? " · quantidade maior que o estoque" : ""}
                    </span>
                  )}
                </div>
                <label className={l.campoCurto}>
                  <span>Qtd.</span>
                  <input
                    inputMode="numeric"
                    value={linha.quantidade}
                    onChange={(e) => alterar(linha.uid, { quantidade: e.target.value })}
                  />
                </label>
                <label className={l.campoCurto}>
                  <span>Desconto %</span>
                  <input
                    inputMode="decimal"
                    value={linha.desconto}
                    placeholder="0"
                    disabled={!opcao}
                    onChange={(e) => mudarDesconto(linha, e.target.value)}
                  />
                </label>
                <label className={l.campoPreco}>
                  <span>Preço un. (R$)</span>
                  <input
                    inputMode="decimal"
                    value={linha.preco}
                    disabled={!opcao}
                    onChange={(e) => mudarPreco(linha, e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className={l.remover}
                  aria-label="Remover item"
                  onClick={() =>
                    setLinhas((atuais) => (atuais.length > 1 ? atuais.filter((x) => x.uid !== linha.uid) : [novaLinha()]))
                  }
                >
                  ×
                </button>
                {erro && <p className={`${styles.fieldError} ${l.linhaErro}`}>{erro}</p>}
              </li>
            );
          })}
        </ul>
        {erros.itens && <p className={styles.fieldError}>{erros.itens}</p>}
        <div className={l.acoes}>
          <button type="button" className={styles.btnGhost} onClick={() => setLinhas((a) => [...a, novaLinha()])}>
            + Adicionar item
          </button>
          <label className={l.descontoGeral}>
            <span>Desconto em todos (%)</span>
            <input inputMode="decimal" value={descontoGeral} onChange={(e) => setDescontoGeral(e.target.value)} />
          </label>
          <button type="button" className={styles.btnGhost} onClick={aplicarDescontoGeral}>
            Aplicar
          </button>
        </div>
      </section>

      <section className={l.bloco}>
        <h2 className={l.blocoTitulo}>Cliente e entrega</h2>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="link-cliente">Nome do cliente (opcional)</label>
            <input id="link-cliente" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} />
            {erros.clienteNome && <p className={styles.fieldError}>{erros.clienteNome}</p>}
          </div>
          <div className={styles.field}>
            <label htmlFor="link-validade">Validade (dias)</label>
            <input
              id="link-validade"
              inputMode="numeric"
              value={validadeDias}
              onChange={(e) => setValidadeDias(e.target.value)}
            />
            {erros.validadeDias && <p className={styles.fieldError}>{erros.validadeDias}</p>}
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="link-recado">Recado para o cliente (opcional)</label>
          <input
            id="link-recado"
            value={observacao}
            placeholder="Ex.: obrigado pela compra! Separei com 15% de desconto."
            onChange={(e) => setObservacao(e.target.value)}
          />
          {erros.observacao && <p className={styles.fieldError}>{erros.observacao}</p>}
        </div>
        <label className={l.checkbox}>
          <input type="checkbox" checked={freteGratis} onChange={(e) => setFreteGratis(e.target.checked)} />
          Frete grátis neste link (PAC e SEDEX saem por R$ 0,00)
        </label>
        <p className={l.dica}>Sem frete grátis, o cliente escolhe PAC, SEDEX ou combinar/retirar, com os valores de hoje do site.</p>
      </section>

      <section className={l.resumo} aria-live="polite">
        <div className={l.resumoLinha}>
          <span>Preço de site</span>
          <span>{formatarPreco(calculo.original)}</span>
        </div>
        <div className={l.resumoLinha}>
          <span>Desconto</span>
          <span>− {formatarPreco(calculo.desconto)}</span>
        </div>
        <div className={`${l.resumoLinha} ${l.resumoTotal}`}>
          <span>Cliente paga (sem frete)</span>
          <span>{formatarPreco(calculo.total)}</span>
        </div>
        <div className={l.resumoLinha}>
          <span>Taxa do site ({String(taxaSite.percentual).replace(".", ",")}%)</span>
          <span>− {formatarPreco(calculo.taxa)}</span>
        </div>
        <div className={l.resumoLinha}>
          <span>Custo de produção{calculo.custoIncompleto ? " (há item sem custo)" : ""}</span>
          <span>− {formatarPreco(calculo.custo)}</span>
        </div>
        <div className={`${l.resumoLinha} ${calculo.lucro < 0 ? l.prejuizo : l.lucro}`}>
          <span>Sobra para você</span>
          <span>
            {formatarPreco(calculo.lucro)}
            {calculo.total > 0 ? ` (${Math.round((calculo.lucro / calculo.total) * 1000) / 10}%)` : ""}
          </span>
        </div>
        {erroGeral && (
          <p className={styles.formError} role="alert">
            {erroGeral}
          </p>
        )}
        <button type="button" className={styles.btnPrimary} onClick={gerar} disabled={enviando}>
          {enviando ? "Gerando…" : "Gerar link de pagamento"}
        </button>
      </section>
    </div>
  );
}
