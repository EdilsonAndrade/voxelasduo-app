import type { Produto } from "@/lib/models/produto";
import { obterAccessTokenValido } from "./auth";
import { centavosParaReais } from "./client";
import { montarConsultaPrevisor, resolverCategoriaMercadoLivre } from "./categorias";
import { preverCategoriaMercadoLivre } from "./previsorCategoria";
import { buscarAtributosObrigatorios, valorPadraoAtributo } from "./atributos";
import { erroMercadoLivre } from "./erros";

/**
 * Tipo de anúncio padrão usado na criação — precisa corresponder a um tipo
 * disponível para a conta vendedora vinculada (`GET /users/{id}` retorna
 * `listing_types_allowed`); ajustar aqui se a conta não tiver "gold_special".
 */
const LISTING_TYPE_ID = "gold_special";

/**
 * Cria o anúncio no Mercado Livre a partir do produto (US1): resolve a
 * categoria (override manual ou previsor automático, research.md #5) e
 * publica título, preço, estoque, fotos e descrição. Retorna o `item_id`
 * criado — quem chama é responsável por gravá-lo em
 * `produto.integracoes.mercadoLivreId` (contracts/mercado-livre-api.md).
 *
 * As fotos são enviadas como `pictures: [{ source: url }]` direto no corpo
 * de criação do item — o Mercado Livre busca cada URL pública sozinho
 * (research.md #3). **Não existe upload de imagem por URL em endpoint
 * separado**: `POST /pictures/items/upload` só aceita arquivo binário
 * (`multipart/form-data` com campo `file`), rejeitando `source` com HTTP 400
 * (descoberto durante o teste em produção — corrigido aqui).
 */
export async function criarAnuncio(produto: Produto): Promise<string> {
  const categoryId =
    resolverCategoriaMercadoLivre(produto.categoria) ??
    (await preverCategoriaMercadoLivre(montarConsultaPrevisor(produto.categoria, produto.nome)));
  if (!categoryId) {
    throw new Error(
      `Não foi possível determinar uma categoria do Mercado Livre para "${produto.categoria}"/"${produto.nome}".`
    );
  }

  const token = await obterAccessTokenValido();

  // Alguns domínios (ex: "decorations", verificado em produção) exigem
  // atributos obrigatórios da categoria mesmo no modelo "User Products" —
  // sem eles, o Mercado Livre falha ao tentar montar o título automático a
  // partir de `family_name` (research.md #4).
  const atributosObrigatorios = await buscarAtributosObrigatorios(categoryId);
  const attributes = atributosObrigatorios.map((atributo) =>
    valorPadraoAtributo(atributo, produto)
  );

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

  const item = (await respostaItem.json()) as { id: string };

  // A descrição é um recurso separado na API do Mercado Livre — precisa de uma segunda chamada.
  const respostaDescricao = await fetch(
    `https://api.mercadolibre.com/items/${item.id}/description`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plain_text: produto.descricao }),
    }
  );

  if (!respostaDescricao.ok) {
    throw await erroMercadoLivre(
      respostaDescricao,
      `Anúncio criado (${item.id}), mas falha ao definir a descrição no Mercado Livre`
    );
  }

  return item.id;
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
