# Data Model: Painel administrativo de pedidos

Nenhuma coleção ou schema novo é criado nesta tarefa. O modelo abaixo documenta os campos existentes (`lib/models/pedido.ts`, Tarefas 3 e 7) que esta funcionalidade lê e atualiza.

## Pedido (existente — `lib/models/pedido.ts`)

| Campo | Tipo | Uso nesta tarefa |
|---|---|---|
| `_id` | `ObjectId` | Identifica o pedido na listagem e no `PATCH /api/pedidos/[id]` |
| `itens[].produtoId` | `ObjectId` | Exibido no detalhe do pedido (nome do produto resolvido via `buscarProdutosPorIds`, Tarefa 3) |
| `itens[].quantidade` / `itens[].precoUnitario` | `number` | Exibidos no detalhe do pedido |
| `cliente` | `ClientePedido` | Nome/e-mail exibidos na listagem e no detalhe |
| `status` | `"pendente" \| "pago" \| "enviado" \| "cancelado"` | Exibido como badge; **atualizado** pelo `PATCH /api/pedidos/[id]` (FR-005/FR-006) |
| `canalOrigem` | `"site" \| "shopee" \| "mercado_livre"` | Usado no filtro de canal e no badge de origem (FR-001/FR-004/FR-007) — `"shopee"` nunca aparece com dado real nesta tarefa |
| `valorTotal` | `number` (centavos) | Exibido na listagem, formatado com `formatarPreco` (Tarefa 2) |
| `pagamento` | `PagamentoPedido` | Exibido no detalhe quando existir (`tentativas`, `status`, `metodo`) |
| `origemExterna` | `{ canal, pedidoExternoId } \| undefined` | Presente em pedidos do Mercado Livre (Tarefa 7); usado só para exibir a origem, não é reescrito por esta tarefa |
| `criadoEm` / `atualizadoEm` | `Date` | Ordenação (mais recente primeiro) e exibição; `atualizadoEm` é regravado ao mudar o status |

## Novo tipo (somente camada de apresentação, sem persistência)

### `FiltroPedidos` (parâmetros de query da listagem)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `canal` | `"site" \| "shopee" \| "mercado_livre"` | Não | Quando `"shopee"`, a lista retorna vazia (nenhum pedido real desse canal ainda) |
| `status` | `"pendente" \| "pago" \| "enviado" \| "cancelado"` | Não | Filtro exato |
| `pagina` | `number` | Não (default `1`) | Paginação simples, 20 itens por página |

Não há transições de estado validadas para `status` (ver research.md #2) — qualquer valor do enum é aceito na atualização manual, mediante confirmação na UI.

## Itens externos sem produto correspondente (leitura, sem novo modelo)

A coleção `inconsistenciasEstoque` (Tarefa 7, `lib/estoque/abatimento.ts` → `registrarItemExternoSemProduto`) já registra itens de pedidos externos sem produto no catálogo. Esta tarefa apenas identifica, ao montar o detalhe de um pedido, se algum item não resolve para um produto existente e exibe uma indicação visual (FR-009) — não introduz uma nova consulta a essa coleção além do já usado para diagnóstico administrativo.
