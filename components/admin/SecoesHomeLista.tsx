"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import ConfirmModal from "@/components/admin/ConfirmModal";
import Toast from "@/components/admin/Toast";
import { ROTULOS_TIPO_SECAO, type TipoSecaoHome } from "@/lib/models/secaoHome";
import adminStyles from "./admin.module.css";
import styles from "./secoesHome.module.css";

export interface SecaoResumo {
  id: string;
  tipo: TipoSecaoHome;
  titulo?: string;
  ativa: boolean;
  miniatura?: string;
  quantidadeProdutos?: number;
}

const ICONE_TIPO: Record<TipoSecaoHome, string> = {
  bannerHero: "🖼️",
  bannerIntermediario: "🖼️",
  textoDestaque: "✍️",
  carrossel: "🎠",
};

async function mensagemErro(resposta: Response): Promise<string> {
  const corpo = await resposta.json().catch(() => ({}));
  const primeiroCampo = corpo.campos ? Object.values(corpo.campos)[0] : undefined;
  return (primeiroCampo as string | undefined) ?? corpo.erro ?? `Erro ${resposta.status}.`;
}

export default function SecoesHomeLista({ secoesIniciais }: { secoesIniciais: SecaoResumo[] }) {
  const router = useRouter();
  const [secoes, setSecoes] = useState(secoesIniciais);
  const [erro, setErro] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<SecaoResumo | null>(null);
  const fecharToast = useCallback(() => setToast(null), []);
  const cancelarExclusao = useCallback(() => setExcluindo(null), []);

  async function alternarAtiva(secao: SecaoResumo) {
    setErro(null);
    const resposta = await fetch(`/api/admin/home/secoes/${secao.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativa: !secao.ativa }),
    });

    if (!resposta.ok) {
      setErro(`Não foi possível ${secao.ativa ? "ocultar" : "mostrar"} a seção: ${await mensagemErro(resposta)}`);
      return;
    }
    setSecoes((atuais) => atuais.map((s) => (s.id === secao.id ? { ...s, ativa: !s.ativa } : s)));
    setToast(secao.ativa ? "Seção ocultada da home." : "Seção visível na home.");
  }

  async function mover(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= secoes.length) return;

    const anteriores = secoes;
    const novas = [...secoes];
    [novas[indice], novas[destino]] = [novas[destino], novas[indice]];
    setSecoes(novas);
    setErro(null);

    const resposta = await fetch("/api/admin/home/secoes/ordem", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: novas.map((s) => s.id) }),
    });

    if (!resposta.ok) {
      setSecoes(anteriores);
      setErro(`Não foi possível mudar a ordem: ${await mensagemErro(resposta)}`);
      if (resposta.status === 400) router.refresh();
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    const alvo = excluindo;
    setExcluindo(null);
    setErro(null);

    const resposta = await fetch(`/api/admin/home/secoes/${alvo.id}`, { method: "DELETE" });
    if (!resposta.ok) {
      setErro(`Não foi possível excluir a seção: ${await mensagemErro(resposta)}`);
      return;
    }
    setSecoes((atuais) => atuais.filter((s) => s.id !== alvo.id));
    setToast("Seção excluída.");
  }

  if (secoes.length === 0) {
    return (
      <p className={adminStyles.empty}>
        Nenhuma seção ainda. Enquanto não houver seção visível, a home leva direto para o catálogo.
      </p>
    );
  }

  return (
    <>
      {erro && <p className={adminStyles.formError}>{erro}</p>}

      <ol className={styles.lista}>
        {secoes.map((secao, indice) => (
          <li key={secao.id} className={`${styles.linha} ${secao.ativa ? "" : styles.linhaInativa}`}>
            <div className={styles.ordemBotoes}>
              <button
                type="button"
                onClick={() => mover(indice, -1)}
                disabled={indice === 0}
                aria-label={`Subir ${secao.titulo ?? ROTULOS_TIPO_SECAO[secao.tipo]}`}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => mover(indice, 1)}
                disabled={indice === secoes.length - 1}
                aria-label={`Descer ${secao.titulo ?? ROTULOS_TIPO_SECAO[secao.tipo]}`}
              >
                ↓
              </button>
            </div>

            {secao.miniatura ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={secao.miniatura} alt="" className={styles.miniatura} />
            ) : (
              <span className={styles.miniatura} aria-hidden="true">
                {ICONE_TIPO[secao.tipo]}
              </span>
            )}

            <div className={styles.linhaInfo}>
              <span className={styles.linhaTipo}>
                {ROTULOS_TIPO_SECAO[secao.tipo]}
                {secao.quantidadeProdutos !== undefined && ` · ${secao.quantidadeProdutos} produto(s)`}
              </span>
              <span className={styles.linhaTitulo}>{secao.titulo ?? "Sem título"}</span>
            </div>

            <button
              type="button"
              className={`${styles.status} ${secao.ativa ? styles.statusAtiva : ""}`}
              onClick={() => alternarAtiva(secao)}
              title={secao.ativa ? "Clique para ocultar da home" : "Clique para mostrar na home"}
            >
              {secao.ativa ? "Na home" : "Oculta"}
            </button>

            <div className={styles.linhaAcoes}>
              <Link href={`/admin/banners/${secao.id}/editar`} className={adminStyles.btnGhost}>
                editar
              </Link>
              <button type="button" className={adminStyles.btnGhost} onClick={() => setExcluindo(secao)}>
                excluir
              </button>
            </div>
          </li>
        ))}
      </ol>

      <ConfirmModal
        aberto={excluindo !== null}
        titulo="Excluir seção?"
        mensagem={
          excluindo?.tipo === "carrossel"
            ? "O carrossel sai da home e as marcações dos produtos são desfeitas. Os produtos continuam cadastrados."
            : "A seção sai da home e não pode ser recuperada."
        }
        textoConfirmar="Excluir"
        variante="perigo"
        onConfirmar={confirmarExclusao}
        onCancelar={cancelarExclusao}
      />
      <Toast mensagem={toast} aoFechar={fecharToast} />
    </>
  );
}
