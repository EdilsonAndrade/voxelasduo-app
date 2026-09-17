import type { Produto } from "@/lib/models/produto";
import { obterAccessTokenValido } from "./auth";
import { centavosParaReais } from "./client";
import { montarConsultaPrevisor, resolverCategoriaMercadoLivre } from "./categorias";
import { preverCategoriaMercadoLivre } from "./previsorCategoria";
import {
  atributosEmbalagem,
  atributosFichaTecnica,
  buscarAtributosCategoria,
  buscarAtributosObrigatorios,
  valorPadraoAtributo,
} from "./atributos";
import { erroMercadoLivre } from "./erros";

/**
 * Marca o início do bloco complementar de ficha técnica (EDI-90) dentro da
 * descrição do anúncio — usado por `aplicarFichaTecnicaNaDescricao` para
 * localizar e substituir só esse trecho, sem tocar no texto que o vendedor
 * escreveu antes dele.
 */
const MARCADOR_FICHA_TECNICA = "\n\n---\nFicha técnica:\n";

/**
 * Aplica o bloco complementar de ficha técnica ao final de uma descrição,
 * de forma idempotente (FR-007): localiza o marcador já existente e corta
 * tudo a partir dele (preservando o texto original antes), depois concatena
 * o bloco atual — assim, aplicar duas vezes com os mesmos dados produz o
 * mesmo resultado, e o vendedor pode editar a descrição livremente antes do
 * marcador sem que uma atualização futura sobrescreva o que ele escreveu
 * (research.md #4).
 */
export function aplicarFichaTecnicaNaDescricao(
  descricaoAtual: string,
  paraDescricao: Array<{ rotulo: string; valor: string }>
): string {
  const indiceMarcador = descricaoAtual.indexOf(MARCADOR_FICHA_TECNICA);
  const textoOriginal =
    indiceMarcador === -1 ? descricaoAtual : descricaoAtual.slice(0, indiceMarcador);

  if (paraDescricao.length === 0) {
    return textoOriginal;
  }

  const linhas = paraDescricao.map(({ rotulo, valor }) => `- ${rotulo}: ${valor}`);
  return `${textoOriginal}${MARCADOR_FICHA_TECNICA}${linhas.join("\n")}`;
}

/**
 * Tipo de anúncio padrão usado na criação — precisa corresponder a um tipo
 * disponível para a conta vendedora vinculada (`GET /users/{id}` retorna
 * `listing_types_allowed`); ajustar aqui se a conta não tiver "gold_special".
 */
const LISTING_TYPE_ID = "gold_special";

/**
 * Resolve a categoria do Mercado Livre para um produto (override manual ou
 * previsor automático, research.md #5) — reaproveitada tanto na criação do
 * anúncio quanto na correção de atributos de um anúncio já publicado
 * (EDI-95/EDI-96), para nunca divergir da categoria realmente usada.
 */
async function resolverCategoriaOuFalhar(produto: Produto): Promise<string> {
  const categoryId =
    resolverCategoriaMercadoLivre(produto.categoria) ??
    (await preverCategoriaMercadoLivre(montarConsultaPrevisor(produto.categoria, produto.nome)));

  if (!categoryId) {
    throw new Error(
      `Não foi possível determinar uma categoria do Mercado Livre para "${produto.categoria}"/"${produto.nome}".`
    );
  }

  return categoryId;
}

/**
 * Monta os atributos obrigatórios da categoria (Marca/Modelo etc., já com o
 * valor padrão corrigido — EDI-95), os atributos de embalagem quando o
 * produto tiver `embalagemEnvio` configurado (EDI-96), e os atributos de
 * ficha técnica quando o produto tiver `fichaTecnica` configurada (EDI-90)
 * — reaproveitada tanto na criação quanto na correção retroativa de um
 * anúncio já publicado. Os campos de ficha técnica sem atributo
 * correspondente na categoria voltam em `paraDescricao`, para quem chama
 * decidir como complementar a descrição do anúncio.
 */
