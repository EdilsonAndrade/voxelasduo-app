"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { STATUS_PEDIDO, type CanalOrigem, type StatusPedido } from "@/lib/models/pedido";
import type { PedidoDetalhado, PedidoResumo } from "@/lib/pedidos/apresentacao";
import { formatarPreco } from "@/lib/produtos/formato";
import ConfirmModal from "./ConfirmModal";
import Toast from "./Toast";
import styles from "./admin.module.css";

const LABEL_STATUS: Record<PedidoResumo["status"], string> = {
  pendente: "Pendente",
  pago: "Pago",
  enviado: "Enviado",
  cancelado: "Cancelado",
};

const CLASSE_BADGE_STATUS: Record<PedidoResumo["status"], string> = {
  pendente: styles.badgeStatusPendente,
  pago: styles.badgeStatusPago,
  enviado: styles.badgeStatusEnviado,
  cancelado: styles.badgeStatusCancelado,
};

const LABEL_CANAL: Record<PedidoResumo["canalOrigem"], string> = {
  site: "Site",
  mercado_livre: "Mercado Livre",
  shopee: "Shopee",
};

const CLASSE_BADGE_CANAL: Record<PedidoResumo["canalOrigem"], string> = {
  site: styles.badgeCanalSite,
  mercado_livre: styles.badgeCanalMercadoLivre,
  shopee: styles.badgeCanalShopeeEmBreve,
};

