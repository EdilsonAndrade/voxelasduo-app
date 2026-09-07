import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/clienteConfig";
import { atualizarDadosCliente, type AtualizarDadosClienteInput } from "@/lib/clientes/repository";
import type { EnderecoCliente } from "@/lib/models/cliente";

/** Atualiza telefone/endereço do cadastro (Tarefa 10/EDI-84, US5). Protegida por `proxy.ts`. */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { telefone, endereco } = (await request.json().catch(() => ({}))) as {
    telefone?: unknown;
    endereco?: Partial<EnderecoCliente>;
  };

  const dados: AtualizarDadosClienteInput = {};
  if (typeof telefone === "string") {
    dados.telefone = telefone;
  }
  if (endereco && typeof endereco === "object") {
    dados.endereco = endereco as EnderecoCliente;
  }

  const cliente = await atualizarDadosCliente(new ObjectId(session.user.id), dados);

  if (!cliente) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  return NextResponse.json({ telefone: cliente.telefone, endereco: cliente.endereco });
}
