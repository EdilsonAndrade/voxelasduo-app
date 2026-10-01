import { NextResponse } from "next/server";
import { criarEncomenda } from "@/lib/encomendas/repository";
import {
  validarEncomenda,
  validarImagensEncomenda,
  type EncomendaPayload,
} from "@/lib/encomendas/validacao";
import { enviarConfirmacaoEncomenda, notificarAdminNovaEncomenda } from "@/lib/email/resend";
import { enviarImagemEncomenda, removerFotoProduto } from "@/lib/storage/blob";

type CorpoEncomenda = EncomendaPayload & { website?: unknown };

/**
 * Lê o corpo como multipart (formulário com imagens) ou JSON (sem imagens).
 * Retorna `null` quando o corpo não é válido em nenhum dos formatos.
 */
async function lerCorpo(request: Request): Promise<{ corpo: CorpoEncomenda; imagens: File[] } | null> {
  const tipo = request.headers.get("content-type") ?? "";

  if (tipo.includes("multipart/form-data")) {
    const dados = await request.formData().catch(() => null);
    if (!dados) return null;
    const texto = (campo: string) => {
      const valor = dados.get(campo);
      return typeof valor === "string" ? valor : undefined;
    };
    return {
      corpo: {
        nome: texto("nome"),
        email: texto("email"),
        telefone: texto("telefone"),
        descricao: texto("descricao"),
        website: texto("website"),
      },
      imagens: dados.getAll("imagens").filter((item): item is File => item instanceof File && item.size > 0),
    };
  }

  const corpo = (await request.json().catch(() => null)) as CorpoEncomenda | null;
  if (typeof corpo !== "object" || corpo === null) return null;
  return { corpo, imagens: [] };
}

/**
 * Pedido de encomenda sob medida (público — sem sessão). Grava no MongoDB,
 * avisa o admin e confirma o recebimento ao cliente. Os e-mails são
 * best-effort: falha de envio nunca invalida uma encomenda já gravada.
 */
export async function POST(request: Request) {
  const lido = await lerCorpo(request);

  if (!lido) {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const { corpo, imagens } = lido;

  // Campo-armadilha ("website") escondido no formulário: humanos não o preenchem.
  // Responde como sucesso para não dar pista ao robô, mas não grava nem envia nada.
  if (typeof corpo.website === "string" && corpo.website.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const erros = validarEncomenda(corpo);
  const erroImagens = validarImagensEncomenda(imagens);
  if (erroImagens) erros.imagens = erroImagens;
  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erros }, { status: 400 });
  }

  let urlsImagens: string[];
  try {
    urlsImagens = await Promise.all(imagens.map((arquivo) => enviarImagemEncomenda(arquivo)));
  } catch (erro) {
    console.error("Falha ao enviar imagens da encomenda:", erro);
    return NextResponse.json(
      { erro: "Não foi possível salvar as imagens. Tente de novo em instantes." },
      { status: 502 }
    );
  }

  let encomenda;
  try {
    encomenda = await criarEncomenda({
      nome: corpo.nome as string,
      email: corpo.email as string,
      telefone: corpo.telefone as string,
      descricao: corpo.descricao as string,
      ...(urlsImagens.length > 0 ? { imagens: urlsImagens } : {}),
    });
  } catch (erro) {
    // Encomenda não gravada: as imagens já enviadas ficariam órfãs no Blob.
    await Promise.allSettled(urlsImagens.map((url) => removerFotoProduto(url)));
    throw erro;
  }

  await Promise.all([notificarAdminNovaEncomenda(encomenda), enviarConfirmacaoEncomenda(encomenda)]);

  return NextResponse.json({ ok: true }, { status: 201 });
}
