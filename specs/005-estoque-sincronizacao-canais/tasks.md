---

description: "Task list for feature implementation"
---

# Tasks: Abatimento de Estoque e Sincronização Multicanal

**Input**: Design documents from `/specs/005-estoque-sincronizacao-canais/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: O projeto usa Vitest desde a Tarefa 2 — tarefas de teste incluídas para as regras de negócio novas (abatimento atômico, backoff da fila, canal configurado/não configurado, client do Mercado Livre).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project (Next.js App Router)**: `app/`, `lib/`, `components/` na raiz do repositório, conforme plan.md.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Modelo de dados e variáveis de ambiente compartilhados por todas as histórias.

- [X] T001 [P] Adicionar campo opcional `integracoes?: { mercadoLivreId?: string; shopeeItemId?: string }` em `lib/models/produto.ts` (data-model.md #1)
- [X] T002 [P] Criar `lib/models/estoqueSincronizacao.ts` com os tipos `RegistroSincronizacaoEstoque` (coleção `sincronizacoesEstoque`) e `InconsistenciaEstoque` (coleção `estoqueInconsistencias`) (data-model.md #2, #3)
- [X] T003 [P] Criar `lib/models/credenciaisCanal.ts` com o tipo `CredencialCanal` (coleção `credenciaisCanais`, chave fixa `_id: "mercado_livre"`) (data-model.md #4)
- [X] T004 [P] Documentar em `.env.example`: `MERCADOLIVRE_CLIENT_ID`, `MERCADOLIVRE_CLIENT_SECRET`, `CRON_SECRET`, `SHOPEE_PARTNER_ID` e `SHOPEE_PARTNER_KEY` (estes dois últimos comentados/vazios — pendentes de aprovação da Shopee)

**Checkpoint**: Modelo de dados pronto para as fases seguintes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura de domínio usada por todas as histórias — interface comum de canal, repository da fila, e o ponto de disparo a partir do pagamento aprovado.

**⚠️ CRITICAL**: Nenhuma história pode ser validada de ponta a ponta antes desta fase.

- [X] T005 [P] Criar `lib/estoque/canais/tipos.ts` com a interface `CanalEstoqueClient { atualizarQuantidade(anuncioId: string, quantidade: number): Promise<void> }` e o tipo `Canal = "mercado_livre" | "shopee"` (research.md #6)
- [X] T006 [P] Criar `lib/estoque/fila.ts`: repository de `sincronizacoesEstoque` — `criarPendencia(produtoId, pedidoId, canal, quantidade)`, `marcarSincronizado(id)`, `marcarFalha(id, erro)` (recalcula `tentativas`/`proximaTentativaEm` com backoff ou define `status: "falhou"` no limite), `calcularBackoff(tentativas)`, `listarElegiveisParaRetry()`, `listarPendencias()` (data-model.md #2, research.md #4)
- [X] T007 [P] Escrever testes em `lib/estoque/fila.test.ts` (sequência de backoff, patamar máximo mantido além do limite)
- [X] T008 [P] Criar `lib/estoque/abatimento.ts`: `abaterEstoquePedido(pedido)` — para cada item, `findOneAndUpdate` atômico (`$inc estoque: -quantidade`, filtro `estoque: { $gte: quantidade }`); sucesso dispara `sincronizarEstoqueProduto(produtoId, pedidoId)` (T009); falha grava em `estoqueInconsistencias` (motivo `estoque_insuficiente` ou `produto_removido`) sem lançar exceção (research.md #2, data-model.md #3). **Desvio do plano**: o `$inc`/`$gte` atômico ficou em `lib/produtos/repository.ts` (`abaterEstoqueAtomico`), reaproveitando o dono existente da coleção `produtos`, em vez de acessar a coleção diretamente de `lib/estoque/`
- [X] T009 Criar `lib/estoque/sincronizacao.ts`: `sincronizarEstoqueProduto(produtoId, pedidoId)` — lê o produto, para cada canal (`mercado_livre`, `shopee`) verifica credencial de ambiente **e** `produto.integracoes.<canal>`; se ambos presentes, cria pendência (T006) e tenta chamar o client do canal (T005) imediatamente com timeout curto; se falhar, deixa a pendência para o reprocessamento; canal sem credencial/mapeamento é ignorado sem gerar pendência (FR-007, research.md #3, #6). **Desvio do plano**: recebe `pedidoId` além de `produtoId`, para preencher a rastreabilidade do registro de fila (data-model.md #2); também exporta `reprocessarPendencia(registro)`, reaproveitada pela rota de retry (T022) — depende de T005, T006
- [X] T010 [P] Escrever testes em `lib/estoque/abatimento.test.ts` (abatimento bem-sucedido dispara sincronização; estoque insuficiente e produto removido geram inconsistência sem lançar exceção; falha em um item não impede os demais)
- [X] T011 [P] Escrever testes em `lib/estoque/sincronizacao.test.ts` (canal com credencial+mapeamento gera pendência e chama o client; canal sem credencial é ignorado; canal com mapeamento mas sem credencial é ignorado; falha do client vira pendência, não exceção)
- [X] T012 Integrar `abaterEstoquePedido` (T008) em `lib/pagamentos/repository.ts`: `promoverPedidoSeAprovado` passou a usar `findOneAndUpdate` (em vez de `updateOne`) na mesma condição `status: { $ne: "pago" }`, chamando `abaterEstoquePedido(pedidoPromovido)` apenas quando o documento retorna não-nulo (research.md #1) — depende de T008

**Checkpoint**: Disparo de estoque amarrado à idempotência do pagamento; função reutilizável de sincronização pronta para receber os clients reais de canal.

---

## Phase 3: User Story 1 - Estoque é abatido automaticamente ao confirmar o pagamento (Priority: P1) 🎯 MVP

**Goal**: Ao confirmar o pagamento de um pedido do site, o estoque de cada produto envolvido é abatido no MongoDB de forma correta e idempotente, mesmo com concorrência ou reenvio da notificação.

**Independent Test**: Confirmar o pagamento de um pedido de teste com itens conhecidos e verificar que o campo `estoque` de cada produto foi reduzido exatamente na quantidade comprada; reenviar a mesma confirmação e verificar que o estoque não muda de novo.

### Implementation for User Story 1

- [X] T014 [US1] Reenvio do webhook do Mercado Pago (mesma `referenciaExterna`) não aciona `abaterEstoquePedido` uma segunda vez — garantido por construção: `promoverPedidoSeAprovado` usa `findOneAndUpdate({ status: { $ne: "pago" } })` e só chama `abaterEstoquePedido` quando o documento retorna não-nulo (T012); na segunda chamada o filtro não casa mais (pedido já `"pago"`), retorna `null`, e `abaterEstoquePedido` não é chamado
- [X] T013 [US1] Validado manualmente pelo usuário: compra de teste confirmada via pagamento sandbox do Mercado Pago, `estoque` do produto reduzido corretamente no MongoDB (5 → 4) e refletido no anúncio real do Mercado Livre (`MLB7594078322`, `available_quantity` sincronizado para o mesmo valor)

**Checkpoint**: Abatimento de estoque funcional e idempotente, independentemente de qualquer canal externo (MVP da tarefa).

---

## Phase 4: User Story 2 - Estoque atualizado é refletido no Mercado Livre (Priority: P1)

**Goal**: Após uma venda no site, a quantidade anunciada no Mercado Livre reflete o novo estoque automaticamente, usando as credenciais reais já disponíveis.

**Independent Test**: Confirmar o pagamento de um pedido de um produto com `integracoes.mercadoLivreId` preenchido e verificar que a quantidade anunciada nesse anúncio real do Mercado Livre foi atualizada.

### Implementation for User Story 2

- [X] T015 [P] [US2] Criar `lib/estoque/canais/mercadoLivre/auth.ts`: `obterAccessTokenValido()` — lê `credenciaisCanais` (T003), renova via `POST https://api.mercadolibre.com/oauth/token` com `refresh_token` quando `expiraEm` estiver próximo, persiste o novo par `accessToken`/`refreshToken` (o ML rotaciona o `refresh_token` a cada uso) (research.md #7)
- [X] T016 [P] [US2] Criar rota auxiliar única `app/api/estoque/mercado-livre/callback/route.ts` para trocar o `code` do fluxo OAuth2 inicial pelo primeiro par `accessToken`/`refreshToken` e gravá-lo em `credenciaisCanais` (quickstart.md, passo do usuário) — depende de T003. Nova env var `MERCADOLIVRE_REDIRECT_URI` documentada em `.env.example`
- [X] T017 [US2] Criar `lib/estoque/canais/mercadoLivre/client.ts` implementando `CanalEstoqueClient` (T005): `atualizarQuantidade(itemId, quantidade)` chama `PUT https://api.mercadolibre.com/items/{itemId}` com `{ available_quantity: quantidade }` e `Authorization: Bearer <token de T015>` — depende de T005, T015
- [X] T018 [P] [US2] Escrever testes em `lib/estoque/canais/mercadoLivre/client.test.ts` (`fetch` mockado: sucesso com token válido, erro HTTP propagado como falha tratável pela fila). **Desvio do plano**: o teste de renovação de token (`token expirado aciona renovação`) não entrou aqui — mockar `obterAccessTokenValido` inteiro (necessário para isolar o client) tornaria esse cenário invisível ao teste; a lógica de renovação em si (`auth.ts`) depende de `credenciaisCanais` no MongoDB, fora do padrão de teste unitário já usado no projeto (sem mock de Mongo) — fica coberta pelo fluxo manual do Test Guide
- [X] T019 [US2] Ligar `mercadoLivre/client.ts` (T017) em `sincronizarEstoqueProduto` (T009) como implementação real do canal `"mercado_livre"` (credencial de ambiente = `MERCADOLIVRE_CLIENT_ID`/`MERCADOLIVRE_CLIENT_SECRET` presentes) — depende de T009, T017
- [X] T020 [US2] Adicionar os campos opcionais `integracoes.mercadoLivreId` e `integracoes.shopeeItemId` ao formulário `components/admin/ProdutoForm.tsx`, à página `app/admin/produtos/[id]/editar/page.tsx` e ao payload aceito por `POST /api/produtos` e `PATCH /api/produtos/[id]` (`lib/produtos/validation.ts`) (data-model.md #1)

**Checkpoint**: Venda no site reflete no Mercado Livre real, de ponta a ponta.

---

## Phase 5: User Story 3 - Falhas de sincronização não deixam o estoque desalinhado silenciosamente (Priority: P2)

**Goal**: Falhas temporárias de um canal são reprocessadas automaticamente; falhas persistentes ficam registradas e consultáveis, sem travar o restante do fluxo. O canal Shopee (sem credenciais aprovadas ainda) se comporta como "não configurado", pronto para ligar quando aprovado.

**Independent Test**: Simular uma falha temporária no client do Mercado Livre e verificar que o reprocessamento (`POST /api/estoque/sincronizar`) conclui a sincronização em uma tentativa seguinte; esgotar as tentativas e verificar que o item aparece em `GET /api/estoque/pendencias`; confirmar que, sem `SHOPEE_PARTNER_ID`/`SHOPEE_PARTNER_KEY`, nenhuma pendência é criada para o canal Shopee.

### Implementation for User Story 3

- [X] T021 [P] [US3] Criar `lib/estoque/canais/shopee.ts`: client stub implementando `CanalEstoqueClient` (T005) — estrutura pronta (assinatura HMAC prevista em comentário/TODO) mas não chamada nesta tarefa, já que o canal só entra na lista quando `SHOPEE_PARTNER_ID`/`SHOPEE_PARTNER_KEY` existirem (research.md #8)
- [X] T022 [US3] Implementar `GET|POST /api/estoque/sincronizar` em `app/api/estoque/sincronizar/route.ts`: valida `Authorization: Bearer <CRON_SECRET>` (401 se inválido/ausente), busca itens elegíveis via `listarElegiveisParaRetry` (T006), reprocessa via `reprocessarPendencia` (T009), responde `{ processados, sincronizados, falharam }` (contracts/estoque-api.md) — depende de T006, T009. **Desvio do plano**: `GET` também é exportado (não só `POST`) porque o Vercel Cron sempre dispara via `GET`
- [X] T023 [P] [US3] Implementar `GET /api/estoque/pendencias` em `app/api/estoque/pendencias/route.ts`: retorna `sincronizacoes` (`listarPendencias`, T006) e `inconsistenciasEstoque` não resolvidas, com nome do produto (join via `buscarProdutosPorIds`) (contracts/estoque-api.md, FR-009/FR-010) — depende de T006
- [X] T024 Criar `vercel.ts` na raiz do projeto declarando `crons: [{ path: "/api/estoque/sincronizar", schedule: "0 3 * * *" }]` (research.md #5) — instalada a dependência `@vercel/config@^0.7.0` (nota: `npm audit` acusa 3 vulnerabilidades "high" transitivas em `path-to-regexp`, herdadas de `@vercel/routing-utils`; corrigir exigiria downgrade para uma versão pré-0.0.33, então mantido como risco aceito — pacote usado só em build/config, não expõe input de usuário em runtime). **Desvio pós-deploy**: schedule inicial de `*/15 * * * *` foi rejeitado pelo deploy real na Vercel (plano Hobby só permite cron diário); ajustado para `0 3 * * *` (1x/dia), conforme já previsto em research.md #5
- [X] T025 [P] [US3] Escrever testes de integração leve para `GET|POST /api/estoque/sincronizar` em `app/api/estoque/sincronizar/route.test.ts` (401 sem `CRON_SECRET` correto; soma `sincronizados`/`falharam` a partir do retorno de `reprocessarPendencia` para cada item elegível)

**Checkpoint**: Todas as três histórias funcionando de ponta a ponta — falha em um canal nunca trava venda nem os demais canais.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificação final da feature completa.

- [X] T026 Executar `npx tsc --noEmit` (ok), `npx vitest run` (72/72 passaram) e `npm run build` (ok, todas as rotas novas compiladas). `npm run lint` pulado: `next lint` foi removido no Next.js 16 e o projeto nunca migrou para `eslint.config.*` — lacuna pré-existente (já registrada em T018 da Tarefa 4), fora do escopo desta tarefa
- [X] T027 Revisado `quickstart.md`: passos de env vars e autorização inicial do Mercado Livre batem com `lib/estoque/canais/mercadoLivre/auth.ts` e `app/api/estoque/mercado-livre/callback/route.ts` implementados

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — começa imediatamente.
- **Foundational (Phase 2)**: Depende de T001-T004 (modelo e env vars documentadas).
- **US1 (Phase 3)**: Depende do Foundational completo (T005-T012).
- **US2 (Phase 4)**: Depende do Foundational completo; pode avançar em paralelo a US1 (arquivos diferentes), mas seu teste independente pressupõe o abatimento de US1 já funcionando.
- **US3 (Phase 5)**: Depende do Foundational completo (usa `sincronizarEstoqueProduto`/fila); pode avançar em paralelo a US1/US2, mas seu teste independente de falhas pressupõe US2 (Mercado Livre real) para ter algo a falhar/reprocessar de forma significativa.
- **Polish (Phase 6)**: Após todas as histórias.

### User Story Dependencies

- **User Story 1 (P1)**: Depende apenas do Foundational — é o caminho mínimo que garante a fonte de verdade correta (MVP).
- **User Story 2 (P1)**: Depende do Foundational; estende o canal Mercado Livre atrás da interface já criada.
- **User Story 3 (P2)**: Depende do Foundational; adiciona reprocessamento, consulta de pendências e o canal Shopee como stub.

### Within Each User Story

- Modelos/tipos antes de repositories.
- Repositories/domínio antes de rotas de API.
- Interface do canal (`tipos.ts`) antes de qualquer client concreto.
- História completa antes de avançar para a próxima prioridade.

### Parallel Opportunities

- T001/T002/T003/T004 podem rodar em paralelo entre si.
- T005/T006/T007/T008/T010/T011 podem rodar em paralelo entre si (arquivos diferentes); T009 e T012 dependem dos anteriores.
- T015/T016/T018 podem rodar em paralelo; T017/T019/T020 dependem deles.
- T021/T023/T025 podem rodar em paralelo a T022/T024.

---

## Parallel Example: Foundational

```bash
# Domínio puro em paralelo:
Task: "T005 Criar lib/estoque/canais/tipos.ts"
Task: "T006 Criar lib/estoque/fila.ts"
Task: "T008 Criar lib/estoque/abatimento.ts"

# Depois, a função que amarra os dois:
Task: "T009 Criar lib/estoque/sincronizacao.ts (depende de T005, T006)"
Task: "T012 Integrar abaterEstoquePedido em lib/pagamentos/repository.ts (depende de T008)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001-T004)
2. Phase 2: Foundational (T005-T012)
3. Phase 3: US1 (T013-T014)
4. **STOP and VALIDATE**: confirmar um pagamento de teste e checar o estoque no MongoDB
5. Continuar se pronto

### Incremental Delivery

1. Setup + Foundational + US1 → Fonte de verdade (MongoDB) sempre correta (MVP)
2. + US2 → Mercado Livre real refletindo as vendas do site
3. + US3 → Retry, log de falhas consultável e Shopee pronto para ligar quando aprovado
4. Cada história agrega valor sem quebrar as anteriores

---

## Notes

- [P] tasks = arquivos diferentes, sem dependências entre si.
- [Story] mapeia a tarefa à história para rastreabilidade.
- Nova dependência desta feature: `@vercel/config` (T024, para `vercel.ts`/cron). Sem SDK novo para Mercado Livre/Shopee — integração via `fetch` direto.
- Shopee permanece stub nesta tarefa (perfil em análise na Shopee Open Platform) — T021 deixa a estrutura pronta, sem chamada HTTP real (research.md #8).
- Caminho inverso (venda nascida em canal externo → abater estoque no Mongo) fica fora de escopo (spec.md, Assumptions).
- Textos de UI (ex: `ProdutoForm.tsx`, `GET /api/estoque/pendencias` se exibido em tela) em PT-BR inline, seguindo o padrão atual do projeto.
- Após cada tarefa ou grupo lógico, validar com `npx tsc --noEmit` e `npx vitest run`.
