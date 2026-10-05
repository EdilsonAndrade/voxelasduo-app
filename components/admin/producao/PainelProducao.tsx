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
  totalNaOrigem?: number | null;
  miniaturasCopiadas?: number | null;
  erro?: string | null;
}

const FILTROS_INICIAIS: Filtros = { resultado: "", vinculo: "", produtoId: "" };

interface Impressora {
  id: string;
  nome: string;
  modelo?: string;
  online: boolean;
}

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
    userId: null,
    nomeUsuario: null,
  });
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  // Partes já nomeadas por produto: alimentam a lista do campo "Parte" (FR-013).
  const [partesPorProduto, setPartesPorProduto] = useState<Record<string, string[]>>({});
  const [impressoes, setImpressoes] = useState<ImpressaoLista[]>([]);
  const [total, setTotal] = useState(0);
  const [apuracao, setApuracao] = useState<ProdutoApurado[]>([]);
  const [resumo, setResumo] = useState<ResumoProducao>({
    gramasPerdidosEmFalhas: 0,
    valorPerdidoEmFalhasCentavos: 0,
    impressoesSemVinculo: 0,
  });
  const [ultimaImportacao, setUltimaImportacao] = useState<Importacao | null>(null);
  const [impressoras, setImpressoras] = useState<Impressora[]>([]);
  const [impressoraEscolhida, setImpressoraEscolhida] = useState("");
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
      const [rConexao, rPendentes, rImpressoes, rApuracao, rImportacoes, rVinculos] =
        await Promise.all([
          fetch("/api/producao/conexao"),
          fetch("/api/producao/pendentes"),
          fetch(`/api/producao/impressoes?${query.toString()}`),
          fetch("/api/producao/apuracao"),
          fetch("/api/producao/importacoes?limite=1"),
          fetch("/api/producao/vinculos"),
        ]);

      const falhou = [rConexao, rPendentes, rImpressoes, rApuracao, rImportacoes, rVinculos].find(
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

      const { vinculos } = (await rVinculos.json()) as {
        vinculos: { produtoId: string; parte: string }[];
      };
      const partes: Record<string, string[]> = {};
      for (const vinculo of vinculos) {
        const lista = (partes[vinculo.produtoId] ??= []);
        if (!lista.includes(vinculo.parte)) lista.push(vinculo.parte);
      }
      setPartesPorProduto(partes);

      // As impressoras vêm da nuvem e só existem com conexão ativa: a falha
      // aqui não impede o resto da tela de funcionar.
      const rImpressoras = await fetch("/api/producao/impressoras");
      setImpressoras(rImpressoras.ok ? (await rImpressoras.json()).impressoras : []);
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
      const resposta = await fetch("/api/producao/importar-agora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: impressoraEscolhida || undefined }),
      });
      const dados = await resposta.json().catch(() => ({}) as Record<string, string>);

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
          {/*
            Mostrado a partir de uma impressora, não de duas: com uma só, o
            seletor é a prova visível de que o vínculo com a conta existe.
          */}
          {impressoras.length > 0 && (
            <label className={styles.campo}>
              <span className={styles.rotulo}>
                Impressora ({impressoras.length} na conta)
              </span>
              <select
                className={styles.entrada}
                value={impressoraEscolhida}
                onChange={(e) => setImpressoraEscolhida(e.target.value)}
              >
                <option value="">todas as impressoras da conta</option>
                {impressoras.map((impressora) => (
                  <option key={impressora.id} value={impressora.id}>
                    {impressora.nome}
                    {impressora.modelo ? ` (${impressora.modelo})` : ""}
                    {impressora.online ? "" : " · offline"}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            type="button"
            className={styles.botao}
            onClick={importarAgora}
            disabled={importando || conexao.estado !== "ativa"}
          >
            {importando ? "Importando…" : "Importar agora"}
          </button>

          {conexao.estado === "ativa" && impressoras.length === 0 && (
            <span className={styles.pendenteDados}>
              Nenhuma impressora vinculada a esta conta
            </span>
          )}

          {ultimaImportacao && (
            <span className={styles.pendenteDados}>
              Última importação{" "}
              {ultimaImportacao.origem === "automatica" ? "automática" : "manual"} em{" "}
              {new Date(ultimaImportacao.iniciadoEm).toLocaleString("pt-BR")}:{" "}
              {ultimaImportacao.novas} novas, {ultimaImportacao.ignoradas} já conhecidas
              {typeof ultimaImportacao.totalNaOrigem === "number" &&
                ` · a Bambu Lab informa ${ultimaImportacao.totalNaOrigem} no histórico da conta`}
              {typeof ultimaImportacao.miniaturasCopiadas === "number" &&
                ultimaImportacao.miniaturasCopiadas > 0 &&
                ` · ${ultimaImportacao.miniaturasCopiadas} ${
                  ultimaImportacao.miniaturasCopiadas === 1 ? "foto salva" : "fotos salvas"
                }`}
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
        {ultimaImportacao && !ultimaImportacao.erro && ultimaImportacao.totalNaOrigem === 0 && (
          <p className={styles.ok}>
            {impressoras.length === 0 ? (
              <>
                Nenhuma impressora vinculada a esta conta na nuvem. Se a sua A1 está em
                LAN-only mode, o Bambu Studio fala com ela direto pela rede e nada chega aos
                servidores da Bambu — por isso não há histórico para importar. Vincule a
                impressora à conta para que as próximas impressões sejam registradas.
              </>
            ) : (
              <>
                A conta tem {impressoras.length}{" "}
                {impressoras.length === 1 ? "impressora vinculada" : "impressoras vinculadas"},
                mas nenhuma impressão no histórico da nuvem. Só é registrado o que você manda
                imprimir pela nuvem — trabalho iniciado do cartão SD ou em LAN não aparece lá.
              </>
            )}
          </p>
        )}
        {erro && <p className={styles.erro}>{erro}</p>}
      </div>

      <MapearArquivo
        pendentes={pendentes}
        produtos={produtos}
        partesPorProduto={partesPorProduto}
        onMapeado={carregar}
      />

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
