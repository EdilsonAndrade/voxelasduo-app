# Phase 1 Data Model: E-mail de confirmação de pedido e padronização visual dos e-mails transacionais

Sem mudança de schema — nenhum novo campo, coleção ou índice. `Pedido` (`lib/models/pedido.ts`) já contém tudo que os e-mails desta tarefa precisam:

| Campo usado no e-mail | Origem em `Pedido` |
|---|---|
| Número do pedido | `_id` (ObjectId, exibido como string) |
| Itens comprados (nome + quantidade) | `itens[].produtoId` (nome resolvido via `buscarProdutosPorIds`) + `itens[].quantidade` |
| Valor total | `valorTotal` (centavos, formatado em BRL) |
| E-mail de destino | `cliente.email` (funciona igual para convidado e autenticado — `ClientePedido.email` não distingue os dois) |

## Conceitos novos (não persistidos)

- **Layout de e-mail (`lib/email/templates.ts`)**: não é uma entidade de dados — é uma função pura que recebe título/corpo/CTA opcional e devolve `{ html, text }`. Não tem estado, não é gravado em nenhuma coleção.
- **`SITE_URL` (variável de ambiente)**: usada só em tempo de execução para montar a URL absoluta da logo; não persistida.
