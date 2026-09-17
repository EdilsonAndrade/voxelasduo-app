import type { EmbalagemEnvio, FichaTecnicaProduto, Produto } from "@/lib/models/produto";
import { obterAccessTokenValido } from "./auth";
import { erroMercadoLivre } from "./erros";

interface ValorAtributoCategoria {
  id: string;
  name: string;
}

export interface AtributoCategoria {
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
 * Busca todos os atributos aceitos por uma categoria (obrigatórios e
 * opcionais) — usada tanto por `buscarAtributosObrigatorios` (Marca/Modelo,
 * EDI-95) quanto por `atributosFichaTecnica` (EDI-90, que precisa saber se a
 * categoria expõe `HEIGHT`/`WIDTH`/`LENGTH`/`WEIGHT`/`MATERIAL` mesmo sendo
 * atributos opcionais).
 */
export async function buscarAtributosCategoria(categoryId: string): Promise<AtributoCategoria[]> {
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

  return (await resposta.json()) as AtributoCategoria[];
}

/**
 * Alguns domínios do Mercado Livre (ex: "decorations", descoberto testando
 * em produção) exigem atributos obrigatórios da categoria mesmo no modelo
 * "User Products" — o próprio Mercado Livre usa esses atributos para montar
 * o título do anúncio (research.md #4); sem eles, `POST /items` falha com
 * "attributes are required" ao tentar gerar o título. Filtra os atributos
 * marcados como obrigatórios (`tags.required`) na categoria já resolvida.
 */
export async function buscarAtributosObrigatorios(
  categoryId: string
): Promise<AtributoCategoria[]> {
  const atributos = await buscarAtributosCategoria(categoryId);
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

export interface ResultadoFichaTecnica {
  /** Atributos a enviar no item — só os campos preenchidos cuja categoria expõe o atributo correspondente. */
  attributes: AtributoItem[];
  /** Campos preenchidos sem atributo correspondente na categoria — vão para a descrição complementar. */
  paraDescricao: Array<{ rotulo: string; valor: string }>;
}

/**
 * Campos numéricos da ficha técnica que mapeiam para um atributo
 * `number_unit` do produto em si (research.md #1) — distintos dos
 * `SELLER_PACKAGE_*` da embalagem de envio (EDI-96). O valor **precisa** vir
 * com a unidade junto (`"20 cm"`, não `"20"`): testado via
 * `POST /items/validate`, sem unidade o Mercado Livre descarta o atributo
 * com o aviso `item.attributes.omitted` (research.md #2).
 */
const CAMPOS_NUMERICOS_FICHA_TECNICA: Record<
  "alturaCm" | "larguraCm" | "comprimentoCm" | "pesoGramas",
  { atributoId: string; unidade: string; rotulo: string }
> = {
  alturaCm: { atributoId: "HEIGHT", unidade: "cm", rotulo: "Altura" },
  larguraCm: { atributoId: "WIDTH", unidade: "cm", rotulo: "Largura" },
  comprimentoCm: { atributoId: "LENGTH", unidade: "cm", rotulo: "Comprimento" },
  pesoGramas: { atributoId: "WEIGHT", unidade: "g", rotulo: "Peso" },
};

/**
 * Mapeia a ficha técnica do produto (EDI-90) para atributos do Mercado
 * Livre quando a categoria os expõe (`HEIGHT`/`WIDTH`/`LENGTH`/`WEIGHT`/
 * `MATERIAL`, research.md #1) — cada campo é checado individualmente contra
 * `atributosCategoria` (todos os atributos da categoria, não só os
 * obrigatórios: esses são opcionais). Campos sem atributo correspondente
 * (sempre o caso de `itensInclusos`, que não tem atributo padrão em nenhuma
 * categoria testada) vão para `paraDescricao`, para quem chama decidir como
 * complementar a descrição do anúncio.
 *
 * `MATERIAL` é enviado como `value_name` (texto livre) mesmo quando o valor
 * não está entre as sugestões da categoria — `value_type` é `"string"`, não
 * `"list"`, então não exige `value_id` (research.md #3, confirmado via
 * `POST /items/validate`).
 */
export function atributosFichaTecnica(
  fichaTecnica: FichaTecnicaProduto,
  atributosCategoria: AtributoCategoria[]
): ResultadoFichaTecnica {
  const idsCategoria = new Set(atributosCategoria.map((atributo) => atributo.id));
  const attributes: AtributoItem[] = [];
  const paraDescricao: Array<{ rotulo: string; valor: string }> = [];

  for (const chave of Object.keys(CAMPOS_NUMERICOS_FICHA_TECNICA) as Array<
    keyof typeof CAMPOS_NUMERICOS_FICHA_TECNICA
  >) {
    const numero = fichaTecnica[chave];
    if (numero === undefined) continue;

    const { atributoId, unidade, rotulo } = CAMPOS_NUMERICOS_FICHA_TECNICA[chave];
    const valor = `${numero} ${unidade}`;
    if (idsCategoria.has(atributoId)) {
      attributes.push({ id: atributoId, value_name: valor });
    } else {
      paraDescricao.push({ rotulo, valor });
    }
  }

  if (fichaTecnica.material !== undefined) {
    if (idsCategoria.has("MATERIAL")) {
      attributes.push({ id: "MATERIAL", value_name: fichaTecnica.material });
    } else {
      paraDescricao.push({ rotulo: "Material", valor: fichaTecnica.material });
    }
  }

  if (fichaTecnica.itensInclusos && fichaTecnica.itensInclusos.length > 0) {
    paraDescricao.push({
      rotulo: "Itens inclusos",
      valor: fichaTecnica.itensInclusos.join(", "),
    });
  }

  return { attributes, paraDescricao };
}
