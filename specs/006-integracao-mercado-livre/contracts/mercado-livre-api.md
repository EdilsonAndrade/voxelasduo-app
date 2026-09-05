# Contrato: API de Anúncios e Pedidos do Mercado Livre

Base path: `/api`. Todas as respostas em JSON. Reaproveita a autenticação OAuth2/renovação de token do Mercado Livre já implementada na Tarefa 5 (`lib/estoque/canais/mercadoLivre/auth.ts`) sem mudanças.

## `POST /api/produtos/[id]/mercado-livre/publicar`

Cria o anúncio no Mercado Livre a partir do produto (US1). Requer que o produto ainda não tenha `integracoes.mercadoLivreId`.

**Processamento**:

1. Resolve `category_id` a partir de `produto.categoria` (mapeamento estático, research.md #5). Sem correspondência → registra falha em `publicacoesCanalFalhas` (`operacao: "criar"`) e retorna erro.
2. Envia cada `produto.fotos[]` para `POST /pictures/items/upload` do Mercado Livre com `source` = URL pública (research.md #3), coletando os IDs de imagem retornados.
3. Cria o anúncio (`POST /items`) com `title`, `description`, `price`, `currency_id: "BRL"`, `available_quantity: produto.estoque`, `condition: "new"`, `category_id`, `pictures` (IDs do passo 2).
4. Sucesso → grava `item_id` retornado em `produto.integracoes.mercadoLivreId`.
5. Qualquer falha nos passos 2-3 → registra em `publicacoesCanalFalhas` (`operacao: "criar"`, motivo da API do Mercado Livre) e retorna erro; nenhum estado parcial é gravado no produto.

**Respostas**:

- `201`: `{ "mercadoLivreId": "MLB1234567890" }`.
- `409`: produto já tem `integracoes.mercadoLivreId` — evita duplicidade (FR-004).
- `422`: falha de publicação (categoria sem mapeamento, foto rejeitada, dado obrigatório ausente) — corpo inclui `{ "erro": "..." }`; detalhe fica registrado em `publicacoesCanalFalhas` para consulta posterior.

## `DELETE /api/produtos/[id]/mercado-livre/publicar`

Despublica o anúncio — adicionado após a implementação, a pedido do usuário, para permitir desfazer publicações de teste antes de validar o fluxo de vendas em produção. A API do Mercado Livre não permite excluir um item na maioria dos casos, então "despublicar" fecha o anúncio (`PUT /items/{id}` com `{ "status": "closed" }`) e limpa `produto.integracoes.mercadoLivreId`, liberando o produto para ser publicado de novo.

**Respostas**:

- `200`: `{ "despublicado": true }`.
- `404`: produto não encontrado.
- `409`: produto não tem `integracoes.mercadoLivreId` (nada para despublicar).
- `422`: falha ao fechar o anúncio no Mercado Livre.

## `GET /api/anuncios/pendencias`

Lista falhas de criação/atualização de anúncio ainda não resolvidas, para o responsável da loja acompanhar sem consultar o banco diretamente (FR-011, SC-005).

**Resposta `200`**:

```json
{
  "falhas": [
    {
      "produtoId": "674b2...",
      "nomeProduto": "Vaso Geométrico Pequeno",
      "canal": "mercado_livre",
      "operacao": "criar",
      "motivo": "categoria sem mapeamento",
      "criadoEm": "2026-09-05T18:00:00.000Z"
    }
  ]
}
```

## `POST /api/webhooks/mercado-livre/pedidos`

Recebe notificações do tópico `orders_v2` do Mercado Livre (US2). Segue o mesmo princípio já aplicado ao webhook do Mercado Pago (Tarefa 4): o corpo da notificação é só um gatilho, os dados de negócio vêm sempre de uma consulta autenticada subsequente.

**Validação**: confere que `application_id` do payload corresponde a `MERCADOLIVRE_CLIENT_ID` configurado (o Mercado Livre não assina notificações com HMAC).

**Processamento**:

1. Extrai o `resource` (ex: `/orders/123456789`) e consulta `GET https://api.mercadolibre.com/orders/123456789` com o access token vigente (renovado automaticamente, Tarefa 5).
2. Para cada item do pedido: resolve `produtoId` via busca reversa em `produtos.integracoes.mercadoLivreId`. Sem correspondência → item vira inconsistência (`estoqueInconsistencias`, motivo `produto_removido`, Tarefa 5) **sem** `produtoId`/`pedidoId` locais (não existe produto a referenciar) — identificado por `origemExterna: { canal, pedidoExternoId, itemIdCanal }` (data-model.md, atualização pós-implementação), sem impedir os demais itens.
3. `findOneAndUpdate` em `pedidos` com `upsert: true`, filtrando por `origemExterna.pedidoExternoId` (idempotência, FR-008; data-model.md #4).
4. Documento novo (primeira notificação) → chama `abaterEstoquePedido(pedido)` (Tarefa 5, sem alteração) → `sincronizarAnuncioProduto(produtoId, { canalOrigem: "mercado_livre" })` para cada item.
5. Documento já existente (reenvio) → nenhum efeito adicional.

**Respostas**:

- `200`: `{ "recebido": true }` — sempre, mesmo quando a notificação não gera efeito (ex: reenvio, `application_id` inválido registrado só em log), seguindo o padrão do Mercado Pago de não fazer o provedor reenviar indefinidamente por um erro que não vai se resolver sozinho.
- `500`: falha transitória ao consultar `GET /orders/{id}` — o Mercado Livre reenvia a notificação depois.

## Função interna reutilizável (sem rota própria — contrato de código)

`sincronizarAnuncioProduto(produtoId: string, pedidoId: ObjectId, opcoes?: { canalOrigem?: Canal }): Promise<void>` (`lib/estoque/sincronizacao.ts`, generaliza `sincronizarEstoqueProduto` da Tarefa 5):

- Mesma lógica de "canal configurado" (credencial + `integracoes.<canal>`) já existente (FR-007, Tarefa 5).
- Envia `available_quantity` **e** `price` no mesmo `PUT /items/{item_id}` (research.md #6) — antes só enviava quantidade.
- Quando `opcoes.canalOrigem` é informado, esse canal é excluído da lista a sincronizar (research.md #8).

## Pontos afetados sem contrato JSON próprio (listados por completude)

- `app/api/produtos/[id]/route.ts` (`PATCH`, Tarefa 2): quando o produto atualizado já tem `integracoes.mercadoLivreId` e `preco` ou `estoque` mudaram, dispara `sincronizarAnuncioProduto` best-effort (mesmo padrão "nunca lança exceção para quem chamou" da Tarefa 5).
- `components/admin/ProdutoForm.tsx` (Tarefa 5): ganha botão "Publicar no Mercado Livre", visível quando `integracoes.mercadoLivreId` está vazio, chamando `POST /api/produtos/[id]/mercado-livre/publicar` (research.md #10); o campo de edição manual do ID permanece disponível.
