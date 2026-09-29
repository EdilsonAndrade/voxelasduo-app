import { del, put } from "@vercel/blob";

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5MB

export class ArquivoInvalidoError extends Error {}

export async function enviarFotoProduto(arquivo: File): Promise<string> {
  return enviarImagem(arquivo, "produtos");
}

/** Imagens dos banners da home (EDI-114) — mesmas regras das fotos de produto, pasta própria. */
export async function enviarImagemBanner(arquivo: File): Promise<string> {
  return enviarImagem(arquivo, "banners");
}

async function enviarImagem(arquivo: File, pasta: "produtos" | "banners"): Promise<string> {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    throw new ArquivoInvalidoError(
      "Formato de imagem não suportado. Envie um arquivo JPEG, PNG ou WebP."
    );
  }

  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new ArquivoInvalidoError("A imagem deve ter no máximo 5MB.");
  }

  const resultado = await put(`${pasta}/${crypto.randomUUID()}-${arquivo.name}`, arquivo, {
    access: "public",
    addRandomSuffix: false,
  });

  return resultado.url;
}

export async function removerFotoProduto(url: string): Promise<void> {
  await del(url);
}
