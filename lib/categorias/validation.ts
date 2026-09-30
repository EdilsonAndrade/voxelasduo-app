import { gerarSlug } from "@/lib/produtos/slug";

export const LIMITE_NOME_CATEGORIA = 60;

/** Dois nomes são equivalentes quando geram o mesmo endereço — ignora acentos, maiúsculas, espaços e pontuação (research.md #3). */
export function nomesEquivalentes(a: string, b: string): boolean {
  return gerarSlug(a) === gerarSlug(b);
}

/** Valida o nome de uma categoria; retorna a mensagem de erro ou `undefined` quando válido. */
export function validarNomeCategoria(nome: unknown): string | undefined {
  if (typeof nome !== "string" || nome.trim().length === 0) {
    return "Informe o nome da categoria.";
  }
  if (nome.trim().length > LIMITE_NOME_CATEGORIA) {
    return `O nome deve ter no máximo ${LIMITE_NOME_CATEGORIA} caracteres.`;
  }
  if (gerarSlug(nome) === "") {
    return "Use ao menos uma letra ou número no nome.";
  }
  return undefined;
}
