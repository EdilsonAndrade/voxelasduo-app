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
    throw erro;
  }
}
