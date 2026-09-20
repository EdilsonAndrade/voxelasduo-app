import { NextResponse } from "next/server";
import { criarEncomenda } from "@/lib/encomendas/repository";
import { validarEncomenda, type EncomendaPayload } from "@/lib/encomendas/validacao";
import { enviarConfirmacaoEncomenda, notificarAdminNovaEncomenda } from "@/lib/email/resend";

/**
 * Pedido de encomenda sob medida (público — sem sessão). Grava no MongoDB,
 * avisa o admin e confirma o recebimento ao cliente. Os e-mails são
 * best-effort: falha de envio nunca invalida uma encomenda já gravada.
 */
export async function POST(request: Request) {
  const corpo = (await request.json().catch(() => null)) as
    | (EncomendaPayload & { website?: unknown })
    | null;

  if (typeof corpo !== "object" || corpo === null) {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  // Campo-armadilha ("website") escondido no formulário: humanos não o preenchem.
  // Responde como sucesso para não dar pista ao robô, mas não grava nem envia nada.
  if (typeof corpo.website === "string" && corpo.website.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const erros = validarEncomenda(corpo);
  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erros }, { status: 400 });
  }

  const encomenda = await criarEncomenda({
    nome: corpo.nome as string,
    email: corpo.email as string,
    telefone: corpo.telefone as string,
    descricao: corpo.descricao as string,
  });

  await Promise.all([notificarAdminNovaEncomenda(encomenda), enviarConfirmacaoEncomenda(encomenda)]);

  return NextResponse.json({ ok: true }, { status: 201 });
}