async function montarAtributos(categoryId: string, produto: Produto) {
  const atributosObrigatorios = await buscarAtributosObrigatorios(categoryId);
  const attributes = atributosObrigatorios.map((atributo) =>
    valorPadraoAtributo(atributo, produto)
  );

  if (produto.embalagemEnvio) {
    attributes.push(...atributosEmbalagem(produto.embalagemEnvio));
  }

  let paraDescricao: Array<{ rotulo: string; valor: string }> = [];
  if (produto.fichaTecnica) {
    const atributosCategoria = await buscarAtributosCategoria(categoryId);
    const resultado = atributosFichaTecnica(produto.fichaTecnica, atributosCategoria);
    attributes.push(...resultado.attributes);
    paraDescricao = resultado.paraDescricao;
  }

  return { attributes, paraDescricao };
}

/**
 * Cria o anúncio no Mercado Livre a partir do produto (US1): resolve a
 * categoria (override manual ou previsor automático, research.md #5) e
 * publica título, preço, estoque, fotos e descrição. Retorna o `item_id` e o
 * `permalink` criados — quem chama é responsável por gravá-los em
 * `produto.integracoes.mercadoLivreId`/`mercadoLivrePermalink`
 * (contracts/mercado-livre-api.md).
 *
 * O `permalink` retornado pela API é usado como está, nunca reconstruído a
 * partir do ID: contas no modelo "User Products" (catálogo) publicam sob uma
 * URL com slug + sufixo `/up/MLBU...` (ID da oferta, diferente do `item.id`),
 * então um padrão `SITE-NUMERO` fixo gera link quebrado.
 *
 * As fotos são enviadas como `pictures: [{ source: url }]` direto no corpo
 * de criação do item — o Mercado Livre busca cada URL pública sozinho
 * (research.md #3). **Não existe upload de imagem por URL em endpoint
 * separado**: `POST /pictures/items/upload` só aceita arquivo binário
 * (`multipart/form-data` com campo `file`), rejeitando `source` com HTTP 400
 * (descoberto durante o teste em produção — corrigido aqui).
 */
export interface AnuncioCriado {
  id: string;
  permalink: string;
}

export async function criarAnuncio(produto: Produto): Promise<AnuncioCriado> {
  const categoryId = await resolverCategoriaOuFalhar(produto);
  const token = await obterAccessTokenValido();

  // Alguns domínios (ex: "decorations", verificado em produção) exigem
  // atributos obrigatórios da categoria mesmo no modelo "User Products" —
  // sem eles, o Mercado Livre falha ao tentar montar o título automático a
  // partir de `family_name` (research.md #4). Inclui também os atributos de
  // embalagem (EDI-96) e de ficha técnica (EDI-90), quando configurados,
  // independentemente de serem obrigatórios pela categoria.
  const { attributes, paraDescricao } = await montarAtributos(categoryId, produto);

  const respostaItem = await fetch("https://api.mercadolibre.com/items", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      // A conta vendedora está no modelo "User Products" (UP) do Mercado
      // Livre: `family_name` (nome genérico que agruparia variações do mesmo
      // produto) é obrigatório e substitui `title` — o Mercado Livre gera o
      // título otimizado do anúncio a partir dele + atributos. Enviar `title`
      // junto é rejeitado ("body.invalid_fields"), e enviar nenhum dos dois é
      // rejeitado ("body.required_fields") — ambos verificados em produção.
      family_name: produto.nome,
      category_id: categoryId,
      price: centavosParaReais(produto.preco),
      currency_id: "BRL",
      available_quantity: produto.estoque,
      condition: "new",
      listing_type_id: LISTING_TYPE_ID,
      pictures: produto.fotos.map((source) => ({ source })),
      attributes,
    }),
  });

  if (!respostaItem.ok) {
    throw await erroMercadoLivre(respostaItem, "Falha ao criar anúncio no Mercado Livre");
  }

  const item = (await respostaItem.json()) as { id: string; permalink: string };

  // A descrição é um recurso separado na API do Mercado Livre — precisa de
  // uma segunda chamada. Quando há campos de ficha técnica sem atributo
  // correspondente na categoria (EDI-90), o bloco complementar é anexado ao
  // final da descrição do produto.
  const descricaoFinal =
    paraDescricao.length > 0
      ? aplicarFichaTecnicaNaDescricao(produto.descricao, paraDescricao)
      : produto.descricao;

  const respostaDescricao = await fetch(
    `https://api.mercadolibre.com/items/${item.id}/description`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plain_text: descricaoFinal }),
    }
  );

  if (!respostaDescricao.ok) {
    throw await erroMercadoLivre(
      respostaDescricao,
      `Anúncio criado (${item.id}), mas falha ao definir a descrição no Mercado Livre`
    );
  }

  return { id: item.id, permalink: item.permalink };
}

