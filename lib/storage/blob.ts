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

/**
 * Imagens de referência enviadas pelo cliente no formulário de /encomendas.
 * O nome do arquivo do visitante é descartado: fica só um UUID + extensão.
 */
export async function enviarImagemEncomenda(arquivo: File): Promise<string> {
  const extensao = arquivo.type.split("/")[1] ?? "jpg";
  return enviarImagem(arquivo, "encomendas", `${crypto.randomUUID()}.${extensao}`);
}

/** Fotos dos itens anotados em eventos presenciais (EDI-125) — já comprimidas no aparelho. */
export async function enviarFotoEvento(arquivo: File): Promise<string> {
  const extensao = arquivo.type.split("/")[1] ?? "jpg";
  return enviarImagem(arquivo, "eventos", `${crypto.randomUUID()}.${extensao}`);
}

/**
 * Miniatura da placa vinda da nuvem da Bambu Lab (EDI-127). Precisa ser
 * copiada para cá: a URL do CDN do fabricante é assinada e expira, e a
 * miniatura é o que permite reconhecer qual peça é cada impressão quando o
 * título vem do perfil de fatiamento.
 */
export async function enviarMiniaturaProducao(
  arquivo: File,
  nome: string
): Promise<string> {
  return enviarImagem(arquivo, "producao", nome);
}

async function enviarImagem(
  arquivo: File,
  pasta: "produtos" | "banners" | "encomendas" | "eventos" | "producao",
  nome = `${crypto.randomUUID()}-${arquivo.name}`
): Promise<string> {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    throw new ArquivoInvalidoError(
      "Formato de imagem não suportado. Envie um arquivo JPEG, PNG ou WebP."
    );
  }

  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new ArquivoInvalidoError("A imagem deve ter no máximo 5MB.");
  }

  const resultado = await put(`${pasta}/${nome}`, arquivo, {
    access: "public",
    addRandomSuffix: false,
  });

  return resultado.url;
}

export async function removerFotoProduto(url: string): Promise<void> {
  await del(url);
}
