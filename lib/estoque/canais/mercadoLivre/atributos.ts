import type { EmbalagemEnvio, Produto } from "@/lib/models/produto";
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
 * lista. Para atributos de texto livre, reaproveita o nome do produto —
 * **exceto** `BRAND`, que usa um valor genérico fixo (EDI-95): produtos sem
 * marca real não devem ter "Marca" preenchida com o próprio nome do
 * produto, o que fazia "Marca" e "Modelo" saírem idênticos quando ambos são
 * atributos obrigatórios de texto livre na mesma categoria (bug observado em
 * produção).
 */
export function valorPadraoAtributo(atributo: AtributoCategoria, produto: Produto): AtributoItem {
  if (atributo.value_type === "list" && atributo.values && atributo.values.length > 0) {
    const generico = atributo.values.find((valor) => PADRAO_GENERICO.test(valor.name));
    return { id: atributo.id, value_id: (generico ?? atributo.values[0]).id };
  }

  if (atributo.id === "BRAND") {
    return { id: atributo.id, value_name: "Genérica" };
  }

  return { id: atributo.id, value_name: produto.nome };
}

/**
 * Monta os atributos de peso/dimensões da embalagem pronta para envio
 * (`SELLER_PACKAGE_WEIGHT/HEIGHT/WIDTH/LENGTH`), a partir dos dados
 * informados pelo vendedor — enviados na publicação mesmo quando a
 * categoria não os marca como obrigatórios (EDI-96). É por esses atributos
 * que o Mercado Livre conhece o tamanho real do pacote (o campo
 * `shipping.dimensions` do item é ignorado nesta conta/modelo — ver
 * research.md #2).
 *
 * O valor **precisa** vir com a unidade junto (`"65 g"`, `"16 cm"`): esses
 * atributos são do tipo `number_unit`, e enviar só o número (`"65"`) faz o
 * Mercado Livre **descartar o atributo silenciosamente**, sem erro algum —
 * confirmado em produção comparando dois anúncios do mesmo produto (um
 * publicado com unidade, que gravou os atributos; outro sem unidade, que
 * saiu sem nenhum atributo de embalagem).
 */
export function atributosEmbalagem(embalagem: EmbalagemEnvio): AtributoItem[] {
  return [
    { id: "SELLER_PACKAGE_WEIGHT", value_name: `${embalagem.pesoGramas} g` },
    { id: "SELLER_PACKAGE_HEIGHT", value_name: `${embalagem.alturaCm} cm` },
    { id: "SELLER_PACKAGE_WIDTH", value_name: `${embalagem.larguraCm} cm` },
    { id: "SELLER_PACKAGE_LENGTH", value_name: `${embalagem.comprimentoCm} cm` },
  ];
}
