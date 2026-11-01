"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCarrinho } from "@/components/carrinho/carrinho-context";
import { calcularTotais } from "@/lib/carrinho/carrinho";
import type { OpcaoFrete, ServicoFrete } from "@/lib/models/frete";
import FormularioCheckout from "@/components/checkout/FormularioCheckout";
import ResumoPedido from "@/components/checkout/ResumoPedido";
import styles from "@/components/checkout/checkout.module.css";

export default function CheckoutPage() {
  const { itens, pronto } = useCarrinho();
  const router = useRouter();
  const totais = calcularTotais(itens);
  // Evita que o carrinho, esvaziado ao concluir o pedido, dispare o redirect
  // para "/carrinho" enquanto a navegação para "/pedido/[id]" ainda está em
  // andamento (router.push é assíncrono — esta página pode re-renderizar
  // antes de a troca de rota completar).
  const concluidoRef = useRef(false);

  // Formas de entrega (spec 039) — o valor vem sempre do servidor.
  const [opcoesFrete, setOpcoesFrete] = useState<OpcaoFrete[]>([]);
  const [servicoFrete, setServicoFrete] = useState<ServicoFrete | null>(null);
  const [erroOpcoesFrete, setErroOpcoesFrete] = useState<string | null>(null);

  const carregarOpcoesFrete = useCallback(async () => {
    setErroOpcoesFrete(null);
    try {
      const resposta = await fetch("/api/frete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const dados = (await resposta.json().catch(() => ({}))) as { opcoes?: OpcaoFrete[]; erro?: string };
      if (!resposta.ok || !dados.opcoes) {
        setErroOpcoesFrete(
          `${dados.erro ?? "Não conseguimos carregar as formas de entrega."} (status ${resposta.status})`
        );
        return;
      }
      setOpcoesFrete(dados.opcoes);
    } catch {
      setErroOpcoesFrete("Não conseguimos carregar as formas de entrega. Verifique sua conexão.");
    }
  }, []);

  useEffect(() => {
    void carregarOpcoesFrete();
  }, [carregarOpcoesFrete]);

  useEffect(() => {
    if (pronto && itens.length === 0 && !concluidoRef.current) {
      router.replace("/carrinho");
    }
  }, [pronto, itens.length, router]);

  if (!pronto || itens.length === 0) {
    return null;
  }

  const freteSelecionado = opcoesFrete.find((opcao) => opcao.servico === servicoFrete) ?? null;

  return (
    <div className="container">
      <div className={styles.pagina}>
        <p className={styles.eyebrow}>quase lá…</p>
        <h1 className={styles.titulo}>Checkout</h1>

        <div className={styles.layout}>
          <FormularioCheckout
            opcoesFrete={opcoesFrete}
            freteSelecionado={freteSelecionado}
            erroOpcoesFrete={erroOpcoesFrete}
            aoEscolherFrete={setServicoFrete}
            aoAtualizarOpcoesFrete={setOpcoesFrete}
            aoRecarregarOpcoesFrete={carregarOpcoesFrete}
            aoConcluir={(pedidoId) => {
              concluidoRef.current = true;
              router.push(`/pedido/${pedidoId}`);
            }}
          />
          <ResumoPedido
            itens={itens.map((item) => ({
              nome: item.nome,
              quantidade: item.quantidade,
              precoUnitario: item.preco,
            }))}
            subtotalCentavos={totais.totalCentavos}
            frete={freteSelecionado}
            freteAEscolher
            totalCentavos={totais.totalCentavos + (freteSelecionado?.valorCentavos ?? 0)}
          />
        </div>
      </div>
    </div>
  );
}
