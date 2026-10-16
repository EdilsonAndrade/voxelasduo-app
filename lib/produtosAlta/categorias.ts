import { CATEGORIAS_NICHO } from "@/lib/nichos/categorias";
import type { CategoriaNavegavel } from "@/lib/models/produtosAlta";
import { ErroCategoriaInvalida } from "./erros";

const IDS_NICHO = new Set(CATEGORIAS_NICHO.map((c) => c.id));

/** `categoria` está abaixo de `ancestralId` na árvore do ML (ou é ela mesma). */
export function ehDescendente(categoria: CategoriaNavegavel, ancestralId: string): boolean {
  return categoria.id === ancestralId || categoria.caminho.some((c) => c.id === ancestralId);
}

/** Uma das 16 categorias 3D ou uma subcategoria delas (data-model.md). */
export function categoriaPermitida(categoria: CategoriaNavegavel): boolean {
  return IDS_NICHO.has(categoria.id) || categoria.caminho.some((c) => IDS_NICHO.has(c.id));
}

/**
 * Carrega e valida a categoria pedida. Id vazio, inexistente no ML (400/404)
 * ou fora das 16 categorias 3D → `ErroCategoriaInvalida` (400); demais falhas
 * do ML seguem como estão (status real na aba Network).
 */
export async function validarCategoria(
  id: string,
  carregar: (id: string) => Promise<CategoriaNavegavel>
): Promise<CategoriaNavegavel> {
  if (!/^MLB\d+$/.test(id)) throw new ErroCategoriaInvalida();

  let categoria: CategoriaNavegavel;
  try {
    categoria = await carregar(id);
  } catch (erro) {
    if (erro instanceof Error && /\(HTTP (400|404)\)/.test(erro.message)) throw new ErroCategoriaInvalida();
    throw erro;
  }

  if (!categoriaPermitida(categoria)) throw new ErroCategoriaInvalida();
  return categoria;
}
