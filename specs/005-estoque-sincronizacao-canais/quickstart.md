# Quickstart: Abatimento de Estoque e Sincronização Multicanal (EDI-78)

## Pré-requisitos

- Ambiente das Tarefas 1-4 já configurado (`.env.local` com `MONGODB_URI`, `BLOB_READ_WRITE_TOKEN`, credenciais de teste do Mercado Pago) e um fluxo de pagamento aprovável ponta a ponta.
- Credenciais reais do Mercado Livre em `.env.local`: `MERCADOLIVRE_CLIENT_ID`, `MERCADOLIVRE_CLIENT_SECRET` (fornecidas pelo usuário — nunca compartilhadas em texto/chat).
- Ao menos um produto de teste com `integracoes.mercadoLivreId` preenchido, apontando para um anúncio real (ou de teste) na conta do Mercado Livre vinculada às credenciais acima.
- Shopee: `SHOPEE_PARTNER_ID`/`SHOPEE_PARTNER_KEY` **não** configurados nesta tarefa (perfil em análise na Shopee Open Platform) — o canal roda como stub/não configurado até a aprovação.
- Novo segredo para proteger a rota de reprocessamento: `CRON_SECRET` em `.env.local` (e nas variáveis de ambiente da Vercel em produção).

## Passo do usuário: obter o token inicial do Mercado Livre

O primeiro `accessToken`/`refreshToken` do Mercado Livre exige um passo manual único (fluxo OAuth2 "Authorization Code"):

1. Acessar a URL de autorização do Mercado Livre com `MERCADOLIVRE_CLIENT_ID` e a `redirect_uri` cadastrada na aplicação.
2. Autorizar com a conta vendedora — o Mercado Livre redireciona com um `code` na URL.
3. Trocar esse `code` pelo par inicial `accessToken`/`refreshToken` (endpoint de token do ML) — este passo é feito uma única vez pela implementação (rota auxiliar ou script), que grava o resultado em `credenciaisCanais` no MongoDB.
4. A partir daí, o client renova sozinho (research.md #7) — sem repetir este passo, a menos que a autorização seja revogada.

## Verificação local (sem subir servidor — conforme regra do projeto)

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npx vitest run` — testes unitários do abatimento atômico de estoque, do backoff da fila de sincronização, e do client do Mercado Livre (mockando a chamada HTTP)
4. `npm run build` — garante que a nova rota (`POST /api/estoque/sincronizar`, `GET /api/estoque/pendencias`) e o `vercel.ts` com o cron compilam/validam sem erro

## Fluxo de teste manual (a ser seguido pelo usuário, não pelo agente — conforme regra do projeto)

Ver seção "Como testar" no relatório final de implementação (Test Guide), incluindo: confirmar um pagamento de teste e verificar o abatimento do estoque no MongoDB, verificar a atualização da quantidade no anúncio real do Mercado Livre, forçar uma falha (ex: revogar temporariamente o token) e confirmar que o item entra na fila com retry, e consultar `GET /api/estoque/pendencias` para ver o item pendente/falho.
