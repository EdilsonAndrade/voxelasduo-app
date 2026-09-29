import {
  LIMITE_DESCRICAO_META,
  LIMITE_TITULO_META,
  type Produto,
} from "@/lib/models/produto";
import { urlAbsoluta } from "@/lib/site/url";

/**
 * Feed do catálogo da Meta (Facebook/Instagram Shop) — EDI-109. Gerado a cada
 * leitura a partir dos produtos marcados; ver
 * specs/022-meta-catalogo-facebook/contracts/feed-meta.md.
 */

export const COLUNAS_FEED_META = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "additional_image_link",
  "brand",
  "product_type",
] as const;

export type ItemFeedMeta = Record<(typeof COLUNAS_FEED_META)[number], string>;

const MARCA = "VoxelasDuo";
/** Limite de fotos adicionais aceito pela Meta. */
const LIMITE_FOTOS_ADICIONAIS = 20;

function truncar(texto: string, limite: number): string {
  // Array.from conta por code point, para não partir emojis ao meio.
  const caracteres = Array.from(texto);
  return caracteres.length > limite ? caracteres.slice(0, limite).join("") : texto;
}

function textoPreenchido(valor: string | undefined): string | undefined {
  const texto = valor?.trim();
  return texto ? texto : undefined;
}

/** Centavos → "39.90 BRL" (formato de preço da Meta). */
export function formatarPrecoMeta(centavos: number): string {
  return `${(centavos / 100).toFixed(2)} BRL`;
}

/** Item do feed de um produto, ou `null` quando ele não deve constar (não marcado ou sem foto). */
export function montarItemFeedMeta(produto: Produto, base: string): ItemFeedMeta | null {
  if (produto.metaCatalogo?.publicar !== true || !produto._id) return null;

  const fotos = produto.fotos.filter((foto) => foto.trim().length > 0);
  if (fotos.length === 0) return null;

  const titulo = textoPreenchido(produto.metaCatalogo.titulo) ?? produto.nome.trim();
  const descricao =
    textoPreenchido(produto.metaCatalogo.descricao) ??
    textoPreenchido(produto.descricao) ??
    produto.nome.trim();

  const caminho = `/produtos/${encodeURIComponent(produto.categoria)}/${encodeURIComponent(produto.slug)}`;

  return {
    id: produto._id.toString(),
    title: truncar(titulo, LIMITE_TITULO_META),
    description: truncar(descricao, LIMITE_DESCRICAO_META),
    availability: produto.estoque > 0 ? "in stock" : "out of stock",
    condition: "new",
    price: formatarPrecoMeta(produto.preco),
    link: urlAbsoluta(caminho, base),
    image_link: urlAbsoluta(fotos[0], base),
    additional_image_link: fotos
      .slice(1, 1 + LIMITE_FOTOS_ADICIONAIS)
      .map((foto) => urlAbsoluta(foto, base))
      .join(","),
    brand: MARCA,
    product_type: produto.categoria,
  };
}

/** Escapa um campo CSV (RFC 4180): aspas quando há vírgula, aspas ou quebra de linha. */
function campoCsv(valor: string): string {
  return /[",\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

/** CSV completo do feed — só o cabeçalho quando nenhum produto está marcado. */
export function gerarCsvFeedMeta(produtos: Produto[], base: string): string {
  const linhas = [COLUNAS_FEED_META.join(",")];

  for (const produto of produtos) {
    const item = montarItemFeedMeta(produto, base);
    if (item) {
      linhas.push(COLUNAS_FEED_META.map((coluna) => campoCsv(item[coluna])).join(","));
    }
  }

  return `${linhas.join("\r\n")}\r\n`;
}
