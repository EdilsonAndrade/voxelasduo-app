"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "@/components/admin/admin.module.css";
import type { LinkPagamentoResumo } from "@/lib/linksPagamento/apresentacao";
import type { SituacaoLink } from "@/lib/models/linkPagamento";
import { formatarPreco } from "@/lib/produtos/formato";
import { textoWhatsApp, urlDoLink } from "./compartilhar";
import l from "./linksPagamento.module.css";

const CLASSE_SITUACAO: Record<SituacaoLink, string> = {
  ativo: styles.badgeStatusEnviado,
  aguardando_pagamento: styles.badgeStatusPendente,
  pago: styles.badgeStatusPago,
  vencido: styles.badgeZero,
  cancelado: styles.badgeStatusCancelado,
};

export default function ListaLinksPagamento({ links }: { links: LinkPagamentoResumo[] }) {
  const router = useRouter();
  const [copiado, setCopiado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);

  async function copiar(codigo: string) {
    await navigator.clipboard.writeText(urlDoLink(window.location.origin, codigo)).catch(() => undefined);
    setCopiado(codigo);
  }

  async function cancelar(id: string) {
    setErro(null);
    setCancelando(id);
    const resposta = await fetch(`/api/admin/links-pagamento/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "cancelar" }),
    }).catch(() => null);
    setCancelando(null);
    if (!resposta?.ok) {
      const dados = (await resposta?.json().catch(() => ({}))) as { erro?: string } | undefined;
      setErro(`${dados?.erro ?? "Não foi possível cancelar o link."} (status ${resposta?.status ?? "sem conexão"})`);
      return;
    }
    router.refresh();
  }

  if (links.length === 0) {
    return (
      <p className={styles.empty}>
        Nenhum link ainda. Clique em “+ Novo link” para montar um pedido com desconto e mandar para o cliente.
      </p>
    );
  }

  return (
    <>
      {erro && (
        <p className={styles.formError} role="alert">
          {erro}
        </p>
      )}
      <div className={l.tabela}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Itens</th>
              <th>Total</th>
              <th>Situação</th>
              <th>Validade</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {links.map((link) => {
              const usavel = link.situacao === "ativo";
              return (
                <tr key={link.id}>
                  <td>{link.clienteNome ?? "—"}</td>
                  <td>
                    {link.itens.map((item) => (
                      <div key={`${item.produtoId}:${item.variacaoId ?? ""}`} className={l.itemTabela}>
                        {item.quantidade}× {item.nome}
                      </div>
                    ))}
                  </td>
                  <td>
                    <strong>{formatarPreco(link.totais.totalCentavos)}</strong>
                    {link.totais.descontoCentavos > 0 && (
                      <div className={l.dica}>− {formatarPreco(link.totais.descontoCentavos)} de desconto</div>
                    )}
                    {link.freteGratis && <div className={l.dica}>frete grátis</div>}
                  </td>
                  <td>
                    <span className={CLASSE_SITUACAO[link.situacao]}>{link.rotuloSituacao}</span>
                    {link.pedidoId && (
                      <div>
                        <Link href="/admin/pedidos" className={l.dica}>
                          pedido{link.numeroPedido ? ` #${link.numeroPedido}` : ""} em Pedidos
                        </Link>
                      </div>
                    )}
                  </td>
                  <td>{new Date(link.validoAte).toLocaleDateString("pt-BR")}</td>
                  <td>
                    {usavel && (
                      <div className={l.acoesTabela}>
                        <button type="button" className={styles.btnGhost} onClick={() => copiar(link.codigo)}>
                          {copiado === link.codigo ? "Copiado" : "Copiar link"}
                        </button>
                        <button
                          type="button"
                          className={styles.btnGhost}
                          onClick={() =>
                            window.open(
                              `https://wa.me/?text=${encodeURIComponent(
                                textoWhatsApp(urlDoLink(window.location.origin, link.codigo), link.clienteNome)
                              )}`,
                              "_blank",
                              "noopener"
                            )
                          }
                        >
                          WhatsApp
                        </button>
                        <button
                          type="button"
                          className={styles.btnDanger}
                          disabled={cancelando === link.id}
                          onClick={() => cancelar(link.id)}
                        >
                          {cancelando === link.id ? "Cancelando…" : "Cancelar"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
