"use client";

import { useCallback, useMemo, useState } from "react";
import Toast from "@/components/admin/Toast";
import { resumirItem, resumirPorCanal } from "@/lib/controleVendas/calculo";
import { gerarCsv, gerarXls } from "@/lib/controleVendas/exportar";
import { hojeIso } from "@/lib/controleVendas/formato";
import type { TaxasCanaisConfig } from "@/lib/models/configuracao";
import {
  ROTULO_CANAL_CONTROLE,
  type ItemControleJson,
  type ProducaoControlePayload,
  type VendaControlePayload,
} from "@/lib/models/controleVendas";
import { formatarPreco } from "@/lib/produtos/formato";
import CartaoProduto from "./CartaoProduto";
import styles from "./controleVendas.module.css";

/** Chama a API e devolve o item atualizado; erro vira mensagem com o motivo devolvido pelo servidor. */
async function chamar(url: string, method: string, corpo?: unknown): Promise<ItemControleJson> {
  const resposta = await fetch(url, {
    method,
    headers: corpo ? { "Content-Type": "application/json" } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const json = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const campos = json?.campos ? Object.values(json.campos as Record<string, string>) : [];
    throw new Error([json?.erro ?? `Erro ${resposta.status}.`, ...campos].join(" "));
  }
  return json.item as ItemControleJson;
}

function baixarArquivo(conteudo: string, nome: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ControleVendas({
  itensIniciais,
  taxas,
}: {
  itensIniciais: ItemControleJson[];
  taxas: TaxasCanaisConfig;
}) {
  const [itens, setItens] = useState(itensIniciais);
  const [busca, setBusca] = useState("");
  const [somenteAtivos, setSomenteAtivos] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return itens.filter(
      (item) =>
        (!termo || item.nome.toLocaleLowerCase("pt-BR").includes(termo)) &&
        (!somenteAtivos || termo || item.produzido > 0 || item.vendas.length > 0)
    );
  }, [itens, busca, somenteAtivos]);

  const totais = useMemo(() => {
    const resumos = visiveis.map(resumirItem);
    return {
      produzido: visiveis.reduce((t, i) => t + i.produzido, 0),
      vendidos: resumos.reduce((t, r) => t + r.vendidos, 0),
      receita: resumos.reduce((t, r) => t + r.receitaCentavos, 0),
      lucro: resumos.reduce((t, r) => t + r.lucroCentavos, 0),
      semEstoque: visiveis.filter((i) => i.estoque <= 0).length,
      canais: resumirPorCanal(visiveis),
    };
  }, [visiveis]);

  async function executar(acao: () => Promise<ItemControleJson>, mensagem: string): Promise<boolean> {
    try {
      const atualizado = await acao();
      setItens((atual) => atual.map((i) => (i.produtoId === atualizado.produtoId ? atualizado : i)));
      setErro(null);
      setAviso(mensagem);
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
      return false;
    }
  }

  const base = (produtoId: string) => `/api/admin/controle-vendas/${produtoId}`;

  const salvarProducao = (produtoId: string, dados: ProducaoControlePayload) =>
    executar(() => chamar(base(produtoId), "PUT", dados), "Produção salva.");

  const lancarVenda = (produtoId: string, dados: VendaControlePayload) =>
    executar(() => chamar(`${base(produtoId)}/vendas`, "POST", dados), "Venda lançada.");

  const editarVenda = (produtoId: string, vendaId: string, dados: VendaControlePayload) =>
    executar(() => chamar(`${base(produtoId)}/vendas/${vendaId}`, "PATCH", dados), "Venda salva.");

  async function excluirVenda(produtoId: string, vendaId: string) {
    if (!window.confirm("Excluir esta venda? O que ela baixou volta para o estoque do site.")) return;
    await executar(() => chamar(`${base(produtoId)}/vendas/${vendaId}`, "DELETE"), "Venda excluída.");
  }

  const nomeArquivo = `controle-vendas-${hojeIso()}`;

  return (
    <div className={`container ${styles.pagina}`}>
      <header className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>Controle de vendas</h1>
          <p className={styles.subtitulo}>
            Quanto você produziu, para quem vendeu e quanto sobrou de lucro em cada canal.
          </p>
          <p className={styles.dataImpressao}>
            Gerado em {new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
          </p>
        </div>
        <div className={styles.acoesTopo}>
          <button type="button" className={styles.botao} onClick={() => window.print()}>
            Imprimir / salvar PDF
          </button>
          <button
            type="button"
            className={styles.botao}
            onClick={() => baixarArquivo(gerarCsv(visiveis), `${nomeArquivo}.csv`, "text/csv;charset=utf-8")}
          >
            Exportar para Google Planilhas
          </button>
          <button
            type="button"
            className={styles.botao}
            onClick={() => baixarArquivo(gerarXls(visiveis), `${nomeArquivo}.xls`, "application/vnd.ms-excel")}
          >
            Exportar Excel
          </button>
        </div>
      </header>

      <section className={styles.resumo} aria-label="Resumo">
        <dl className={styles.totais}>
          <div>
            <dt>Produzido</dt>
            <dd>{totais.produzido}</dd>
          </div>
          <div>
            <dt>Vendido</dt>
            <dd>{totais.vendidos}</dd>
          </div>
          <div>
            <dt>Faturado</dt>
            <dd>{formatarPreco(totais.receita)}</dd>
          </div>
          <div>
            <dt>Lucro</dt>
            <dd className={totais.lucro < 0 ? styles.prejuizo : styles.lucro}>{formatarPreco(totais.lucro)}</dd>
          </div>
          {totais.semEstoque > 0 && (
            <div className={styles.totalAlerta}>
              <dt>Sem estoque no site</dt>
              <dd>{totais.semEstoque}</dd>
            </div>
          )}
        </dl>

        {totais.canais.length > 0 && (
          <table className={styles.tabelaCanais}>
            <thead>
              <tr>
                <th>Canal</th>
                <th>Peças</th>
                <th>Faturado</th>
                <th>Taxas</th>
                <th>Custo + extras</th>
                <th>Lucro</th>
              </tr>
            </thead>
            <tbody>
              {totais.canais.map((c) => (
                <tr key={c.canal}>
                  <td>{ROTULO_CANAL_CONTROLE[c.canal]}</td>
                  <td className={styles.numero}>{c.vendidos}</td>
                  <td className={styles.numero}>{formatarPreco(c.receitaCentavos)}</td>
                  <td className={styles.numero}>{formatarPreco(c.taxasCentavos)}</td>
                  <td className={styles.numero}>{formatarPreco(c.custoCentavos)}</td>
                  <td className={`${styles.numero} ${c.lucroCentavos < 0 ? styles.prejuizo : styles.lucro}`}>
                    {formatarPreco(c.lucroCentavos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className={styles.filtros}>
        <input
          type="search"
          className={styles.busca}
          placeholder="Buscar produto"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar produto"
        />
        <label className={styles.filtroAtivos}>
          <input type="checkbox" checked={somenteAtivos} onChange={(e) => setSomenteAtivos(e.target.checked)} />
          Só produtos com produção ou venda
        </label>
      </div>

      {erro && (
        <p className={styles.erro} role="alert">
          {erro}
        </p>
      )}

      {visiveis.length === 0 ? (
        <p className={styles.vazio}>
          {somenteAtivos && !busca
            ? "Nenhum produto com produção lançada. Desmarque o filtro acima para lançar a primeira."
            : "Nenhum produto com esse nome."}
        </p>
      ) : (
        <div className={styles.lista}>
          {visiveis.map((item) => (
            <CartaoProduto
              key={item.produtoId}
              item={item}
              taxas={taxas}
              aoSalvarProducao={(dados) => salvarProducao(item.produtoId, dados)}
              aoLancarVenda={(dados) => lancarVenda(item.produtoId, dados)}
              aoEditarVenda={(vendaId, dados) => editarVenda(item.produtoId, vendaId, dados)}
              aoExcluirVenda={(vendaId) => excluirVenda(item.produtoId, vendaId)}
            />
          ))}
        </div>
      )}

      <Toast mensagem={aviso} aoFechar={fecharAviso} />
    </div>
  );
}
