import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PagarLink from "@/components/checkout/PagarLink";
import styles from "@/components/checkout/pagarLink.module.css";
import { opcoesFreteVigentes } from "@/lib/frete/repository";
import { opcoesFreteDoLink, situacaoDoLink } from "@/lib/linksPagamento/regras";
import { buscarLinkPorCodigo } from "@/lib/linksPagamento/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pagamento do pedido · Voxelas Duo",
  robots: { index: false, follow: false },
};

/** Link de pagamento (pedido montado pela loja com preço especial). */
export default async function PagarPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const encontrado = await buscarLinkPorCodigo(decodeURIComponent(codigo));
  if (!encontrado) notFound();
  const { link, statusPedido } = encontrado;

  // Link já virou pedido: segue para a página do pedido (pagamento ou confirmação).
  if (link.pedidoId && statusPedido && statusPedido !== "cancelado") {
    redirect(`/pedido/${link.pedidoId.toString()}`);
  }

  const situacao = situacaoDoLink(link, statusPedido);
  if (situacao === "vencido" || situacao === "cancelado") {
    return (
      <div className="container">
        <div className={styles.aviso}>
          <h1>{situacao === "vencido" ? "Este link venceu" : "Este link foi cancelado"}</h1>
          <p>Fale com a loja para receber um link novo com o seu pedido.</p>
          <Link href="/produtos">ver os produtos da loja →</Link>
        </div>
      </div>
    );
  }

  const opcoes = opcoesFreteDoLink(await opcoesFreteVigentes(), link.freteGratis);

  return (
    <PagarLink
      codigo={link.codigo}
      {...(link.clienteNome ? { clienteNome: link.clienteNome } : {})}
      {...(link.observacao ? { observacao: link.observacao } : {})}
      itens={link.itens.map((item) => ({
        produtoId: item.produtoId.toString(),
        ...(item.variacaoId ? { variacaoId: item.variacaoId } : {}),
        nome: item.nome,
        ...(item.foto ? { foto: item.foto } : {}),
        quantidade: item.quantidade,
        precoOriginalCentavos: item.precoOriginalCentavos,
        precoCentavos: item.precoCentavos,
      }))}
      freteGratis={link.freteGratis}
      validoAte={link.validoAte.toISOString()}
      opcoesIniciais={opcoes}
    />
  );
}
