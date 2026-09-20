"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./admin.module.css";
import type { CategoriaML } from "@/lib/estoque/canais/mercadoLivre/catalogoCategorias";

const ATRASO_BUSCA_MS = 350;
const TAMANHO_MINIMO_BUSCA = 2;

interface Props {
  /** Categoria (folha) escolhida — vazio = o Mercado Livre decide pelo título do produto. */
  categoriaId: string;
  /** Caminho legível da categoria escolhida, para exibir sem nova consulta. */
  caminho: string;
  onChange: (categoriaId: string, caminho: string) => void;
}

type Passo = { id: string; nome: string };

async function consultar<T>(query: string): Promise<T> {
  const resposta = await fetch(`/api/admin/mercado-livre/categorias${query}`);
  const dados = await resposta.json();
  if (!resposta.ok) {
    throw new Error(dados.erro ?? "Não foi possível consultar as categorias do Mercado Livre.");
  }
  return dados as T;
}

/**
 * Seletor de categoria do Mercado Livre: busca por texto (folhas sugeridas
 * pelo Mercado Livre) ou navegação pela árvore, da raiz até uma categoria
 * folha — a única aceita na publicação. Evita digitar IDs/nomes à mão.
 */
export default function CategoriaMercadoLivreSelect({ categoriaId, caminho, onChange }: Props) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [trilha, setTrilha] = useState<Passo[]>([]);
  const [itens, setItens] = useState<CategoriaML[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const raizRef = useRef<HTMLDivElement>(null);
  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Descarta respostas antigas quando o usuário já pediu outra coisa (busca digitada, clique rápido).
  const requisicaoRef = useRef(0);

  const buscando = termo.trim().length >= TAMANHO_MINIMO_BUSCA;

  useEffect(() => {
    if (!aberto) return;

    function fecharAoClicarFora(evento: MouseEvent) {
      if (raizRef.current && !raizRef.current.contains(evento.target as Node)) setAberto(false);
    }
    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }

    document.addEventListener("mousedown", fecharAoClicarFora);
    document.addEventListener("keydown", fecharComEscape);
    return () => {
      document.removeEventListener("mousedown", fecharAoClicarFora);
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, [aberto]);

  async function carregarNivel(passos: Passo[]) {
    const requisicao = ++requisicaoRef.current;
    setCarregando(true);
    setErro(null);

    try {
      const pai = passos[passos.length - 1];
      const dados = await consultar<{ filhas: CategoriaML[] }>(pai ? `?pai=${pai.id}` : "");
      if (requisicao !== requisicaoRef.current) return;
      setTrilha(passos);
      setItens(dados.filhas);
    } catch (e) {
      if (requisicao !== requisicaoRef.current) return;
      setErro(e instanceof Error ? e.message : "Erro ao consultar as categorias.");
    } finally {
      if (requisicao === requisicaoRef.current) setCarregando(false);
    }
  }

  function abrirOuFechar() {
    if (aberto) {
      setAberto(false);
      return;
    }
    setAberto(true);
    setTermo("");
    void carregarNivel([]);
  }

  function aoDigitar(texto: string) {
    setTermo(texto);
    if (temporizadorRef.current) clearTimeout(temporizadorRef.current);

    if (texto.trim().length < TAMANHO_MINIMO_BUSCA) {
      requisicaoRef.current++;
      setCarregando(false);
      setErro(null);
      void carregarNivel([]);
      return;
    }

    requisicaoRef.current++;
    setItens([]);
    setCarregando(true);
    setErro(null);

    temporizadorRef.current = setTimeout(async () => {
      const requisicao = ++requisicaoRef.current;
      try {
        const dados = await consultar<{ resultados: CategoriaML[] }>(
          `?busca=${encodeURIComponent(texto.trim())}`
        );
        if (requisicao !== requisicaoRef.current) return;
        setItens(dados.resultados);
      } catch (e) {
        if (requisicao !== requisicaoRef.current) return;
        setErro(e instanceof Error ? e.message : "Erro ao buscar categorias.");
      } finally {
        if (requisicao === requisicaoRef.current) setCarregando(false);
      }
    }, ATRASO_BUSCA_MS);
  }

  function selecionar(categoria: CategoriaML, caminhoCompleto: string) {
    onChange(categoria.id, caminhoCompleto);
    setAberto(false);
  }

  /** Abre uma categoria da navegação: se tiver filhas, desce um nível; se for folha, seleciona. */
  async function abrirCategoria(categoria: CategoriaML) {
    const requisicao = ++requisicaoRef.current;
    setCarregando(true);
    setErro(null);

    try {
      const dados = await consultar<{ categoria: CategoriaML; filhas: CategoriaML[] }>(
        `?pai=${categoria.id}`
      );
      if (requisicao !== requisicaoRef.current) return;

      if (dados.filhas.length === 0) {
        selecionar(dados.categoria, dados.categoria.caminho ?? dados.categoria.nome);
        return;
      }

      setTrilha([...trilha, { id: categoria.id, nome: categoria.nome }]);
      setItens(dados.filhas);
    } catch (e) {
      if (requisicao !== requisicaoRef.current) return;
      setErro(e instanceof Error ? e.message : "Erro ao consultar a categoria.");
    } finally {
      if (requisicao === requisicaoRef.current) setCarregando(false);
    }
  }

  return (
    <div className={styles.catSelect} ref={raizRef}>
      <div className={styles.catControles}>
        <button
          type="button"
          id="mercadoLivreCategoria"
          className={styles.catGatilho}
          aria-expanded={aberto}
          aria-haspopup="listbox"
          onClick={abrirOuFechar}
        >
          {categoriaId ? (
            <span className={styles.catEscolhida}>{caminho || categoriaId}</span>
          ) : (
            <span className={styles.catAutomatica}>Automática — o Mercado Livre decide pelo título</span>
          )}
          <span aria-hidden="true">▾</span>
        </button>
        {categoriaId && (
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => onChange("", "")}
          >
            Limpar
          </button>
        )}
      </div>

      {aberto && (
        <div className={styles.catPainel}>
          <input
            type="search"
            className={styles.catBusca}
            placeholder="Buscar categoria (ex: chaveiro, estatueta, vaso)"
            value={termo}
            onChange={(e) => aoDigitar(e.target.value)}
            autoFocus
          />

          {!buscando && trilha.length > 0 && (
            <div className={styles.catTrilha}>
              <button type="button" className={styles.catTrilhaBotao} onClick={() => void carregarNivel([])}>
                Todas
              </button>
              {trilha.map((passo, indice) => (
                <span key={passo.id}>
                  {" › "}
                  <button
                    type="button"
                    className={styles.catTrilhaBotao}
                    onClick={() => void carregarNivel(trilha.slice(0, indice + 1))}
                  >
                    {passo.nome}
                  </button>
                </span>
              ))}
            </div>
          )}

          {erro && <span className={styles.fieldError}>{erro}</span>}
          {carregando && <span className={styles.catVazio}>Carregando…</span>}

          {!carregando && !erro && itens.length === 0 && (
            <span className={styles.catVazio}>
              {buscando ? "Nenhuma categoria encontrada. Tente outro termo." : "Sem categorias."}
            </span>
          )}

          <ul className={styles.catLista} role="listbox">
            {itens.map((categoria) => (
              <li key={categoria.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={categoria.id === categoriaId}
                  className={styles.catItem}
                  onClick={() =>
                    buscando && categoria.folha
                      ? selecionar(categoria, categoria.caminho ?? categoria.nome)
                      : void abrirCategoria(categoria)
                  }
                >
                  <span>{buscando ? (categoria.caminho ?? categoria.nome) : categoria.nome}</span>
                  {!buscando && <span aria-hidden="true">›</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
