import type { Produto } from "@/lib/models/produto";
import { obterAccessTokenValido } from "./auth";
import { centavosParaReais } from "./client";
import { resolverCategoriaMercadoLivre } from "./categorias";

/**
 * Tipo de anúncio padrão usado na criação — precisa corresponder a um tipo
 * disponível para a conta vendedora vinculada (`GET /users/{id}` retorna
 * `listing_types_allowed`); ajustar aqui se a conta não tiver "gold_special".
 */
const LISTING_TYPE_ID = "gold_special";

/**
 * Envia uma foto já pública (Vercel Blob) para o Mercado Livre por URL —
 * o Mercado Livre busca a imagem diretamente, sem o servidor da aplicação
 * precisar baixar e reenviar bytes (research.md #3). Retorna o id da imagem,
 * usado no `pictures` da criação do anúncio.
 */
export async function enviarImagem(urlPublica: string): Promise<string> {
  const token = await obterAccessTokenValido();

  const form = new FormData();
  form.append("source", urlPublica);

  const resposta = await fetch("https://api.mercadolibre.com/pictures/items/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!resposta.ok) {
    throw new Error(`Falha ao enviar imagem para o Mercado Livre (HTTP ${resposta.status}).`);
  }

  const dados = (await resposta.json()) as { id: string };
  return dados.id;
}

/**
 * Cria o anúncio no Mercado Livre a partir do produto (US1): resolve a
 * categoria (research.md #5), envia as fotos e publica título, preço,
 * estoque e descrição. Retorna o `item_id` criado — quem chama é
 * responsável por gravá-lo em `produto.integracoes.mercadoLivreId`
 * (contracts/mercado-livre-api.md).
 */
export async function criarAnuncio(produto: Produto): Promise<string> {
  const categoryId = resolverCategoriaMercadoLivre(produto.categoria);
  if (!categoryId) {
    throw new Error(`Categoria "${produto.categoria}" sem mapeamento para o Mercado Livre.`);
  }

  const token = await obterAccessTokenValido();
  const pictureIds = await Promise.all(produto.fotos.map((url) => enviarImagem(url)));

  const respostaItem = await fetch("https://api.mercadolibre.com/items", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: produto.nome,
      category_id: categoryId,
      price: centavosParaReais(produto.preco),
      currency_id: "BRL",
      available_quantity: produto.estoque,
      condition: "new",
      listing_type_id: LISTING_TYPE_ID,
      pictures: pictureIds.map((id) => ({ id })),
    }),
  });

  if (!respostaItem.ok) {
    throw new Error(`Falha ao criar anúncio no Mercado Livre (HTTP ${respostaItem.status}).`);
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
    throw new Error(
      `Anúncio criado (${item.id}), mas falha ao definir a descrição no Mercado Livre (HTTP ${respostaDescricao.status}).`
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
    throw new Error(`Falha ao despublicar anúncio no Mercado Livre (HTTP ${resposta.status}).`);
  }
}
