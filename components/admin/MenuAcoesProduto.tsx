"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./listaProdutos.module.css";

export interface CarrosselOpcao {
  id: string;
  titulo: string;
}

/** Altura máxima do painel — acima disso ele abre para cima, para não sair da tela. */
const ALTURA_PAINEL = 340;

/**
 * Menu ☰ de cada linha da lista de produtos: salvar a linha, editar,
 * duplicar e ligar/desligar o produto nos carrosséis da home (FR-009).
 * Substitui os botões soltos, que estouravam a largura da tabela.
 */
export default function MenuAcoesProduto({
  produtoId,
  produtoNome,
  carrosseis,
  marcadosIniciais,
  podeSalvar,
  salvando,
  onSalvar,
}: {
  produtoId: string;
  produtoNome: string;
  carrosseis: CarrosselOpcao[];
  marcadosIniciais: string[];
  podeSalvar: boolean;
  salvando: boolean;
  onSalvar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [marcados, setMarcados] = useState(() => new Set(marcadosIniciais));
  const [pendente, setPendente] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const raizRef = useRef<HTMLDivElement>(null);
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  // Posição fixa na tela: a tabela rola e cortaria um painel absoluto.
  const [posicao, setPosicao] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  function abrirOuFechar() {
    if (aberto) {
      setAberto(false);
      return;
    }
    const rect = gatilhoRef.current?.getBoundingClientRect();
    if (rect) {
      const right = Math.max(8, window.innerWidth - rect.right);
      const cabeEmbaixo = rect.bottom + 6 + ALTURA_PAINEL <= window.innerHeight;
      setPosicao(
        cabeEmbaixo ? { top: rect.bottom + 6, right } : { bottom: window.innerHeight - rect.top + 6, right }
      );
    }
    setAberto(true);
  }

  useEffect(() => {
    if (!aberto) return;
    function fora(evento: MouseEvent) {
      if (!raizRef.current?.contains(evento.target as Node)) setAberto(false);
    }
    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }
    // Rolar a página/tabela deslocaria o painel fixo — fecha.
    function rolagem(evento: Event) {
      if (!raizRef.current?.contains(evento.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    window.addEventListener("scroll", rolagem, true);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
      window.removeEventListener("scroll", rolagem, true);
    };
  }, [aberto]);

  async function alternarCarrossel(carrosselId: string) {
    const marcar = !marcados.has(carrosselId);
    setPendente(carrosselId);
    setErro(null);

    const resposta = await fetch(`/api/admin/home/secoes/${carrosselId}/produtos/${produtoId}`, {
      method: marcar ? "POST" : "DELETE",
    }).catch(() => null);
    setPendente(null);

    if (!resposta?.ok) {
      const corpo = resposta ? await resposta.json().catch(() => ({})) : {};
      setErro(resposta ? (corpo.erro ?? `Erro ${resposta.status}.`) : "Sem conexão. Tente de novo.");
      return;
    }

    setMarcados((atuais) => {
      const novos = new Set(atuais);
      if (marcar) novos.add(carrosselId);
      else novos.delete(carrosselId);
      return novos;
    });
  }

  const emDestaque = marcados.size;

  return (
    <div className={styles.menuAcoes} ref={raizRef}>
      <button
        ref={gatilhoRef}
        type="button"
        className={`${styles.menuGatilho} ${podeSalvar ? styles.menuGatilhoPendente : ""}`}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={`Ações de ${produtoNome}`}
        title={podeSalvar ? "Alterações não salvas — abra para salvar" : "Ações"}
        onClick={abrirOuFechar}
      >
        <span aria-hidden="true">☰</span>
        {emDestaque > 0 && (
          <span className={styles.menuDestaque} title={`Em ${emDestaque} carrossel(is) da home`}>
            ★{emDestaque}
          </span>
        )}
      </button>

      {aberto && (
        <div
          role="menu"
          className={styles.menuPainel}
          style={posicao ? { position: "fixed", ...posicao } : undefined}
        >
          <button
            type="button"
            role="menuitem"
            className={`${styles.menuItem} ${styles.menuItemSalvar}`}
            disabled={!podeSalvar || salvando}
            onClick={() => {
              setAberto(false);
              onSalvar();
            }}
          >
            {salvando ? "Salvando…" : podeSalvar ? "Salvar alterações" : "Nada para salvar"}
          </button>
          <Link href={`/admin/produtos/${produtoId}/editar`} role="menuitem" className={styles.menuItem}>
            Editar
          </Link>
          <Link
            href={`/admin/produtos/novo?duplicarDe=${produtoId}`}
            role="menuitem"
            className={styles.menuItem}
            title="Cria um novo produto com os mesmos dados e preços (sem fotos, estoque e anúncios)"
          >
            Duplicar
          </Link>

          <p className={styles.menuSecao}>Destaques na home</p>
          {carrosseis.length === 0 ? (
            <p className={styles.menuVazio}>
              Nenhum carrossel criado. <Link href="/admin/banners/nova">Criar carrossel</Link>
            </p>
          ) : (
            carrosseis.map((carrossel) => (
              <label key={carrossel.id} className={styles.menuItem}>
                <input
                  type="checkbox"
                  className={styles.caixa}
                  checked={marcados.has(carrossel.id)}
                  disabled={pendente !== null}
                  onChange={() => void alternarCarrossel(carrossel.id)}
                />
                {carrossel.titulo}
              </label>
            ))
          )}
          {erro && <p className={styles.menuErro}>{erro}</p>}
        </div>
      )}
    </div>
  );
}
