# Quickstart: Integração com Mercado Livre — Anúncios e Vendas (EDI-80)

## Pré-requisitos

- Ambiente das Tarefas 1-5 já configurado (`.env.local` com `MONGODB_URI`, `BLOB_READ_WRITE_TOKEN`, credenciais de teste do Mercado Pago) e a sincronização de estoque da Tarefa 5 funcionando.
- Credenciais do Mercado Livre já configuradas desde a Tarefa 5: `MERCADOLIVRE_CLIENT_ID`, `MERCADOLIVRE_CLIENT_SECRET`, `MERCADOLIVRE_REDIRECT_URI`, e um token válido em `credenciaisCanais` (via `/api/estoque/mercado-livre/callback`) — nenhum passo de autorização novo é necessário nesta tarefa.
- URL do webhook de pedidos cadastrada no painel do Mercado Livre (Suas aplicações > Notificações > tópico `orders_v2`), apontando para `https://<seu-domínio>/api/webhooks/mercado-livre/pedidos`.
- Ao menos um produto de teste com fotos, preço e estoque cadastrados no site, categoria presente no mapeamento estático de categorias (`lib/estoque/canais/mercadoLivre/categorias.ts`), e **sem** `integracoes.mercadoLivreId` preenchido (para testar a publicação).

## Verificação local (sem subir servidor — conforme regra do projeto)

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npx vitest run` — testes unitários da resolução de categoria, do payload de criação de anúncio, do upload de imagem por URL, da extensão de preço no client do Mercado Livre, e do processamento idempotente do webhook de pedidos (tudo com `fetch` mockado)
4. `npm run build` — garante que as novas rotas (`POST /api/produtos/[id]/mercado-livre/publicar`, `GET /api/anuncios/pendencias`, `POST /api/webhooks/mercado-livre/pedidos`) compilam sem erro

## Fluxo de teste manual (a ser seguido pelo usuário, não pelo agente — conforme regra do projeto)

Ver seção "Como testar" no relatório final de implementação (Test Guide), incluindo: publicar um produto de teste e conferir o anúncio criado no painel do Mercado Livre (título, descrição, preço, fotos, estoque), tentar publicar o mesmo produto de novo e confirmar que não duplica o anúncio, alterar o preço do produto no site e conferir a atualização no anúncio, simular/realizar uma venda de teste no Mercado Livre e conferir o abatimento de estoque no site e a propagação para a Shopee (se configurada), reenviar a mesma notificação de pedido (ou usar o "Simular notificação" do painel do Mercado Livre) e confirmar que o estoque não é abatido duas vezes, e consultar `GET /api/anuncios/pendencias` após forçar uma falha de publicação (ex: produto de categoria sem mapeamento).
