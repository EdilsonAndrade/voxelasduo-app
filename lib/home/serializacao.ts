import type { SecaoHome } from "@/lib/models/secaoHome";
import type { DadosSecaoHome } from "@/lib/home/validation";

/**
 * Campos editáveis de uma seção salva, sem `_id`/`ordem`/datas/`produtoIds`
 * (ObjectId e Date não atravessam para client components) — base do
 * formulário do admin e do merge do PUT.
 */
export function dadosEditaveis(secao: SecaoHome): DadosSecaoHome {
  const dados: Record<string, unknown> = { ...secao };
  for (const campo of ["_id", "ordem", "criadoEm", "atualizadoEm", "produtoIds"]) delete dados[campo];
  return dados as unknown as DadosSecaoHome;
}
