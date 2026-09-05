# Contrato: API de Estoque e Sincronização Multicanal

Base path: `/api/estoque`. Todas as respostas em JSON.

## `GET|POST /api/estoque/sincronizar`

Reprocessa a fila de sincronização (`sincronizacoesEstoque`) — itens com `status: "pendente"` e `proximaTentativaEm <= agora`. O Vercel Cron dispara via `GET` (comportamento padrão da plataforma, com o header `Authorization: Bearer $CRON_SECRET` adicionado automaticamente quando a env var `CRON_SECRET` está configurada); `POST` fica disponível para disparo manual pelo responsável da loja, com a mesma autenticação.

**Autenticação**: header `Authorization: Bearer <CRON_SECRET>` — mesmo padrão de proteção de rotas de cron da Vercel (evita disparo por terceiros que descubram a URL).

**Processamento**:

- Para cada item elegível: busca o produto atual, chama `atualizarQuantidade` do client do canal correspondente.
- Sucesso → `status: "sincronizado"`.
- Falha e `tentativas < máximo` → `tentativas++`, recalcula `proximaTentativaEm` (backoff).
- Falha e `tentativas >= máximo` → `status: "falhou"`.

**Respostas**:

- `200`: `{ "processados": 5, "sincronizados": 4, "falharam": 1 }`.
- `401`: segredo do cron ausente/inválido.

## `GET /api/estoque/pendencias`

Lista produtos com sincronização pendente/falha ou inconsistência de estoque não resolvida, para o responsável da loja acompanhar sem consultar o banco diretamente (FR-009/FR-010, SC-005).

**Resposta `200`**:

```json
{
  "sincronizacoes": [
    {
      "produtoId": "674b2...",
      "nomeProduto": "Vaso Geométrico Pequeno",
      "canal": "mercado_livre",
      "status": "falhou",
      "tentativas": 5,
      "ultimoErro": "token expirado",
      "atualizadoEm": "2026-09-04T18:00:00.000Z"
    }
  ],
  "inconsistenciasEstoque": [
    {
      "produtoId": "674b2...",
      "nomeProduto": "Vaso Geométrico Pequeno",
      "pedidoId": "674b3...",
      "quantidadeSolicitada": 2,
      "motivo": "estoque_insuficiente",
      "criadoEm": "2026-09-04T18:05:00.000Z"
    }
  ]
}
```

## Função interna reutilizável (sem rota própria — contrato de código)

`sincronizarEstoqueProduto(produtoId: string): Promise<void>` (`lib/estoque/sincronizacao.ts`):

- Lê o produto atual (`estoque`, `integracoes`).
- Para cada canal em `["mercado_livre", "shopee"]`: se houver credencial de ambiente **e** `integracoes.<canal>` presente, cria/atualiza um item em `sincronizacoesEstoque` e tenta chamar o client do canal imediatamente.
- Canal sem credencial ou sem mapeamento no produto: ignorado silenciosamente (FR-007) — não gera item de fila.
- Nunca lança exceção para quem chamou (falha vira item `"pendente"`/`"falhou"` na fila, não uma exception propagada) — quem chama (webhook ou rota de retentativa) nunca trava por causa de um canal externo.

## Pontos afetados sem contrato JSON próprio (listados por completude)

- `lib/pagamentos/repository.ts` → `promoverPedidoSeAprovado`: passa a chamar `abaterEstoquePedido(pedido)` (`lib/estoque/abatimento.ts`) quando `modifiedCount === 1`.
- Formulário de edição de produto (admin, Tarefa 2): ganha dois campos opcionais (`integracoes.mercadoLivreId`, `integracoes.shopeeItemId`) no `PATCH /api/produtos/[id]` já existente.
