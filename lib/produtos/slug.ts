const MARCAS_DIACRITICAS = new RegExp("[̀-ͯ]", "g");

/** Normaliza o nome de um produto em um slug de URL (minusculas, sem acentos, hifen). */
export function gerarSlug(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(MARCAS_DIACRITICAS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
