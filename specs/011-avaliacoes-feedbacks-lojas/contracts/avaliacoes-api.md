# Contrato: API de Avaliações Importadas

Base path: `/api/avaliacoes` e `/api/produtos/[id]/avaliacoes`. Todas as respostas em JSON.

## `GET|POST /api/avaliacoes/importar`

Executa a importação periódica de avaliações (US2) — para cada produto com `integracoes.mercadoLivreId` e/ou `integracoes.shopeeItemId`, busca avaliações novas/alteradas em cada canal configurado e faz upsert em `avaliacoes` (data-model.md). O Vercel Cron dispara via `GET`; `POST` fica disponível para disparo manual pelo responsável da loja, com a mesma autenticação.

**Autenticação**: header `Authorization: Bearer <CRON_SECRET>` — mesmo padrão de `/api/estoque/sincronizar`.

**Processamento**:

- Lista produtos com pelo menos um `integracoes.<canal>` preenchido.
- Para cada produto, para cada canal configurado nele: busca avaliações (research.md #1/#2), faz upsert idempotente por avaliação (FR-003/FR-004).
- Falha ao consultar um canal/produto: registra em `avaliacoesImportacaoFalhas` (FR-006) e segue para o próximo, sem interromper o job (FR-007).

**Respostas**:

- `200`: `{ "produtosProcessados": 12, "avaliacoesImportadas": 5, "avaliacoesAtualizadas": 2, "falharam": 1 }`.
- `401`: segredo do cron ausente/inválido.

## `GET /api/avaliacoes/pendencias`

Lista falhas de importação não resolvidas, para o responsável da loja acompanhar sem consultar o banco diretamente (FR-006, SC-005) — mesmo padrão de `GET /api/anuncios/pendencias`.

**Resposta `200`**:

```json
{
  "falhas": [
    {
      "produtoId": "674b2...",
      "nomeProduto": "Vaso Geométrico Pequeno",
      "canal": "mercado_livre",
      "motivo": "token expirado",
      "criadoEm": "2026-09-07T18:00:00.000Z"
    }
  ]
}
```

`produtoId`/`nomeProduto` ausentes quando a falha é geral do canal (sem produto identificável).

## `GET /api/produtos/[id]/avaliacoes`

Lista paginada de avaliações de um produto, mais recentes primeiro (FR-011) — usada pela seção "avaliações de clientes" da página do produto (US1).

**Query params**: `cursor` (opcional — `_id` da última avaliação já carregada), `limite` (opcional, default 10, máximo 50).

**Resposta `200`**:

```json
{
  "avaliacoes": [
    {
      "canal": "mercado_livre",
      "nota": 5,
      "comentario": "Chegou rápido e é ainda mais bonito ao vivo.",
      "dataAvaliacao": "2026-09-01T12:00:00.000Z"
    },
    {
      "canal": "shopee",
      "nota": 4,
      "comentario": null,
      "dataAvaliacao": "2026-08-28T09:30:00.000Z"
    }
  ],
  "proximoCursor": "674b2a1f9c1234abcd..."
}
```

`proximoCursor: null` quando não há mais páginas. Produto sem nenhuma avaliação: `{ "avaliacoes": [], "proximoCursor": null }` (FR-010 — página trata isso como "sem avaliações ainda", não como erro).

## Função interna reutilizável (sem rota própria — contrato de código)

`importarAvaliacoesProduto(produto: Produto): Promise<{ importadas: number; atualizadas: number; falhas: number }>` (`lib/avaliacoes/importacao.ts`) — `falhas` conta canais cuja busca falhou para este produto, já registrados em `avaliacoesImportacaoFalhas`; usado pela rota de cron (T017) para somar `falharam` sem reconsultar o log:

- Para cada canal em `["mercado_livre", "shopee"]`: se houver credencial de ambiente **e** `integracoes.<canal>` presente no produto, busca as avaliações do anúncio e faz upsert em `avaliacoes`.
- Canal sem credencial ou sem mapeamento no produto: ignorado silenciosamente (FR-005) — mesmo princípio de `sincronizarEstoqueProduto` (Tarefa 5).
- Nunca lança exceção para quem chamou — falha vira registro em `avaliacoesImportacaoFalhas`, não uma exception propagada (FR-007).

## Pontos afetados sem contrato JSON próprio (listados por completude)

- `app/produtos/[categoria]/[slug]/page.tsx`: ganha uma seção "avaliações de clientes" (`components/produtos/AvaliacoesProduto.tsx`), lendo a primeira página via `buscarAvaliacoesProduto` no server e carregando páginas seguintes via `GET /api/produtos/[id]/avaliacoes` (research.md #8).
- `vercel.ts`: ganha uma segunda entrada em `crons`, apontando para `/api/avaliacoes/importar` (research.md #5).
