import { NextResponse } from "next/server";
import { verificarPagamentoPedido } from "@/lib/pagamentos/verificacao";

type Params = { params: Promise<{ id: string }> };

/**
 * Botão "Verificar pagamento no Mercado Pago" do admin (EDI-132): confere o
 * pagamento do pedido do site e, se aprovado, conclui como o aviso do MP faria
 * (pago, estoque, e-mails — no máximo uma vez). Protegida por sessão pelo
 * proxy (`/api/pedidos/*`). Ver contracts/api.md da spec 036.
 */
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const { resultado, mensagem } = await verificarPagamentoPedido(id, "admin");
    switch (resultado) {
      case "pedido_inexistente":
        return NextResponse.json({ erro: mensagem, resultado }, { status: 404 });
      case "nao_e_do_site":
        return NextResponse.json({ erro: mensagem, resultado }, { status: 409 });
      case "falha":
        return NextResponse.json({ erro: mensagem, resultado }, { status: 502 });
      default:
        return NextResponse.json({
          resultado,
          mensagem,
          pedido: { status: resultado === "pago" ? "pago" : undefined },
        });
    }
  } catch (erro) {
    console.error(`[pagamentos] falha ao verificar o pedido ${id}:`, erro);
    return NextResponse.json(
      { erro: "Falha ao verificar o pagamento.", resultado: "falha" },
      { status: 502 }
    );
  }
}
