"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import calc from "./calculadoraRapida.module.css";
import ConfirmModal from "./ConfirmModal";

export interface CalculoResumo {
  id: string;
  nome: string;
  atualizadoEm: string;
  virouProduto: boolean;
}

/** Lista dos cálculos guardados na calculadora: abrir para editar ou excluir. */
export default function CalculosSalvos({ calculos, abertoId }: { calculos: CalculoResumo[]; abertoId?: string }) {
  const router = useRouter();
  const [excluindo, setExcluindo] = useState<CalculoResumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmarExclusao() {
    if (!excluindo) return;
    const alvo = excluindo;
    setExcluindo(null);
    setErro(null);
    const resposta = await fetch(`/api/admin/calculos-preco/${alvo.id}`, { method: "DELETE" });
    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => ({}));
      setErro(dados.erro ?? `Erro ${resposta.status} ao excluir.`);
      return;
    }
    if (alvo.id === abertoId) router.push("/admin/produtos/calculadora");
    router.refresh();
  }

  if (calculos.length === 0) return null;

  return (
    <details className={calc.salvos} open={!abertoId}>
      <summary>Cálculos salvos ({calculos.length})</summary>
      <ul>
        {calculos.map((c) => (
          <li key={c.id} className={c.id === abertoId ? calc.salvoAberto : undefined}>
            <Link href={`/admin/produtos/calculadora?id=${c.id}`}>{c.nome}</Link>
            <span className={styles.mlLinkAviso}>
              {new Date(c.atualizadoEm).toLocaleDateString("pt-BR")}
              {c.virouProduto && " · já virou produto"}
            </span>
            <button type="button" className={calc.excluir} onClick={() => setExcluindo(c)}>
              Excluir
            </button>
          </li>
        ))}
      </ul>
      {erro && <span className={styles.fieldError}>{erro}</span>}
      <ConfirmModal
        aberto={excluindo !== null}
        titulo="Excluir cálculo"
        mensagem={`Excluir o cálculo "${excluindo?.nome ?? ""}"? O produto criado a partir dele, se houver, continua existindo.`}
        textoConfirmar="Excluir"
        variante="perigo"
        onConfirmar={confirmarExclusao}
        onCancelar={() => setExcluindo(null)}
      />
    </details>
  );
}
