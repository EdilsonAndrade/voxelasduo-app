import { obterAccessTokenValido } from "./auth";
import { erroMercadoLivre } from "./erros";

interface DomainDiscoveryResultado {
  category_id: string;
}

/**
 * Descobre automaticamente a categoria (subcategoria válida para `POST
 * /items`, nunca uma categoria raiz) a partir do título do produto, usando
 * o previsor de categorias do Mercado Livre (`domain_discovery/search`) —
 * decisão revisada em research.md #5 após uma categoria fixa de nível 1
 * (`MLB1574`) ser rejeitada em produção. Retorna `undefined` quando o
 * previsor não encontra nenhuma correspondência.
 */
export async function preverCategoriaMercadoLivre(titulo: string): Promise<string | undefined> {
  const token = await obterAccessTokenValido();

  const resposta = await fetch(
    `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?limit=1&q=${encodeURIComponent(titulo)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!resposta.ok) {
    throw await erroMercadoLivre(resposta, "Falha ao consultar o previsor de categorias do Mercado Livre");
  }

  const resultados = (await resposta.json()) as DomainDiscoveryResultado[];
  return resultados[0]?.category_id;
}
