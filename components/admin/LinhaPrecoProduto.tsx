"use client";

import { useEffect, useState } from "react";
import type { PrecosCanaisProduto, Produto } from "@/lib/models/produto";
import { formatarPreco } from "@/lib/produtos/formato";
import {
  centavosParaTexto,
  erroPrecoMercadoLivre,
  erroPrecoSite,
  margemPercentual,
  textoParaCentavos,
} from "@/lib/produtos/precoLista";
import styles from "./listaProdutos.module.css";

function Margem({ precoCentavos, custoCentavos }: { precoCentavos: number | null; custoCentavos: number | null }) {
  const margem = margemPercentual(precoCentavos, custoCentavos);
  if (margem === null) return null;
  const classe = margem < 0 ? styles.margemNegativa : margem < 30 ? styles.margemBaixa : styles.margem;
  return (
    <span className={classe} title="Margem sobre o preço: (preço − custo) ÷ preço">
      margem {margem}%
    </span>
  );
}

/**
 * Preço do site e do Mercado Livre editáveis na lista de produtos (EDI-126):
 * cada linha só grava ao clicar em "Salvar" (ou Enter). Usa o mesmo PATCH da
 * tela de edição, que também atualiza o anúncio do Mercado Livre.
 */
export default function LinhaPrecoProduto({
  produtoId,
  produtoNome,
  precoInicial,
  precoMercadoLivreInicial,
  precoShopee,
  custoCentavos,
  onAlteradoChange,
}: {
  produtoId: string;
  produtoNome: string;
  precoInicial: number;
  precoMercadoLivreInicial: number | null;
  /** Reenviado no PATCH: o servidor substitui `precosCanais` inteiro e apagaria a Shopee. */
  precoShopee: number | null;
  custoCentavos: number | null;
  onAlteradoChange: (alterado: boolean) => void;
}) {
  const [original, setOriginal] = useState({ site: precoInicial, mercadoLivre: precoMercadoLivreInicial });
  const [textoSite, setTextoSite] = useState(centavosParaTexto(precoInicial));
  const [textoMercadoLivre, setTextoMercadoLivre] = useState(centavosParaTexto(precoMercadoLivreInicial));
  const [salvando, setSalvando] = useState(false);
  const [status, setStatus] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const site = textoParaCentavos(textoSite);
  const mercadoLivre = textoParaCentavos(textoMercadoLivre);
  const alterado = site !== original.site || mercadoLivre !== original.mercadoLivre;

  useEffect(() => {
    onAlteradoChange(alterado);
  }, [alterado, onAlteradoChange]);

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!alterado || salvando) return;

    const erro = erroPrecoSite(site) ?? erroPrecoMercadoLivre(mercadoLivre);
    if (erro) {
      setStatus({ tipo: "erro", texto: erro });
      return;
    }

    const precosCanais: PrecosCanaisProduto = {};
    if (mercadoLivre !== null) precosCanais.mercadoLivre = mercadoLivre;
    if (precoShopee !== null) precosCanais.shopee = precoShopee;

    setSalvando(true);
    setStatus(null);
    const resposta = await fetch(`/api/produtos/${produtoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preco: site, precosCanais }),
    }).catch(() => null);
    setSalvando(false);

    if (!resposta) {
      setStatus({ tipo: "erro", texto: "Sem conexão. Tente salvar de novo." });
      return;
    }
    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      const campos = corpo.campos ?? {};
      setStatus({
        tipo: "erro",
        texto: campos.preco ?? campos.precosCanais ?? corpo.erro ?? `Erro ${resposta.status}.`,
      });
      return;
    }

    const produto = corpo.produto as Produto | undefined;
    const salvoSite = produto?.preco ?? (site as number);
    const salvoMercadoLivre = produto ? (produto.precosCanais?.mercadoLivre ?? null) : mercadoLivre;
    setOriginal({ site: salvoSite, mercadoLivre: salvoMercadoLivre });
    setTextoSite(centavosParaTexto(salvoSite));
    setTextoMercadoLivre(centavosParaTexto(salvoMercadoLivre));
    setStatus({ tipo: "ok", texto: "Salvo" });
  }

  function editar(setter: (valor: string) => void) {
    return (evento: React.ChangeEvent<HTMLInputElement>) => {
      setter(evento.target.value);
      setStatus(null);
    };
  }

  const precoValidoSite = site !== null && !Number.isNaN(site) ? site : null;
  const precoValidoMercadoLivre = mercadoLivre !== null && !Number.isNaN(mercadoLivre) ? mercadoLivre : null;

  return (
    <form className={styles.precos} onSubmit={salvar} noValidate>
      <label className={styles.campoPreco}>
        <span className={styles.rotuloCampo}>Site</span>
        <span className={styles.entrada}>
          <span aria-hidden="true">R$</span>
          <input
            type="text"
            inputMode="decimal"
            value={textoSite}
            onChange={editar(setTextoSite)}
            aria-label={`Preço do site de ${produtoNome}`}
            disabled={salvando}
          />
        </span>
        <Margem precoCentavos={precoValidoSite} custoCentavos={custoCentavos} />
      </label>

      <label className={styles.campoPreco}>
        <span className={styles.rotuloCampo}>Mercado Livre</span>
        <span className={styles.entrada}>
          <span aria-hidden="true">R$</span>
          <input
            type="text"
            inputMode="decimal"
            value={textoMercadoLivre}
            onChange={editar(setTextoMercadoLivre)}
            placeholder={precoValidoSite !== null ? centavosParaTexto(precoValidoSite) : ""}
            aria-label={`Preço no Mercado Livre de ${produtoNome} (vazio = mesmo do site)`}
            title="Vazio = usa o preço do site"
            disabled={salvando}
          />
        </span>
        {precoValidoMercadoLivre === null ? (
          <span className={styles.dica}>igual ao site</span>
        ) : (
          <Margem precoCentavos={precoValidoMercadoLivre} custoCentavos={custoCentavos} />
        )}
      </label>

      <div className={styles.acaoLinha}>
        <button type="submit" className={styles.btnSalvar} disabled={!alterado || salvando}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        {alterado && !status && !salvando && <span className={styles.seloPendente}>não salvo</span>}
        {status && (
          <span className={status.tipo === "ok" ? styles.statusOk : styles.statusErro} role="status">
            {status.texto}
          </span>
        )}
      </div>
      {alterado && original.site !== site && precoValidoSite !== null && (
        <span className={styles.dica}>antes: {formatarPreco(original.site)}</span>
      )}
    </form>
  );
}
