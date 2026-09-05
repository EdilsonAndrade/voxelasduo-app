import type { Produto } from "@/lib/models/produto";
import { obterAccessTokenValido } from "./auth";
import { erroMercadoLivre } from "./erros";

interface ValorAtributoCategoria {
  id: string;
  name: string;
}

interface AtributoCategoria {
  id: string;
  value_type: string;
  tags?: { required?: boolean };
  values?: ValorAtributoCategoria[];
}

export interface AtributoItem {
  id: string;
  value_id?: string;
  value_name?: string;
}

/**
 * Alguns domínios do Mercado Livre (ex: "decorations", descoberto testando
 * em produção) exigem atributos obrigatórios da categoria mesmo no modelo
 * "User Products" — o próprio Mercado Livre usa esses atributos para montar
 * o título do anúncio (research.md #4); sem eles, `POST /items` falha com
 * "attributes are required" ao tentar gerar o título. Busca os atributos
 * marcados como obrigatórios (`tags.required`) na categoria já resolvida.
 */
export async function buscarAtributosObrigatorios(
  categoryId: string
): Promise<AtributoCategoria[]> {
  const token = await obterAccessTokenValido();
  const resposta = await fetch(
    `https://api.mercadolibre.com/categories/${categoryId}/attributes`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!resposta.ok) {
    throw await erroMercadoLivre(
      resposta,
      "Falha ao consultar atributos da categoria no Mercado Livre"
    );
  }

  const atributos = (await resposta.json()) as AtributoCategoria[];
  return atributos.filter((atributo) => atributo.tags?.required);
}

const PADRAO_GENERICO = /gen[eé]ric|n[aã]o especificad|outr[oa]|sem marca/i;

/**
 * Melhor esforço para preencher um atributo obrigatório sem intervenção
 * manual: para listas fechadas (ex: marca), procura uma opção genérica
 * ("Genérica", "Não especificado"); sem opção assim, usa a primeira da
 * lista. Para atributos de texto livre, reaproveita o nome do produto.
 */
export function valorPadraoAtributo(atributo: AtributoCategoria, produto: Produto): AtributoItem {
  if (atributo.value_type === "list" && atributo.values && atributo.values.length > 0) {
    const generico = atributo.values.find((valor) => PADRAO_GENERICO.test(valor.name));
    return { id: atributo.id, value_id: (generico ?? atributo.values[0]).id };
  }

  return { id: atributo.id, value_name: produto.nome };
}
