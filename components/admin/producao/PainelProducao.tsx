"use client";

import { useCallback, useEffect, useState } from "react";
import ApuracaoProdutos, {
  type ProdutoApurado,
  type ResumoProducao,
} from "./ApuracaoProdutos";
import ConexaoBambu, { type ConexaoAtual } from "./ConexaoBambu";
import ListaImpressoes, { type Filtros, type ImpressaoLista } from "./ListaImpressoes";
import MapearArquivo, { type Pendente, type ProdutoOpcao } from "./MapearArquivo";
import styles from "./producao.module.css";

interface Importacao {
  origem: "manual" | "automatica";
  iniciadoEm: string;
  novas: number;
  ignoradas: number;
  erro?: string | null;
}

const FILTROS_INICIAIS: Filtros = { resultado: "", vinculo: "", produtoId: "" };

/**
 * Orquestra a área de produção (EDI-127). Os quatro blocos aparecem na ordem
 * de urgência: estado da conexão, fila de mapeamento (só quando há pendência),
 * custo por produto e, por último, o histórico.
 *
 * Tudo é recarregado junto depois de qualquer ação, porque uma só mudança
 * (mapear um arquivo, lançar estoque) altera mais de um bloco.
 */
export default function PainelProducao({ produtos }: { produtos: ProdutoOpcao[] }) {
  const [conexao, setConexao] = useState<ConexaoAtual>({
    estado: "ausente",
    expiraEm: null,
    ativadoEm: null,
  });
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [impressoes, setImpressoes] = useState<ImpressaoLista[]>([]);
  const [total, setTotal] = useState(0);
  const [apuracao, setApuracao] = useState<ProdutoApurado[]>([]);
  const [resumo, setResumo] = useState<ResumoProducao>({
    gramasPerdidosEmFalhas: 0,
    valorPerdidoEmFalhasCentavos: 0,
    impressoesSemVinculo: 0,
  });
  const [ultimaImportacao, setUltimaImportacao] = useState<Importacao | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [carregando, setCarregando] = useState(true);
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    const query = new URLSearchParams();
    if (filtros.resultado) query.set("resultado", filtros.resultado);
    if (filtros.vinculo) query.set("vinculo", filtros.vinculo);
    if (filtros.produtoId) query.set("produtoId", filtros.produtoId);

    try {
      const [rConexao, rPendentes, rImpressoes, rApuracao, rImportacoes] = await Promise.all([
        fetch("/api/producao/conexao"),
        fetch("/api/producao/pendentes"),
        fetch(`/api/producao/impressoes?${query.toString()}`),
        fetch("/api/producao/apuracao"),
        fetch("/api/producao/importacoes?limite=1"),
      ]);

      const falhou = [rConexao, rPendentes, rImpressoes, rApuracao, rImportacoes].find(
        (r) => !r.ok
      );
      if (falhou) {
        const dados = await falhou.json().catch(() => ({}));
        setErro(dados.erro ?? `Falha ao carregar a produção (HTTP ${falhou.status}).`);
        return;
      }

      setConexao(await rConexao.json());
      setPendentes((await rPendentes.json()).pendentes);

      const listagem = await rImpressoes.json();
      setImpressoes(listagem.impressoes);
      setTotal(listagem.total);

      const apurado = await rApuracao.json();
      setApuracao(apurado.produtos);
      setResumo(apurado.resumo);

      setUltimaImportacao((await rImportacoes.json()).importacoes[0] ?? null);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de rede ao carregar a produção.");
    } finally {
      setCarregando(false);
    }
  }, [filtros]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function importarAgora() {
    setImportando(true);
    setErro(null);

    try {
      const resposta = await fetch("/api/producao/importar-agora", { method: "POST" });
      const dados = await resposta.json();

      if (!resposta.ok) {
        // Status real da origem (401 de token vencido, 502 de falha deles).
        setErro(dados.erro ?? `Falha na importação (HTTP ${resposta.status}).`);
      }
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de rede na importação.");
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className={`container ${styles.pagina}`}>
      <div>
        <h1 className={styles.tituloBloco}>Produção</h1>
        <p className={styles.subtituloBloco}>
          O que a impressora já produziu, quanto custou de verdade e o que dá para lançar no
          estoque.
        </p>
      </div>

      <ConexaoBambu conexao={conexao} onAlterada={carregar} />

      <div className={styles.bloco}>
        <div className={styles.acoesProduto} style={{ marginTop: 0 }}>
          <button
            type="button"
            className={styles.botao}
            onClick={importarAgora}
            disabled={importando || conexao.estado !== "ativa"}
          >
            {importando ? "Importando…" : "Importar agora"}
          </button>

          {ultimaImportacao && (
            <span className={styles.pendenteDados}>
              Última importação{" "}
              {ultimaImportacao.origem === "automatica" ? "automática" : "manual"} em{" "}
              {new Date(ultimaImportacao.iniciadoEm).toLocaleString("pt-BR")}:{" "}
              {ultimaImportacao.novas} novas, {ultimaImportacao.ignoradas} já conhecidas
            </span>
          )}
        </div>

        {conexao.estado === "expirada" && (
          <p className={styles.erro}>
            O acesso à Bambu Lab venceu. Reconecte a conta para voltar a importar.
          </p>
        )}
        {ultimaImportacao?.erro && (
          <p className={styles.erro}>Última importação falhou: {ultimaImportacao.erro}</p>
        )}
        {erro && <p className={styles.erro}>{erro}</p>}
      </div>

      <MapearArquivo pendentes={pendentes} produtos={produtos} onMapeado={carregar} />

      <ApuracaoProdutos produtos={apuracao} resumo={resumo} onAlterado={carregar} />

      <ListaImpressoes
        impressoes={impressoes}
        total={total}
        produtos={produtos}
        filtros={filtros}
        onFiltros={setFiltros}
        onLancado={carregar}
      />

      {carregando && <p className={styles.vazio}>Carregando…</p>}
    </div>
  );
}
