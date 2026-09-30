"use client";

import { useCallback, useState } from "react";
import ConfirmModal from "@/components/admin/ConfirmModal";
import Toast from "@/components/admin/Toast";
import type { CategoriaAdmin } from "@/lib/categorias/repository";
import { gerarSlug } from "@/lib/produtos/slug";
import adminStyles from "./admin.module.css";
import styles from "./categorias.module.css";

async function mensagemErro(resposta: Response): Promise<string> {
  const corpo = await resposta.json().catch(() => ({}));
  const primeiroCampo = corpo.campos ? Object.values(corpo.campos)[0] : undefined;
  return (primeiroCampo as string | undefined) ?? corpo.erro ?? `Erro ${resposta.status}.`;
}

function rotuloProdutos(total: number): string {
  if (total === 0) return "nenhum produto";
  return total === 1 ? "1 produto" : `${total} produtos`;
}

export default function CategoriasLista({ categoriasIniciais }: { categoriasIniciais: CategoriaAdmin[] }) {
  const [categorias, setCategorias] = useState(categoriasIniciais);
  const [novoNome, setNovoNome] = useState("");
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEditado, setNomeEditado] = useState("");
  const [removendo, setRemovendo] = useState<CategoriaAdmin | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fecharToast = useCallback(() => setToast(null), []);
  const cancelarRemocao = useCallback(() => setRemovendo(null), []);

  const slugNovo = gerarSlug(novoNome);
  const equivalente = slugNovo ? categorias.find((c) => c.slug === slugNovo) : undefined;

  async function criar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!novoNome.trim() || equivalente) return;
    setCriando(true);
    setErro(null);

    const resposta = await fetch("/api/admin/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novoNome }),
    });
    setCriando(false);

    if (!resposta.ok) {
      setErro(`Não foi possível criar a categoria: ${await mensagemErro(resposta)}`);
      return;
    }
    const { categoria } = (await resposta.json()) as { categoria: CategoriaAdmin };
    setCategorias((atuais) => [...atuais, categoria]);
    setNovoNome("");
    setToast(`Categoria "${categoria.nome}" criada.`);
  }

  function iniciarRenomear(categoria: CategoriaAdmin) {
    setEditandoId(categoria.id);
    setNomeEditado(categoria.nome);
    setErro(null);
  }

  async function salvarNome(categoria: CategoriaAdmin) {
    const nome = nomeEditado.trim();
    if (!nome || nome === categoria.nome) {
      setEditandoId(null);
      return;
    }

    const resposta = await fetch(`/api/admin/categorias/${categoria.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });

    if (!resposta.ok) {
      setErro(`Não foi possível renomear "${categoria.nome}": ${await mensagemErro(resposta)}`);
      return;
    }
    setCategorias((atuais) => atuais.map((c) => (c.id === categoria.id ? { ...c, nome } : c)));
    setEditandoId(null);
    setToast(`Categoria renomeada para "${nome}".`);
  }

  async function mover(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= categorias.length) return;

    const anteriores = categorias;
    const novas = [...categorias];
    [novas[indice], novas[destino]] = [novas[destino], novas[indice]];
    setCategorias(novas);
    setErro(null);

    const resposta = await fetch("/api/admin/categorias/ordem", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: novas.map((c) => c.id) }),
    });

    if (!resposta.ok) {
      setCategorias(anteriores);
      setErro(`Não foi possível mudar a ordem: ${await mensagemErro(resposta)}`);
    }
  }

  async function confirmarRemocao() {
    if (!removendo) return;
    const alvo = removendo;
    setRemovendo(null);
    setErro(null);

    const resposta = await fetch(`/api/admin/categorias/${alvo.id}`, { method: "DELETE" });
    if (!resposta.ok) {
      setErro(`Não foi possível remover "${alvo.nome}": ${await mensagemErro(resposta)}`);
      return;
    }
    const { produtosMovidos } = (await resposta.json()) as { produtosMovidos: number };
    setCategorias((atuais) =>
      atuais
        .filter((c) => c.id !== alvo.id)
        .map((c) => (c.padrao ? { ...c, totalProdutos: c.totalProdutos + produtosMovidos } : c))
    );
    setToast(
      produtosMovidos > 0
        ? `Categoria removida. ${rotuloProdutos(produtosMovidos)} ${produtosMovidos === 1 ? "foi" : "foram"} para Diversos.`
        : "Categoria removida."
    );
  }

  return (
    <>
      <form className={styles.nova} onSubmit={criar}>
        <input
          className={styles.novaCampo}
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Nova categoria, ex.: Religioso"
          aria-label="Nome da nova categoria"
          maxLength={60}
        />
        <span className={styles.previa} aria-live="polite">
          na vitrine:
          <span className={`${styles.chip} ${novoNome.trim() ? "" : styles.chipVazio}`}>
            {novoNome.trim() || "nome"}
          </span>
        </span>
        <button
          type="submit"
          className={adminStyles.btnPrimary}
          disabled={criando || !novoNome.trim() || Boolean(equivalente)}
        >
          {criando ? "Criando…" : "Criar categoria"}
        </button>
        {equivalente && (
          <p className={styles.aviso} role="status">
            Já existe a categoria &quot;{equivalente.nome}&quot; com o mesmo endereço. Use-a ou escolha outro nome.
          </p>
        )}
      </form>

      {erro && <p className={adminStyles.formError}>{erro}</p>}

      <ol className={styles.lista}>
        {categorias.map((categoria, indice) => (
          <li key={categoria.id} className={styles.linha}>
            <div className={styles.ordemBotoes}>
              <button
                type="button"
                onClick={() => mover(indice, -1)}
                disabled={indice === 0}
                aria-label={`Subir ${categoria.nome}`}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => mover(indice, 1)}
                disabled={indice === categorias.length - 1}
                aria-label={`Descer ${categoria.nome}`}
              >
                ↓
              </button>
            </div>

            <div className={styles.identidade}>
              {editandoId === categoria.id ? (
                <form
                  className={styles.renomear}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void salvarNome(categoria);
                  }}
                >
                  <input
                    value={nomeEditado}
                    onChange={(e) => setNomeEditado(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setEditandoId(null)}
                    aria-label={`Novo nome para ${categoria.nome}`}
                    maxLength={60}
                    autoFocus
                  />
                  <button type="submit" className={adminStyles.btnPrimary}>
                    Salvar
                  </button>
                  <button type="button" className={adminStyles.btnGhost} onClick={() => setEditandoId(null)}>
                    Cancelar
                  </button>
                </form>
              ) : (
                <span className={styles.chip}>{categoria.nome}</span>
              )}
              <span className={styles.endereco}>/produtos/{categoria.slug}</span>
              {categoria.padrao && (
                <span className={styles.selo} title="Recebe produtos sem categoria e os de categorias removidas">
                  padrão
                </span>
              )}
            </div>

            <span className={`${styles.contagem} ${categoria.totalProdutos === 0 ? styles.contagemZero : ""}`}>
              {rotuloProdutos(categoria.totalProdutos)}
            </span>

            <div className={styles.acoes}>
              {editandoId !== categoria.id && (
                <button type="button" className={adminStyles.btnGhost} onClick={() => iniciarRenomear(categoria)}>
                  renomear
                </button>
              )}
              {!categoria.padrao && (
                <button type="button" className={adminStyles.btnGhost} onClick={() => setRemovendo(categoria)}>
                  remover
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>

      <ConfirmModal
        aberto={removendo !== null}
        titulo={`Remover "${removendo?.nome ?? ""}"?`}
        mensagem={
          removendo && removendo.totalProdutos > 0
            ? `${rotuloProdutos(removendo.totalProdutos)} ${removendo.totalProdutos === 1 ? "será movido" : "serão movidos"} para Diversos. Os links antigos continuam funcionando.`
            : "A categoria não tem produtos e sai da lista."
        }
        textoConfirmar="Remover"
        variante="perigo"
        onConfirmar={confirmarRemocao}
        onCancelar={cancelarRemocao}
      />
      <Toast mensagem={toast} aoFechar={fecharToast} />
    </>
  );
}
