# Data Model: Importação de Avaliações e Feedbacks das Lojas Parceiras (EDI-85)

## `Avaliação` (nova — `lib/models/avaliacao.ts`)

Coleção: `avaliacoes`

| Campo             | Tipo                                     | Obrigatório | Descrição |
|--------------------|-------------------------------------------|-------------|-----------|
| `_id`              | `ObjectId`                                | gerado      | |
| `produtoId`        | `ObjectId`                                 | sim         | Referência ao produto do site (`produtos._id`). |
| `canal`            | `"site" \| "mercado_livre" \| "shopee"`   | sim         | Origem da avaliação. `"site"` reservado para uso futuro (spec.md, Assumptions) — nenhum caminho de escrita a partir do site é criado nesta tarefa. |
| `avaliacaoIdCanal` | `string`                                   | apenas para `mercado_livre`/`shopee` | ID da avaliação no canal de origem; base do índice único de idempotência (research.md #3). |
| `nota`             | `number` (1 a 5)                           | sim         | Nota dada pelo cliente. |
| `comentario`       | `string`                                   | não         | Texto livre do cliente; ausente quando o cliente avaliou só com nota (spec.md, Edge Cases). |
| `dataAvaliacao`    | `Date`                                     | sim         | Data original da avaliação no canal (não a data de importação). |
| `criadoEm`         | `Date`                                     | sim         | Quando este registro foi importado pela primeira vez. |
| `atualizadoEm`     | `Date`                                     | sim         | Última vez que o conteúdo foi atualizado por reimportação (FR-004). |

**Índices**:
- Único, esparso em `{ canal: 1, avaliacaoIdCanal: 1 }` — sustenta o upsert idempotente (research.md #3); esparso porque `avaliacaoIdCanal` não existe para `canal: "site"`.
- `{ produtoId: 1, dataAvaliacao: -1 }` — sustenta a listagem paginada por produto, mais recentes primeiro (FR-011).

**Validações / regras**:
- `nota` sempre um inteiro de 1 a 5 (rejeitar fora da faixa ao importar; produto de dados inconsistentes do canal externo vira falha registrada, não avaliação salva com nota inválida).
- Produto de origem (`produtoId`) deve existir no momento da importação; se o produto foi removido do catálogo entre a venda e a importação, a avaliação simplesmente não é buscada (não há mais `integracoes.<canal>` para consultar) — não é um estado a modelar aqui.

## `FalhaImportacaoAvaliacao` (nova — `lib/models/avaliacaoImportacaoFalha.ts`)

Coleção: `avaliacoesImportacaoFalhas`

| Campo         | Tipo                              | Obrigatório | Descrição |
|----------------|-------------------------------------|-------------|-----------|
| `_id`          | `ObjectId`                         | gerado      | |
| `canal`        | `"mercado_livre" \| "shopee"`      | sim         | Canal em que a falha ocorreu. |
| `produtoId`    | `ObjectId`                          | não         | Ausente quando a falha é geral do canal (ex: token inválido, antes de resolver qualquer produto). |
| `motivo`       | `string`                           | sim         | Mensagem de erro, legível pelo responsável da loja. |
| `criadoEm`     | `Date`                             | sim         | |
| `resolvidoEm`  | `Date`                             | não         | Preenchido manualmente/por reprocessamento bem-sucedido futuro; ausência = pendente (mesmo padrão de `FalhaPublicacaoCanal`). |

**Índices**:
- `{ resolvidoEm: 1 }` esparso — sustenta `listarFalhasPendentes`.
- `{ produtoId: 1 }` — sustenta consulta por produto.

## Relação com entidades existentes

- **Produto** (`lib/models/produto.ts`): nenhuma mudança de schema. `integracoes.mercadoLivreId` e `integracoes.shopeeItemId` (já existentes desde a Tarefa 5/7) continuam sendo a única fonte de "este produto tem anúncio em qual canal" — a importação de avaliações consulta os mesmos campos, sem introduzir um novo mapeamento produto↔canal.
