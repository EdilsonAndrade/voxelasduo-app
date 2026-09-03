import { del, put } from "@vercel/blob";

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5MB

export class ArquivoInvalidoError extends Error {}

export async function enviarFotoProduto(arquivo: File): Promise<string> {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    throw new ArquivoInvalidoError(
      "Formato de imagem não suportado. Envie um arquivo JPEG, PNG ou WebP."
    );
  }

  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new ArquivoInvalidoError("A imagem deve ter no máximo 5MB.");
  }

  const resultado = await put(`produtos/${crypto.randomUUID()}-${arquivo.name}`, arquivo, {
    access: "public",
    addRandomSuffix: false,
  });

  return resultado.url;
}

export async function removerFotoProduto(url: string): Promise<void> {
  await del(url);
}
