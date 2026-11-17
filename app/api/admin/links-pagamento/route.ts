import { NextResponse } from "next/server";
import { paraLinkResumo } from "@/lib/linksPagamento/apresentacao";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import { resolverCalculosDoLink } from "@/lib/linksPagamento/calculos";
import { validarLinkEntrada } from "@/lib/linksPagamento/regras";
import { criarLinkPagamento, ErroLinkPagamento, listarLinksPagamento } from "@/lib/linksPagamento/repository";

/** Links de pagamento — protegido pelo proxy `/api/admin/*`. */
export async function GET() {
  const links = await listarLinksPagamento();
  return NextResponse.json({ links: links.map((l) => paraLinkResumo(l)) });
}

export async function POST(request: Request) {
  const { erros, dados } = validarLinkEntrada(await request.json().catch(() => null));
  if (!dados) return NextResponse.json({ erro: "Dados inválidos.", campos: erros }, { status: 400 });

  try {
    // Itens que ainda estão só na calculadora viram produto rascunho antes de gravar o link.
    const taxas = await buscarTaxasCanais();
    const entrada = await resolverCalculosDoLink(dados, {
      percentual: taxas.siteTaxaPercentual,
      fixaCentavos: taxas.siteTaxaFixaCentavos,
    });
    const link = await criarLinkPagamento(entrada);
    return NextResponse.json(
      { link: paraLinkResumo({ link, statusPedido: null }) },
      { status: 201 }
    );
  } catch (falha) {
    if (falha instanceof ErroLinkPagamento) {
      return NextResponse.json({ erro: "Itens inválidos.", campos: falha.campos }, { status: 400 });
    }
    throw falha;
  }
}
