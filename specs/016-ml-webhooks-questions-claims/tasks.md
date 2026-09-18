# Tasks: Webhooks de perguntas e reclamações do Mercado Livre

**Input**: Design documents from `specs/016-ml-webhooks-questions-claims/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/webhooks-callback.md, contracts/atendimento-responder.md, quickstart.md

**Tests**: Incluídos para a lógica em `lib/` e para os endpoints (`route.ts`) — padrão já existente do projeto (Vitest, `*.test.ts` co-localizados, mesmo de `pedidos/route.test.ts`). A UI da nova listagem (`AtendimentoLista.tsx`) não ganha teste automatizado (sem `jsdom` no projeto); é verificada manualmente (Test Guide ao final).

**Organization**: 3 user stories, todas independentes entre si (cada tópico do Mercado Livre — `questions`, `claims`/`claims_actions`, `messages` — tem seu próprio endpoint, sua própria coleção e sua própria seção na listagem do admin). US1 (Perguntas, P1) é o MVP.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Mesmo projeto único Next.js (ver plan.md): `lib/`, `app/`, `components/`.

---

## Phase 1: Setup

Nenhuma tarefa de código necessária — projeto, dependências e ambiente já existentes; nenhuma biblioteca nova (plan.md). A ativação dos tópicos na aplicação do Mercado Livre ("Minhas Aplicações") é uma etapa manual, fora do código — ver quickstart.md.

---

## Phase 2: Foundational

Nenhuma tarefa bloqueante necessária — `questions`, `claims`/`claims_actions` e `messages` são tópicos independentes entre si, cada um com seu próprio endpoint de callback, sua própria função de integração (`lib/estoque/canais/mercadoLivre/*`) e sua própria coleção (data-model.md). US2 e US3 apenas estendem os arquivos compartilhados `lib/atendimento/repository.ts`, `lib/atendimento/apresentacao.ts` e `components/admin/AtendimentoLista.tsx` criados na US1, sem depender da lógica interna dela.

---

## Phase 3: User Story 1 - Responder perguntas direto pelo admin (Priority: P1) 🎯 MVP

**Goal**: Perguntas novas feitas nos anúncios do Mercado Livre aparecem no admin como pendentes, com link para o anúncio, e podem ser respondidas direto pela listagem.

**Independent Test**: Simular a notificação do tópico `questions` (curl, quickstart.md) para uma pergunta nova; verificar que ela aparece em `/admin/atendimento`; responder pelo admin e confirmar que a resposta é publicada no anúncio no Mercado Livre e o item some da listagem.

### Tests for User Story 1

- [X] T001 [P] [US1] Teste de `buscarPerguntaMercadoLivre` e `responderPerguntaMercadoLivre` em `lib/estoque/canais/mercadoLivre/perguntas.test.ts` (sucesso, `application_id` divergente, falha transitória da API — mesmo padrão de `pedidos.test.ts`)
- [X] T002 [P] [US1] ~~Teste de upsert idempotente de pergunta em `lib/atendimento/repository.test.ts`~~ — **adaptado**: o projeto não tem harness de Mongo em memória (`lib/pedidos/externos.ts`, o repositório equivalente para pedidos, também não tem teste próprio); a idempotência é coberta indiretamente pelos testes de rota (T004/T005), que mockam `lib/atendimento/repository` como `pedidos/route.test.ts` já faz com `upsertPedidoExterno`
- [X] T003 [P] [US1] Teste de `paraItemPergunta` (monta texto, `linkOrigem`, vínculo com produto do catálogo) em `lib/atendimento/apresentacao.test.ts`
- [X] T004 [P] [US1] Teste do endpoint de callback em `app/api/webhooks/mercado-livre/perguntas/route.test.ts` (`application_id` correto persiste, divergente ignora, falha na consulta responde 500 sem persistir — mesmo padrão de `pedidos/route.test.ts`)
- [X] T005 [P] [US1] Teste do endpoint de resposta em `app/api/admin/atendimento/perguntas/[id]/responder/route.test.ts` (sucesso marca `respondida`, falha na API do ML mantém `pendente` e responde erro — FR-015)

### Implementation for User Story 1

- [X] T006 [P] [US1] Criar `lib/estoque/canais/mercadoLivre/perguntas.ts`: `buscarPerguntaMercadoLivre(perguntaId)` (`GET /questions/{id}`) e `responderPerguntaMercadoLivre(perguntaId, texto)` (`POST /answers`, reaproveitando `obterAccessTokenValido`/`erroMercadoLivre` — research.md #1)
- [X] T007 [US1] Criar `lib/atendimento/repository.ts`: modelo `PerguntaMercadoLivre` (data-model.md), `colecaoPerguntasMercadoLivre()`, índice único esparso em `perguntaId`, `upsertPerguntaPendente(...)` (idempotente, padrão `upsertPedidoExterno` — research.md #4) e `marcarPerguntaRespondida(perguntaId)` — depende de T006
- [X] T008 [US1] Criar `lib/atendimento/apresentacao.ts`: `paraItemPergunta(pergunta)` monta `{ texto, linkOrigem, produto? }`, resolvendo o produto do catálogo via `buscarProdutoPorMercadoLivreId` quando existir — depende de T007
- [X] T009 [US1] Criar `app/api/webhooks/mercado-livre/perguntas/route.ts`: valida `application_id`, extrai id de `resource`, busca detalhe (T006) e faz upsert (T007) — mesmo contrato de `pedidos/route.ts` (contracts/webhooks-callback.md) — depende de T006, T007
- [X] T010 [US1] Criar `app/api/admin/atendimento/perguntas/[id]/responder/route.ts`: valida `texto`, chama `responderPerguntaMercadoLivre` (T006) e `marcarPerguntaRespondida` (T007) em caso de sucesso; erro da API do ML retorna 502 sem alterar o status (contracts/atendimento-responder.md, FR-015) — depende de T006, T007
- [X] T010a [US1] **Não planejada, necessária**: proteger `/api/admin/**` — adicionar regra em `lib/auth/rotaProtegida.ts` (`{ protegida: true, tipoResposta: "json" }`), incluir `/api/admin/:path*` no `matcher` de `proxy.ts` e cobrir com teste em `rotaProtegida.test.ts`; sem isso a rota de resposta ficaria sem autenticação (o padrão do projeto é opt-in por prefixo, não opt-out)
- [X] T011 [US1] Criar `lib/atendimento/repository.ts` (`listarPerguntasPendentes()`) — usada pela página do admin — depende de T007
- [X] T012 [US1] Invocar a skill `frontend-design` (regra do projeto para qualquer UI nova) antes de desenhar a listagem de "Atendimento"
- [X] T013 [US1] Criar `app/admin/(painel)/atendimento/page.tsx` (Server Component, `export const dynamic = "force-dynamic"`, mesmo padrão de `pedidos/page.tsx`): busca `listarPerguntasPendentes()` (T011) e renderiza `AtendimentoLista` — depende de T011, T012
- [X] T014 [US1] Criar `components/admin/AtendimentoLista.tsx` (client component): seção "Perguntas pendentes" — lista texto, link para o anúncio no Mercado Livre (FR-013) e campo de resposta inline que chama `POST /api/admin/atendimento/perguntas/[id]/responder` (T010), removendo o item da lista em caso de sucesso e exibindo erro em caso de falha (FR-015) — depende de T010, T012
- [X] T015 [US1] Estilizar a nova listagem em `components/admin/admin.module.css` (cartões de pendência, campo de resposta inline, badge de canal) — depende de T012, T014

**Checkpoint**: US1 completa e testável de forma independente — perguntas pendentes aparecem no admin e podem ser respondidas sem sair do site.

---

## Phase 4: User Story 2 - Responder/agir em reclamações abertas (Priority: P2)

**Goal**: Reclamações abertas em vendas do Mercado Livre aparecem no admin como pendentes, vinculadas ao pedido correspondente, com link para a reclamação e possibilidade de responder/comentar direto pela listagem.

**Independent Test**: Simular a notificação dos tópicos `claims`/`claims_actions` para uma venda existente; verificar que a reclamação aparece em `/admin/atendimento` vinculada ao pedido; enviar uma resposta pelo admin e confirmar que ela é publicada na reclamação no Mercado Livre.

### Tests for User Story 2

- [X] T016 [P] [US2] Teste de `buscarReclamacaoMercadoLivre` e `responderReclamacaoMercadoLivre` em `lib/estoque/canais/mercadoLivre/reclamacoes.test.ts` (research.md #2)
- [X] T017 [P] [US2] ~~Teste de upsert idempotente de reclamação~~ — mesma adaptação de T002 (sem harness de Mongo no projeto)
- [X] T018 [P] [US2] Teste do endpoint de callback em `app/api/webhooks/mercado-livre/reclamacoes/route.test.ts` (cobre `claims` e `claims_actions`)
- [X] T019 [P] [US2] Teste do endpoint de resposta em `app/api/admin/atendimento/reclamacoes/[id]/responder/route.test.ts`

### Implementation for User Story 2

- [X] T020 [P] [US2] Criar `lib/estoque/canais/mercadoLivre/reclamacoes.ts`: `buscarReclamacaoMercadoLivre(reclamacaoId)` (`GET /post-purchase/v1/claims/{id}`) e `responderReclamacaoMercadoLivre(reclamacaoId, texto)` (research.md #2)
- [X] T021 [US2] Estender `lib/atendimento/repository.ts`: modelo `ReclamacaoMercadoLivre` (data-model.md), `colecaoReclamacoesMercadoLivre()`, índice único esparso em `reclamacaoId`, `upsertReclamacaoPendente(...)` (vínculo com `pedidoExternoId`, research.md #6) e `listarReclamacoesPendentes()` — depende de T020. **Ajuste**: sem `marcarReclamacaoFechada` chamada pela rota de resposta — comentar/responder não fecha a reclamação por si só (só a notificação de encerramento do ML atualiza o status, FR-014); a função existe no repositório para uso futuro caso o ML confirme fechamento síncrono
- [X] T022 [US2] Estender `lib/atendimento/apresentacao.ts`: `paraItemReclamacao(reclamacao, pedido?)` — depende de T021
- [X] T023 [US2] Criar `app/api/webhooks/mercado-livre/reclamacoes/route.ts`: mesmo contrato de T009, cobrindo `claims` e `claims_actions` — depende de T020, T021
- [X] T024 [US2] Criar `app/api/admin/atendimento/reclamacoes/[id]/responder/route.ts`: mesmo contrato de T010, mas retorna `resolvido: false` (ver ajuste de T021) — depende de T020, T021
- [X] T025 [US2] Estender `app/admin/(painel)/atendimento/page.tsx`: busca `listarReclamacoesPendentes()` (T021) e repassa para `AtendimentoLista` — depende de T021
- [X] T026 [US2] Estender `components/admin/AtendimentoLista.tsx`: seção "Reclamações pendentes" (texto/motivo, vínculo com o pedido, link para a reclamação no Mercado Livre, resposta inline via T024, sem remover o item da lista ao responder) — depende de T024, T025

**Checkpoint**: US1 e US2 funcionam de forma independente — reclamações pendentes aparecem no admin, vinculadas ao pedido, e podem ser respondidas sem sair do site.

---

## Phase 5: User Story 3 - Responder mensagens pós-venda direto pelo admin (Priority: P3)

**Goal**: Mensagens pós-venda trocadas com compradores no Mercado Livre aparecem no admin como pendentes, vinculadas ao pedido, com link para a conversa e possibilidade de responder direto pela listagem.

**Independent Test**: Simular a notificação do tópico `messages` para um pedido existente; verificar que a mensagem aparece em `/admin/atendimento` vinculada ao pedido; responder pelo admin e confirmar que a resposta é publicada na conversa no Mercado Livre.

### Tests for User Story 3

- [X] T027 [P] [US3] Teste de `buscarMensagemMercadoLivre` e `responderMensagemMercadoLivre` em `lib/estoque/canais/mercadoLivre/mensagens.test.ts` (research.md #3)
- [X] T028 [P] [US3] ~~Teste de upsert idempotente de mensagem~~ — mesma adaptação de T002/T017 (sem harness de Mongo no projeto)
- [X] T029 [P] [US3] Teste do endpoint de callback em `app/api/webhooks/mercado-livre/mensagens/route.test.ts`
- [X] T030 [P] [US3] Teste do endpoint de resposta em `app/api/admin/atendimento/mensagens/[id]/responder/route.test.ts`

### Implementation for User Story 3

- [X] T031 [P] [US3] Criar `lib/estoque/canais/mercadoLivre/mensagens.ts`: `buscarMensagemMercadoLivre(packId)` (`GET /messages/packs/{pack_id}/sellers/{seller_id}`) e `responderMensagemMercadoLivre(packId, texto)` (research.md #3). **Ajuste**: precisa do `seller_id` do vendedor, não previsto no data-model — adicionado `obterVendedorId()` interno (`GET /users/me`) em vez de depender de uma variável de ambiente nova
- [X] T032 [US3] Estender `lib/atendimento/repository.ts`: modelo `MensagemPosVendaMercadoLivre` (data-model.md), `colecaoMensagensMercadoLivre()`, índice único esparso em `mensagemId`, `upsertMensagemPendente(...)` (vínculo com `pedidoExternoId`), `marcarMensagemRespondida(mensagemId)` e `listarMensagensPendentes()` — depende de T031
- [X] T033 [US3] Estender `lib/atendimento/apresentacao.ts`: `paraItemMensagem(mensagem, pedido?)` — depende de T032
- [X] T034 [US3] Criar `app/api/webhooks/mercado-livre/mensagens/route.ts`: mesmo contrato de T009/T023 — depende de T031, T032
- [X] T035 [US3] Criar `app/api/admin/atendimento/mensagens/[id]/responder/route.ts`: mesmo contrato de T010/T024 — depende de T031, T032
- [X] T036 [US3] Estender `app/admin/(painel)/atendimento/page.tsx`: busca `listarMensagensPendentes()` (T032) e repassa para `AtendimentoLista` — depende de T032
- [X] T037 [US3] Estender `components/admin/AtendimentoLista.tsx`: seção "Mensagens pendentes" (texto, vínculo com o pedido, link para a conversa no Mercado Livre, resposta inline via T035) — depende de T035, T036

**Checkpoint**: Todas as três user stories funcionam de forma independente — perguntas, reclamações e mensagens pendentes aparecem no admin e podem ser respondidas sem sair do site.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T038 [P] **Pendente do usuário**: registrar os tópicos `questions`, `claims`, `claims_actions` e `messages` na aplicação do Mercado Livre ("Minhas Aplicações") — etapa manual, fora do código, exige acesso à conta de desenvolvedor (quickstart.md)
- [X] T039 `npx tsc --noEmit` (ok), `npx vitest run` (375/375 passaram, 59 arquivos) e `npm run build` (ok — todas as rotas novas listadas: `/admin/atendimento`, `/api/webhooks/mercado-livre/{perguntas,reclamacoes,mensagens}`, `/api/admin/atendimento/{perguntas,reclamacoes,mensagens}/[id]/responder`)
- [ ] T040 **Pendente do usuário**: validar `quickstart.md` (simular notificação via curl para os três tópicos e responder pelo admin) — não executado aqui por instrução do projeto (CLAUDE.md: não subir instância/container para testar; ver Test Guide)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** e **Foundational (Phase 2)**: sem tarefas de código — user stories podem começar imediatamente.
- **User Stories (Phase 3-5)**: independentes entre si (cada uma tem seu próprio endpoint, sua própria função de integração e sua própria seção da UI); podem ser feitas em paralelo ou em ordem de prioridade (P1 → P2 → P3).
- **Polish (Phase 6)**: depende de todas as user stories desejadas estarem completas.

### User Story Dependencies

- **US1 (P1)**: sem dependências de outras stories.
- **US2 (P2)**: sem dependência funcional de US1; estende (sem conflito de lógica) os arquivos compartilhados `lib/atendimento/repository.ts`, `lib/atendimento/apresentacao.ts`, `app/admin/(painel)/atendimento/page.tsx` e `components/admin/AtendimentoLista.tsx` criados em US1.
- **US3 (P3)**: mesma relação de US2.

### Within Each User Story

- Testes antes da implementação correspondente.
- `lib/estoque/canais/mercadoLivre/*` (integração) antes de `lib/atendimento/repository.ts` (persistência).
- Persistência antes do endpoint de callback e do endpoint de resposta.
- Endpoints antes da UI que os consome.

### Parallel Opportunities

- Todos os testes de uma mesma user story marcados [P] podem ser escritos em paralelo.
- T006, T020, T031 (integração com a API do Mercado Livre de cada tópico) são independentes entre si e podem ser feitas em paralelo por pessoas diferentes.
- US2 e US3 podem ser desenvolvidas em paralelo depois que US1 criar os arquivos compartilhados (`repository.ts`, `apresentacao.ts`, `AtendimentoLista.tsx`) — cada uma adiciona sua própria seção/função, sem sobrepor a lógica da outra.

---

## Parallel Example: User Story 1

```bash
# Testes de US1 em paralelo:
Task: "Teste de buscarPerguntaMercadoLivre/responderPerguntaMercadoLivre em lib/estoque/canais/mercadoLivre/perguntas.test.ts"
Task: "Teste de upsert idempotente de pergunta em lib/atendimento/repository.test.ts"
Task: "Teste de paraItemPergunta em lib/atendimento/apresentacao.test.ts"
Task: "Teste do endpoint de callback em app/api/webhooks/mercado-livre/perguntas/route.test.ts"
Task: "Teste do endpoint de resposta em app/api/admin/atendimento/perguntas/[id]/responder/route.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 3 (US1 — Perguntas).
2. **PARAR e VALIDAR**: testar US1 de forma independente (Independent Test acima).
3. Entregar/demonstrar se pronto — já cobre o cenário mais frequente e mais sensível a tempo (perguntas sem resposta).

### Incremental Delivery

1. US1 (Perguntas) → validar → deploy/demo (MVP).
2. US2 (Reclamações) → validar → deploy/demo.
3. US3 (Mensagens) → validar → deploy/demo.
4. Cada story agrega valor sem quebrar as anteriores.

---

## Notes

- [P] = arquivos diferentes, sem dependência entre si.
- Nenhuma dependência nova de npm em nenhuma story (research.md).
- Cada endpoint de callback segue exatamente o contrato já usado por `orders_v2` (200 para confirmar recebimento, 500 só em falha transitória) — contracts/webhooks-callback.md.
- Nenhum endpoint de resposta marca item como resolvido sem confirmação de sucesso da API do Mercado Livre — FR-015, contracts/atendimento-responder.md.
