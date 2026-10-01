import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { salvarPedidoEvento, serializarPedidoEvento } from "@/lib/eventos/repository";
import {
  normalizarPedidoEvento,
  urlFotoEventoValida,
  uuidValido,
  validarPedidoEvento,
} from "@/lib/eventos/validacao";
import type { PedidoEventoPayload } from "@/lib/models/pedidoEvento";

/**
 * Cria ou atualiza um pedido de evento pelo UUID gerado no aparelho (EDI-125).
 * Idempotente: a fila offline pode reenviar o mesmo pedido sem duplicá-lo.
 * 201 quando cria, 200 quando atualiza.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  if (!uuidValido(id)) {
    return NextResponse.json({ erro: "Identificador do pedido inválido." }, { status: 400 });
  }

  const corpo = await request.json().catch(() => null);
  if (typeof corpo !== "object" || corpo === null) {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const erros = validarPedidoEvento(corpo);
  const payload = corpo as PedidoEventoPayload;
  if (Object.keys(erros).length === 0) {
    payload.itens.forEach((item, i) => {
      if (!(item.fotos ?? []).every(urlFotoEventoValida)) erros[`itens.${i}`] = "Foto inválida. Tire a foto de novo.";
    });
  }
  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erro: "Confira os campos do pedido.", erros }, { status: 400 });
  }

  const autor = { id: session.user.id, nome: session.user.name ?? "Equipe" };
  const { pedido, criado } = await salvarPedidoEvento(id, normalizarPedidoEvento(payload), autor);

  return NextResponse.json({ pedido: serializarPedidoEvento(pedido) }, { status: criado ? 201 : 200 });
}
