"use client";

import { useState } from "react";
import SelectBusca from "./SelectBusca";
import type { CategoriaResumo } from "@/lib/models/categoria";
import styles from "./admin.module.css";

/**
 * Troca a categoria do produto direto na listagem do admin (EDI-123): salva
 * ao selecionar; em erro, volta para a categoria anterior e mostra a
 * mensagem da API.
 */
export default function TrocarCategoriaProduto({
  produtoId,
  produtoNome,
  categoriaInicial,
  categorias,
}: {
  produtoId: string;
  produtoNome: string;
  categoriaInicial: string;
  categorias: CategoriaResumo[];
}) {
  const [categoria, setCategoria] = useState(categoriaInicial);
  const [salvando, setSalvando] = useState(false);
  const [status, setStatus] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function trocar(nova: string) {
    const anterior = categoria;
    setCategoria(nova);
    setSalvando(true);
    setStatus(null);

    const resposta = await fetch(`/api/produtos/${produtoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoria: nova }),
    });
    setSalvando(false);

    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => ({}));
      setCategoria(anterior);
      setStatus({ tipo: "erro", texto: corpo.campos?.categoria ?? corpo.erro ?? `Erro ${resposta.status}.` });
      return;
    }
    setStatus({ tipo: "ok", texto: "Salvo" });
  }

  return (
    <div>
      <SelectBusca
        compacto
        opcoes={categorias.map((c) => ({ valor: c.slug, rotulo: c.nome }))}
        valor={categoria}
        onChange={(nova) => void trocar(nova)}
        placeholder={categoria || "Sem categoria"}
        placeholderBusca="Buscar categoria"
        desabilitado={salvando}
        rotuloAcessivel={`Categoria de ${produtoNome}`}
      />
      {status && (
        <span className={status.tipo === "ok" ? styles.formSuccess : styles.fieldError} role="status">
          {status.texto}
        </span>
      )}
    </div>
  );
}