function formatarData(data: Date | string): string {
  return new Date(data).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PedidosLista({
  pedidosIniciais,
  canalAtual,
  statusAtual,
}: {
  pedidosIniciais: PedidoResumo[];
  canalAtual?: CanalOrigem;
  statusAtual?: StatusPedido;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pedidos, setPedidos] = useState(pedidosIniciais);
  const [pedidoExpandidoId, setPedidoExpandidoId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<PedidoDetalhado | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [pendenteConfirmacao, setPendenteConfirmacao] = useState<{
    pedidoId: string;
    novoStatus: StatusPedido;
  } | null>(null);
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [toastMensagem, setToastMensagem] = useState<string | null>(null);

  useEffect(() => setPedidos(pedidosIniciais), [pedidosIniciais]);

  async function confirmarMudancaStatus() {
    if (!pendenteConfirmacao) return;
    const { pedidoId, novoStatus } = pendenteConfirmacao;
    setSalvandoStatus(true);
    try {
      const resposta = await fetch(`/api/pedidos/${pedidoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (resposta.ok) {
        setPedidos((atual) =>
          atual.map((pedido) => (pedido.id === pedidoId ? { ...pedido, status: novoStatus } : pedido))
        );
        setToastMensagem(`Pedido marcado como "${LABEL_STATUS[novoStatus]}".`);
      }
    } finally {
      setSalvandoStatus(false);
      setPendenteConfirmacao(null);
    }
  }

  function atualizarFiltro(campo: "canal" | "status", valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) {
      params.set(campo, valor);
    } else {
      params.delete(campo);
    }
    router.push(`/admin/pedidos?${params.toString()}`);
  }

  async function alternarDetalhe(pedidoId: string) {
    if (pedidoExpandidoId === pedidoId) {
      setPedidoExpandidoId(null);
      setDetalhe(null);
      return;
    }

    setPedidoExpandidoId(pedidoId);
    setDetalhe(null);
    setCarregandoDetalhe(true);
    try {
      const resposta = await fetch(`/api/pedidos/${pedidoId}`);
      const dados = await resposta.json();
      if (resposta.ok) {
        setDetalhe(dados.pedido as PedidoDetalhado);
      }
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  const filtros = (
    <div className={styles.filtros}>
      <select
        className={styles.filtroSelect}
        value={canalAtual ?? ""}
        onChange={(evento) => atualizarFiltro("canal", evento.target.value)}
      >
        <option value="">Todos os canais</option>
        <option value="site">Site</option>
        <option value="mercado_livre">Mercado Livre</option>
        <option value="shopee">Shopee</option>
      </select>
      <select
        className={styles.filtroSelect}
        value={statusAtual ?? ""}
        onChange={(evento) => atualizarFiltro("status", evento.target.value)}
      >
        <option value="">Todos os status</option>
        <option value="pendente">Pendente</option>
        <option value="pago">Pago</option>
        <option value="enviado">Enviado</option>
        <option value="cancelado">Cancelado</option>
      </select>
    </div>
  );

  if (canalAtual === "shopee") {
    return (
      <>
        {filtros}
        <p className={styles.avisoShopee}>Integração com a Shopee pendente de aprovação.</p>
      </>
    );
  }

  if (pedidos.length === 0) {
    return (
      <>
        {filtros}
        <p className={styles.empty}>Nenhum pedido encontrado.</p>
      </>
    );
  }

  return (
    <>
      {filtros}
      <table className={styles.table}>
      <thead>
        <tr>
          <th>Canal</th>
          <th>Cliente</th>
          <th>Valor</th>
          <th>Status</th>
          <th>Data</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {pedidos.map((pedido) => (
          <Fragment key={pedido.id}>
            <tr>
              <td>
                <span className={CLASSE_BADGE_CANAL[pedido.canalOrigem]}>
                  {LABEL_CANAL[pedido.canalOrigem]}
                </span>
              </td>
              <td>
                {pedido.cliente.nome}
                {pedido.temItemSemCorrespondencia && (
                  <span className={styles.badgeZero} title="Um ou mais itens não têm produto correspondente no catálogo">
                    {" "}
                    item sem correspondência
                  </span>
                )}
              </td>
              <td>{formatarPreco(pedido.valorTotal)}</td>
              <td>
                <span className={CLASSE_BADGE_STATUS[pedido.status]}>{LABEL_STATUS[pedido.status]}</span>
              </td>
              <td>{formatarData(pedido.criadoEm)}</td>
              <td>
                <button type="button" className={styles.btnGhost} onClick={() => alternarDetalhe(pedido.id)}>
                  {pedidoExpandidoId === pedido.id ? "fechar" : "detalhes"}
                </button>
                <select
                  className={styles.filtroSelect}
                  value=""
                  onChange={(evento) => {
                    const novoStatus = evento.target.value as StatusPedido;
                    if (novoStatus) setPendenteConfirmacao({ pedidoId: pedido.id, novoStatus });
                    evento.target.value = "";
                  }}
                >
                  <option value="">mudar status...</option>
                  {STATUS_PEDIDO.filter((status) => status !== pedido.status).map((status) => (
                    <option key={status} value={status}>
                      {LABEL_STATUS[status]}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
            {pedidoExpandidoId === pedido.id && (
              <tr>
                <td colSpan={6}>
                  {carregandoDetalhe && <p>Carregando...</p>}
                  {detalhe && (
                    <div>
                      <p>
                        <strong>{detalhe.cliente.nome}</strong> · {detalhe.cliente.email}
                      </p>
                      <ul>
                        {detalhe.itens.map((item, indice) => (
                          <li key={indice}>
                            {item.quantidade}x {item.nome} — {formatarPreco(item.precoUnitario)}
                            {item.semCorrespondencia && " (sem correspondência no catálogo)"}
                          </li>
                        ))}
                      </ul>
                      {detalhe.pagamento.metodo && (
                        <p>
                          Pagamento: {detalhe.pagamento.metodo} — {detalhe.pagamento.status}
                        </p>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
      </table>
      <ConfirmModal
        aberto={pendenteConfirmacao !== null}
        titulo="Mudar status do pedido"
        mensagem={
          pendenteConfirmacao
            ? `Marcar este pedido como "${LABEL_STATUS[pendenteConfirmacao.novoStatus]}"?`
            : ""
        }
        textoConfirmar={salvandoStatus ? "Salvando..." : "Confirmar"}
        onConfirmar={confirmarMudancaStatus}
        onCancelar={() => setPendenteConfirmacao(null)}
      />
      <Toast mensagem={toastMensagem} aoFechar={() => setToastMensagem(null)} />
    </>
  );
}
