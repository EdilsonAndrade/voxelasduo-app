import { NextResponse } from "next/server";
import { ArquivoInvalidoError, enviarFotoProduto } from "@/lib/storage/blob";

export async function POST(request: Request) {
  const formData = await request.formData();
  const arquivo = formData.get("arquivo");

  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Envie um arquivo no campo 'arquivo'." }, { status: 400 });
  }

  try {
    const url = await enviarFotoProduto(arquivo);
    return NextResponse.json({ url });
  } catch (erro) {
    if (erro instanceof ArquivoInvalidoError) {
      return NextResponse.json({ erro: erro.message }, { status: 400 });
    }
    // Erro do armazenamento (token, loja do Blob, rede): devolve o motivo em vez de um 500 vazio.
    console.error("[upload de foto de produto]", erro);
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: `Não foi possível guardar a foto: ${detalhe}` }, { status: 500 });
  }
}
