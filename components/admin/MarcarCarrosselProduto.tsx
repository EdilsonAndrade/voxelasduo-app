"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./secoesHome.module.css";

export interface CarrosselOpcao {
  id: string;
  titulo: string;
}

/** Coluna "Destaques" da lista de produtos: liga/desliga o produto em cada carrossel da home (FR-009). */
export default function MarcarCarrosselProduto({
  produtoId,
  produtoNome,
  carrosseis,
  marcadosIniciais,
}: {
  produtoId: string;
  produtoNome: string;
  carrosseis: CarrosselOpcao[];
  marcadosIniciais: string[];
}) {
  const [aberto, setAberto] = useState(false);
  const [marcados, setMarcados] = useState(() => new Set(marcadosIniciais));
  const [pendente, setPendente] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const raizRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function fora(evento: MouseEvent) {
      if (!raizRef.current?.contains(evento.target as Node)) setAberto(false);
    }
    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  async function alternar(carrosselId: string) {
    const marcar = !marcados.has(carrosselId);
    setPendente(carrosselId);
    setErro(null);

    const resposta = await fetch(`/api/admin/home/secoes/${carrosselId}/produtos/${produtoId}`, {
      method: marcar ? "POST" : "DELETE",
    });
    setPendente(null);

    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => ({}));
      setErro(corpo.erro ?? `Erro ${resposta.status}.`);
      return;
    }

    setMarcados((atuais) => {
      const novos = new Set(atuais);
      if (marcar) novos.add(carrosselId);
      else novos.delete(carrosselId);
      return novos;
    });
  }

  const quantidade = marcados.size;

  return (
    <div className={styles.marcar} ref={raizRef}>
      <button
        type="button"
        className={`${styles.marcarGatilho} ${quantidade > 0 ? styles.marcarGatilhoAtivo : ""}`}
        aria-expanded={aberto}
        aria-label={`Carrosséis da home de ${produtoNome}`}
        onClick={() => setAberto((a) => !a)}
      >
        {quantidade > 0 ? `★ ${quantidade}` : "☆ marcar"}
      </button>

      {aberto && (
        <div className={styles.marcarPainel}>
          {carrosseis.length === 0 ? (
            <p className={styles.marcarVazio}>
              Nenhum carrossel criado. <Link href="/admin/banners/nova">Criar carrossel</Link>
            </p>
          ) : (
            carrosseis.map((carrossel) => (
              <label key={carrossel.id} className={styles.marcarItem}>
                <input
                  type="checkbox"
                  checked={marcados.has(carrossel.id)}
                  disabled={pendente !== null}
                  onChange={() => alternar(carrossel.id)}
                />
                {carrossel.titulo}
              </label>
            ))
          )}
          {erro && <p className={styles.erroInline}>{erro}</p>}
        </div>
      )}
    </div>
  );
}
