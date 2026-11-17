import { NextResponse } from "next/server";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import { paraLinkResumo } from "@/lib/linksPagamento/apresentacao";
import { resolverCalculosDoLink } from "@/lib/linksPagamento/calculos";
import { validarLinkEntrada } from "@/lib/linksPagamento/regras";
import {
  atualizarLinkPagamento,
  cancelarLinkPagamento,
  ErroLinkPagamento,
  ErroLinkTravado,
} from "@/lib/linksPagamento/repository";

/** Edita o link (mesmo código/URL) — só enquanto não virou pedido e não foi cancelado. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { erros, dados } = validarLinkEntrada(await request.json().catch(() => null));
  if (!dados) return NextResponse.json({ erro: "Dados inválidos.", campos: erros }, { status: 400 });

  try {
    const taxas = await buscarTaxasCanais();
    const entrada = await resolverCalculosDoLink(dados, {
      percentual: taxas.siteTaxaPercentual,
      fixaCentavos: taxas.siteTaxaFixaCentavos,
    });
    const link = await atualizarLinkPagamento(id, entrada);
    if (!link) return NextResponse.json({ erro: "Link não encontrado." }, { status: 404 });
    return NextResponse.json({ link: paraLinkResumo({ link, statusPedido: null }) });
  } catch (falha) {
    if (falha instanceof ErroLinkPagamento) {
      return NextResponse.json({ erro: "Itens inválidos.", campos: falha.campos }, { status: 400 });
    }
    if (falha instanceof ErroLinkTravado) {
      return NextResponse.json({ erro: falha.message, codigo: "link_travado" }, { status: 409 });
    }
    throw falha;
  }
}

/** Cancela um link que ainda não gerou pedido — `{ acao: "cancelar" }`. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const corpo = (await request.json().catch(() => null)) as { acao?: unknown } | null;
  if (corpo?.acao !== "cancelar") {
    return NextResponse.json({ erro: "Ação inválida. Use { acao: \"cancelar\" }." }, { status: 400 });
  }
  const link = await cancelarLinkPagamento(id);
  if (!link) {
    return NextResponse.json(
      { erro: "Link não encontrado, já cancelado ou já usado em um pedido." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
