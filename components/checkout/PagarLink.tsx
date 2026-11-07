"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import ImagemOtimizada from "@/components/ImagemOtimizada";
import FormularioCheckout from "@/components/checkout/FormularioCheckout";
import ResumoPedido from "@/components/checkout/ResumoPedido";
import type { OpcaoFrete, ServicoFrete } from "@/lib/models/frete";
import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./checkout.module.css";
import link from "./pagarLink.module.css";

export interface ItemPagarLink {
  produtoId: string;
  variacaoId?: string;
  nome: string;
  foto?: string;
  quantidade: number;
  precoOriginalCentavos: number;
  precoCentavos: number;
}

interface PagarLinkProps {
  codigo: string;
  clienteNome?: string;
  observacao?: string;
  itens: ItemPagarLink[];
  freteGratis: boolean;
  validoAte: string;
  opcoesIniciais: OpcaoFrete[];
}

/** Página pública do link de pagamento: itens com o preço combinado + checkout do site. */
export default function PagarLink({
  codigo,
  clienteNome,
  observacao,
  itens,
  freteGratis,
  validoAte,
  opcoesIniciais,
}: PagarLinkProps) {
  const router = useRouter();
  const [opcoesFrete, setOpcoesFrete] = useState<OpcaoFrete[]>(opcoesIniciais);
  const [servicoFrete, setServicoFrete] = useState<ServicoFrete | null>(null);
  const [erroOpcoesFrete, setErroOpcoesFrete] = useState<string | null>(
    opcoesIniciais.length === 0 ? "Não conseguimos carregar as formas de entrega." : null
  );

  const recarregarOpcoes = useCallback(async () => {
    setErroOpcoesFrete(null);
    try {
      const resposta = await fetch(`/api/pagar/${codigo}`);
      const dados = (await resposta.json().catch(() => ({}))) as { opcoes?: OpcaoFrete[]; erro?: string };
      if (!resposta.ok || !dados.opcoes) {
        setErroOpcoesFrete(`${dados.erro ?? "Não conseguimos carregar as formas de entrega."} (status ${resposta.status})`);
        return;
      }
      setOpcoesFrete(dados.opcoes);
    } catch {
      setErroOpcoesFrete("Não conseguimos carregar as formas de entrega. Verifique sua conexão.");
    }
  }, [codigo]);

  const subtotal = itens.reduce((acc, i) => acc + i.precoCentavos * i.quantidade, 0);
  const original = itens.reduce((acc, i) => acc + i.precoOriginalCentavos * i.quantidade, 0);
  const economia = Math.max(0, original - subtotal);
  const freteSelecionado = opcoesFrete.find((o) => o.servico === servicoFrete) ?? null;
  const validade = new Date(validoAte).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  return (
    <div className="container">
      <div className={styles.pagina}>
        <p className={styles.eyebrow}>{clienteNome ? `separado pra ${clienteNome}` : "separado pra você"}</p>
        <h1 className={styles.titulo}>Seu pedido com preço especial</h1>

        <div className={styles.layout}>
          <div className={link.coluna}>
            <section className={link.etiqueta} aria-label="Itens do pedido">
              <ul className={link.itens}>
                {itens.map((item) => {
                  const desconto =
                    item.precoOriginalCentavos > item.precoCentavos
                      ? Math.round((1 - item.precoCentavos / item.precoOriginalCentavos) * 100)
                      : 0;
                  return (
                    <li key={`${item.produtoId}:${item.variacaoId ?? ""}`} className={link.item}>
                      {item.foto ? (
                        <ImagemOtimizada src={item.foto} alt="" sizes="64px" className={link.foto} />
                      ) : (
                        <span className={link.foto} aria-hidden="true" />
                      )}
                      <div className={link.itemTexto}>
                        <span className={link.itemNome}>{item.nome}</span>
                        <span className={link.itemQtd}>
                          {item.quantidade} × {formatarPreco(item.precoCentavos)}
                        </span>
                      </div>
                      <div className={link.itemPreco}>
                        {desconto > 0 && (
                          <>
                            <span className={link.selo}>−{desconto}%</span>
                            <s className={link.de}>{formatarPreco(item.precoOriginalCentavos * item.quantidade)}</s>
                          </>
                        )}
                        <strong className={link.por}>{formatarPreco(item.precoCentavos * item.quantidade)}</strong>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {economia > 0 && <p className={link.economia}>você economiza {formatarPreco(economia)}</p>}
              {observacao && <p className={link.recado}>“{observacao}”</p>}
              <p className={link.validade}>
                Preço válido até {validade}
                {freteGratis ? " · frete grátis por PAC ou SEDEX" : ""}
              </p>
            </section>

            <FormularioCheckout
              linkPagamento={{ codigo, itens }}
              opcoesFrete={opcoesFrete}
              freteSelecionado={freteSelecionado}
              erroOpcoesFrete={erroOpcoesFrete}
              aoEscolherFrete={setServicoFrete}
              aoAtualizarOpcoesFrete={setOpcoesFrete}
              aoRecarregarOpcoesFrete={recarregarOpcoes}
              aoConcluir={(pedidoId) => router.push(`/pedido/${pedidoId}`)}
            />
          </div>
          <ResumoPedido
            itens={itens.map((i) => ({ nome: i.nome, quantidade: i.quantidade, precoUnitario: i.precoCentavos }))}
            subtotalCentavos={subtotal}
            frete={freteSelecionado}
            freteAEscolher
            totalCentavos={subtotal + (freteSelecionado?.valorCentavos ?? 0)}
          />
        </div>
      </div>
    </div>
  );
}
