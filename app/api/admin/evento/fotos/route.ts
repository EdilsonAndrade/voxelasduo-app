import { NextResponse } from "next/server";
import { ArquivoInvalidoError, enviarFotoEvento } from "@/lib/storage/blob";

/** Recebe uma foto de item de pedido de evento (já comprimida no aparelho) e devolve a URL pública. */
export async function POST(request: Request) {
  const dados = await request.formData().catch(() => null);
  const foto = dados?.get("foto");

  if (!(foto instanceof File) || foto.size === 0) {
    return NextResponse.json({ erro: "Envie a foto no campo \"foto\"." }, { status: 400 });
  }

  try {
    const url = await enviarFotoEvento(foto);
    return NextResponse.json({ url }, { status: 201 });
  } catch (erro) {
    if (erro instanceof ArquivoInvalidoError) {
      return NextResponse.json({ erro: erro.message }, { status: 400 });
    }
    console.error("Falha ao enviar foto de pedido de evento:", erro);
    return NextResponse.json({ erro: "Não foi possível guardar a foto agora." }, { status: 502 });
  }
}
