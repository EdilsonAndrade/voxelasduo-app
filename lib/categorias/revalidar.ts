import { revalidatePath } from "next/cache";

/** Filtros da vitrine, títulos de categoria e cards mudam com qualquer alteração de categoria (EDI-123). */
export function revalidarVitrine(): void {
  revalidatePath("/");
  revalidatePath("/produtos", "layout");
}
