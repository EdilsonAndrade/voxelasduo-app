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
 * categoria não os marca como obrigatórios (EDI-96). São atributos
 * **informativos** (aparecem em "Características do produto" para o
 * comprador) — não são o campo que o Mercado Livre usa para calcular o
 * frete de fato (ver `dimensoesEnvioParaFrete` em `anuncios.ts`), mas ainda
 * assim devem ser enviados como número puro, sem unidade no valor (ex:
 * `"65"`, nunca `"65 g"`) — a FAQ oficial do Mercado Livre
 * ("Itens — Atributos de envio e dimensões") documenta o erro
 * `item.attribute.invalid.seller.package.dimensions` para valores com texto
 * de unidade embutido.
 */
export function atributosEmbalagem(embalagem: EmbalagemEnvio): AtributoItem[] {
  return [
    { id: "SELLER_PACKAGE_WEIGHT", value_name: String(embalagem.pesoGramas) },
    { id: "SELLER_PACKAGE_HEIGHT", value_name: String(embalagem.alturaCm) },
    { id: "SELLER_PACKAGE_WIDTH", value_name: String(embalagem.larguraCm) },
    { id: "SELLER_PACKAGE_LENGTH", value_name: String(embalagem.comprimentoCm) },
  ];
}

/**
 * Formata as dimensões da embalagem no formato `"AxBxC,peso"` (comprimento x
 * largura x altura em cm, peso em gramas) usado pelo campo `shipping.dimensions`
 * do item — o campo que efetivamente alimenta o cálculo de frete do Mercado
 * Livre (confirmado em produção: os atributos `SELLER_PACKAGE_*` sozinhos
 * **não** mudam o frete cotado ao comprador, só aparecem como informação do
 * produto). A ordem dos eixos segue a convenção mais comum documentada por
 * integradores do Mercado Livre — a FAQ oficial não especifica a ordem
 * exata; validar empiricamente após publicar/atualizar um item real e
 * ajustar se necessário (mesmo padrão de descoberta já usado neste
 * projeto).
 */
export function dimensoesEnvioParaFrete(embalagem: EmbalagemEnvio): string {
  return `${embalagem.comprimentoCm}x${embalagem.larguraCm}x${embalagem.alturaCm},${embalagem.pesoGramas}`;
}
