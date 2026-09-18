# Data Model: Webhooks de perguntas e reclamações do Mercado Livre

Três novas coleções MongoDB, cada uma com índice único esparso no id de origem no Mercado Livre — mesmo padrão de `origemExterna.pedidoExternoId` em `Pedido` (`lib/pedidos/externos.ts`), garantindo idempotência quando o ML reenvia a mesma notificação (research.md #4).

## PerguntaMercadoLivre (`perguntas_mercado_livre`)

| Campo | Tipo | Notas |
|---|---|---|
| `_id` | `ObjectId` | |
| `perguntaId` | `string` | id da pergunta no ML — índice único |
| `itemId` | `string` | id do anúncio no ML |
| `produtoId` | `ObjectId?` | vínculo com o catálogo, quando existir (`buscarProdutoPorMercadoLivreId`) |
| `texto` | `string` | texto da pergunta |
| `status` | `"pendente" \| "respondida"` | FR-014 |
| `linkOrigem` | `string` | link para o anúncio/pergunta no portal do Mercado Livre (FR-013) |
| `criadoEm` | `Date` | |
| `atualizadoEm` | `Date` | |

**Transições**: `pendente → respondida`, disparado tanto por uma resposta enviada pelo admin (FR-010) quanto por uma nova notificação do tópico `questions` indicando que já foi respondida fora do site (FR-014).

## ReclamacaoMercadoLivre (`reclamacoes_mercado_livre`)

| Campo | Tipo | Notas |
|---|---|---|
| `_id` | `ObjectId` | |
| `reclamacaoId` | `string` | id da reclamação no ML (`post-purchase/v1/claims`) — índice único |
| `pedidoExternoId` | `string?` | id do pedido no ML, casado com `origemExterna.pedidoExternoId` de `Pedido` (research.md #6) |
| `pedidoId` | `ObjectId?` | `_id` do pedido vinculado no site, quando encontrado |
| `motivo` | `string` | tipo/motivo da reclamação retornado pela API |
| `status` | `"aberta" \| "fechada"` | FR-014 |
| `linkOrigem` | `string` | link para a reclamação no portal do Mercado Livre (FR-013) |
| `criadoEm` | `Date` | |
| `atualizadoEm` | `Date` | |

**Transições**: `aberta → fechada`, disparado por resposta/comentário enviado pelo admin (FR-011, quando isso já encerra a reclamação) ou por notificação indicando encerramento no Mercado Livre.

## MensagemPosVendaMercadoLivre (`mensagens_mercado_livre`)

| Campo | Tipo | Notas |
|---|---|---|
| `_id` | `ObjectId` | |
| `mensagemId` | `string` | id da mensagem/pack no ML — índice único |
| `pedidoExternoId` | `string?` | id do pedido no ML, casado com `origemExterna.pedidoExternoId` de `Pedido` |
| `pedidoId` | `ObjectId?` | `_id` do pedido vinculado no site, quando encontrado |
| `texto` | `string` | texto da mensagem |
| `status` | `"pendente" \| "respondida"` | FR-014 |
| `linkOrigem` | `string` | link para a conversa no portal do Mercado Livre (FR-013) |
| `criadoEm` | `Date` | |
| `atualizadoEm` | `Date` | |

**Transições**: `pendente → respondida`, mesmo padrão da pergunta.

## Validação (Key Entities do spec.md)

Os três modelos cobrem, com os mesmos campos, as entidades "Pergunta do Mercado Livre", "Reclamação do Mercado Livre" e "Mensagem pós-venda do Mercado Livre" descritas no `spec.md`.