/**
 * Fecha o anúncio no Mercado Livre (`status: "closed"`) — a API do Mercado
 * Livre não permite exclusão de item na maioria dos casos (só antes de
 * qualquer venda/visita), então "despublicar" é sempre fechar, nunca
 * excluir de fato. Usado para desfazer uma publicação de teste antes de
 * validar o fluxo de vendas.
 */
export async function despublicarAnuncio(itemId: string): Promise<void> {
  const token = await obterAccessTokenValido();

  const resposta = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: "closed" }),
  });

  if (!resposta.ok) {
    throw await erroMercadoLivre(resposta, "Falha ao despublicar anúncio no Mercado Livre");
  }
}

/**
 * Corrige os atributos de Marca/Modelo (EDI-95), os atributos informativos
 * de embalagem (EDI-96) e os de ficha técnica (EDI-90) de um anúncio **já
 * publicado**, sem despublicar e republicar: a API do Mercado Livre aceita
 * `PUT /items/{id}` parcial, mesmo padrão já usado por `atualizarAnuncio()`
 * (preço/estoque) e `despublicarAnuncio()` (status) — research.md #3.
 *
 * Quando há campos de ficha técnica sem atributo correspondente na
 * categoria, também busca a descrição atual do item (`GET
 * .../description`) e a atualiza (`PUT .../description`) com o bloco
 * complementar aplicado de forma idempotente — sem essa busca prévia, uma
 * segunda correção sobrescreveria o texto que o vendedor tiver editado
 * diretamente no Mercado Livre entre uma atualização e outra
 * (contracts/ficha-tecnica-no-anuncio.md, "Falhas parciais": as duas
 * chamadas são independentes — se a de descrição falhar, os atributos já
 * salvos na primeira chamada permanecem).
 *
 * **Não inclui `shipping.dimensions`**: descoberto em produção que o
 * Mercado Livre rejeita essa alteração num item já ativo com
 * `field_not_updatable` (`"shipping.dimensions is not modifiable"`) —
 * diferente dos atributos, que aceitam `PUT` parcial normalmente. Corrigir
 * o frete de um anúncio já publicado exige despublicar e publicar de novo
 * (`criarAnuncio`, que já envia `shipping.dimensions` na criação); não há
 * hoje uma forma de ajustar só isso num item ativo sem recriar o anúncio
 * (research.md #2/#3).
 */
export async function atualizarAtributosAnuncio(itemId: string, produto: Produto): Promise<void> {
  const categoryId = await resolverCategoriaOuFalhar(produto);
  const { attributes, paraDescricao } = await montarAtributos(categoryId, produto);

  const token = await obterAccessTokenValido();
  const cabecalhos = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const resposta = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
    method: "PUT",
    headers: cabecalhos,
    body: JSON.stringify({ attributes }),
  });

  if (!resposta.ok) {
    throw await erroMercadoLivre(resposta, "Falha ao corrigir atributos do anúncio no Mercado Livre");
  }

  if (paraDescricao.length === 0) return;

  const respostaDescricaoAtual = await fetch(
    `https://api.mercadolibre.com/items/${itemId}/description`,
    { headers: cabecalhos }
  );

  if (!respostaDescricaoAtual.ok) {
    throw await erroMercadoLivre(
      respostaDescricaoAtual,
      "Falha ao consultar a descrição atual do anúncio no Mercado Livre"
    );
  }

  const { plain_text: descricaoAtual } = (await respostaDescricaoAtual.json()) as {
    plain_text: string;
  };

  const respostaDescricao = await fetch(
    `https://api.mercadolibre.com/items/${itemId}/description`,
    {
      method: "PUT",
      headers: cabecalhos,
      body: JSON.stringify({
        plain_text: aplicarFichaTecnicaNaDescricao(descricaoAtual, paraDescricao),
      }),
    }
  );

  if (!respostaDescricao.ok) {
    throw await erroMercadoLivre(
      respostaDescricao,
      "Falha ao corrigir a descrição do anúncio no Mercado Livre"
    );
  }
}
