# Quickstart: Carrinho e Checkout (EDI-76)

## Pré-requisitos

- Ambiente das Tarefas 1-2 (EDI-74/EDI-75) já configurado: `.env.local` com `MONGODB_URI` (e `BLOB_READ_WRITE_TOKEN` do catálogo) e produtos cadastrados com estoque (via `/admin/produtos/novo` ou `npm run seed`).
- Nenhuma dependência nova — o carrinho usa React Context + `localStorage` e o restante reutiliza `mongodb` e `vitest` já instalados.

## Verificação local (sem subir servidor — conforme regra do projeto)

1. `npm run lint` — checagem de estilo/erros óbvios.
2. `npx tsc --noEmit` — checagem de tipos.
3. `npx vitest run` — testes unitários de `lib/carrinho/carrinho.ts`, `lib/pedidos/validation.ts` e da regra de estoque.
4. `npm run build` — garante que o build de produção (novas rotas `/carrinho`, `/checkout`, `/pedido/[id]` e `POST /api/pedidos`) conclui sem erros.

## Fluxo de teste manual (a ser seguido pelo usuário, não pelo agente — conforme regra do projeto)

Ver seção "Como testar" no relatório final de implementação (Test Guide), com passos concretos: adicionar ao carrinho a partir do detalhe do produto, alterar quantidades em `/carrinho`, finalizar em `/checkout`, conferir o pedido criado no MongoDB e a página `/pedido/[id]`.
