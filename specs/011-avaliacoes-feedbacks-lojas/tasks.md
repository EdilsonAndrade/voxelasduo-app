---

description: "Task list for feature implementation"
---

# Tasks: Importação de Avaliações e Feedbacks das Lojas Parceiras

**Input**: Design documents from `/specs/011-avaliacoes-feedbacks-lojas/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: O projeto usa Vitest desde a Tarefa 2 — tarefas de teste incluídas para as regras de negócio novas (mapeamento de reviews do Mercado Livre, upsert idempotente, isolamento de falha por canal), seguindo o mesmo padrão das Tarefas 5/7 (`fetch` mockado, sem mock de Mongo — CRUD direto sobre o Mongo fica sem teste próprio, mesmo padrão já aceito nessas tarefas).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project (Next.js App Router)**: `app/`, `lib/`, `components/` na raiz do repositório, conforme plan.md.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Modelos de dados compartilhados por todas as histórias.

- [X] T001 [P] Criar `lib/models/avaliacao.ts` com o tipo `Avaliação` e `AVALIACOES_COLLECTION` (data-model.md — `produtoId`, `canal`, `avaliacaoIdCanal?`, `nota`, `comentario?`, `dataAvaliacao`, `criadoEm`, `atualizadoEm`)
- [X] T002 [P] Criar `lib/models/avaliacaoImportacaoFalha.ts` com o tipo `FalhaImportacaoAvaliacao` e `AVALIACOES_IMPORTACAO_FALHAS_COLLECTION` (data-model.md — `canal`, `produtoId?`, `motivo`, `criadoEm`, `resolvidoEm?`)

**Checkpoint**: Modelo de dados pronto para as fases seguintes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Acesso a dados compartilhado por todas as histórias — upsert idempotente, listagem paginada, log de falhas e descoberta de produtos com integração externa.

**⚠️ CRITICAL**: Nenhuma história pode ser validada de ponta a ponta antes desta fase.

- [X] T003 Criar `lib/avaliacoes/repository.ts`: `colecaoAvaliacoes()` garantindo os índices (`{ canal, avaliacaoIdCanal }` único esparso e `{ produtoId, dataAvaliacao: -1 }`, data-model.md), `upsertAvaliacao(dados): Promise<{ criada: boolean; atualizada: boolean }>` e `buscarAvaliacoesProduto(produtoId, { cursor?, limite? }): Promise<{ avaliacoes: Avaliacao[]; proximoCursor: string | null }>` (research.md #8) — depende de T001. **Desvio do plano**: `upsertAvaliacao` implementado como find-then-insert com catch do erro 11000 (índice único), não `updateOne`/`upsert: true` — necessário para distinguir "criada" de "atualizada" de "sem mudança de conteúdo" (research.md #3, atualizado pós-implementação)
- [X] T004 [P] Criar `lib/avaliacoes/falhas.ts`: `registrarFalhaImportacao(canal, motivo, produtoId?)` e `listarFalhasPendentes()` (mesmo padrão de `lib/estoque/publicacoes.ts`, data-model.md) — depende de T002. Sem teste próprio: CRUD direto sobre o Mongo, mesmo padrão já aceito em `lib/estoque/publicacoes.ts` (Tarefa 7)
- [X] T005 [P] Estender `lib/produtos/repository.ts`: `listarProdutosComIntegracaoExterna(): Promise<Produto[]>` — produtos com `integracoes.mercadoLivreId` e/ou `integracoes.shopeeItemId` presentes (`$or`), usada pelo job de importação (US2)

**Checkpoint**: Acesso a dados pronto — upsert idempotente, paginação e log de falhas disponíveis para as histórias.

---

## Phase 3: User Story 1 - Visitante vê avaliações de clientes na página do produto (Priority: P1) 🎯 MVP

**Goal**: Exibir, na página do produto, uma seção "avaliações de clientes" reunindo os feedbacks já armazenados no Mongo (de qualquer canal), com nota, comentário e origem.

**Independent Test**: Inserir avaliações de teste em `avaliacoes` para um produto (canais `mercado_livre` e `shopee`) e abrir a página desse produto — a seção deve listar os dois feedbacks com nota, comentário e canal de origem, sem depender do job de importação real (US2) ter rodado.

### Implementation for User Story 1

- [X] T006 [US1] Criar `app/api/produtos/[id]/avaliacoes/route.ts`: `GET` paginado, usando `buscarAvaliacoesProduto` (T003) — query params `cursor`/`limite` (contracts/avaliacoes-api.md) — depende de T003
- [X] T007 [P] [US1] Escrever testes em `app/api/produtos/[id]/avaliacoes/route.test.ts` (produto com avaliações de mais de um canal; produto sem avaliações → `{ avaliacoes: [], proximoCursor: null }`; paginação avança com `cursor`) — depende de T006
- [X] T008 [US1] Criar `components/produtos/AvaliacoesProduto.tsx`: recebe a primeira página de avaliações via prop (renderizada no server), exibe nota, comentário (quando houver) e canal de origem por item; botão "carregar mais" (client) busca páginas seguintes via `GET /api/produtos/[id]/avaliacoes` (T006); exibe mensagem de "ainda não há avaliações" quando a lista inicial vier vazia (FR-010)
- [X] T009 [US1] Integrar `<AvaliacoesProduto>` em `app/produtos/[categoria]/[slug]/page.tsx`, buscando a primeira página com `buscarAvaliacoesProduto` (T003) no próprio server component, abaixo da ficha técnica — depende de T003, T008
- [X] T010 [P] [US1] Adicionar estilos da seção de avaliações em `components/produtos/produtos.module.css` (lista de itens, nota, indicação de canal, botão "carregar mais")

**Checkpoint**: A seção de avaliações é exibida e testável de ponta a ponta com dados semeados manualmente, mesmo sem o job de importação (US2) ativo — MVP da tarefa.

---

## Phase 4: User Story 2 - Sistema importa periodicamente as avaliações dos canais externos (Priority: P1)

**Goal**: Um job agendado busca avaliações novas/alteradas do Mercado Livre (e da Shopee quando o app estiver aprovado) para cada produto com anúncio associado, e as grava em `avaliacoes` de forma idempotente.

**Independent Test**: Disparar manualmente `POST /api/avaliacoes/importar` para um produto de teste com `integracoes.mercadoLivreId` conhecido e avaliações reais nesse anúncio; verificar que essas avaliações passam a existir em `avaliacoes`; disparar de novo e verificar que não duplicam.

### Implementation for User Story 2

- [X] T011 [P] [US2] Criar `lib/avaliacoes/canais/mercadoLivre.ts`: `buscarAvaliacoesMercadoLivre(itemId: string): Promise<AvaliacaoImportada[]>` — `GET /reviews/item/{itemId}` autenticado, reaproveitando `obterAccessTokenValido` (`lib/estoque/canais/mercadoLivre/auth.ts`); mapeia `id`/`rate`/`comment`/`date_created` para `{ avaliacaoIdCanal, nota, comentario?, dataAvaliacao }` (research.md #1)
- [X] T012 [P] [US2] Escrever testes em `lib/avaliacoes/canais/mercadoLivre.test.ts` (`fetch` mockado: lista de reviews mapeada corretamente; review sem `comment` vira `comentario` ausente; erro HTTP propagado, reaproveitando `erroMercadoLivre`)
- [X] T013 [P] [US2] Criar `lib/avaliacoes/canais/shopee.ts`: stub condicional, mesmo padrão de `lib/estoque/canais/shopee.ts` — lança erro descritivo se chamado sem `SHOPEE_PARTNER_ID`/`SHOPEE_PARTNER_KEY` configurados (research.md #2)
- [X] T014 [P] [US2] Escrever testes em `lib/avaliacoes/canais/shopee.test.ts` (lança ao ser chamado — comportamento de stub)
- [X] T015 [US2] Criar `lib/avaliacoes/importacao.ts`: `importarAvaliacoesProduto(produto: Produto): Promise<{ importadas: number; atualizadas: number; falhas: number }>` — para cada canal (`mercado_livre`, `shopee`) com credencial de ambiente **e** `integracoes.<canal>` presente no produto, busca avaliações (T011/T013) e faz `upsertAvaliacao` (T003) por item; canal sem credencial/mapeamento é ignorado silenciosamente (FR-005); qualquer falha ao consultar um canal é capturada e vira `registrarFalhaImportacao` (T004), sem lançar exceção para quem chamou (FR-007) — depende de T003, T004, T011, T013. **Desvio do plano**: o resultado ganhou o campo `falhas` (não previsto no contrato inicial de assinatura) — necessário para a rota de cron (T017) somar `falharam` sem precisar reconsultar `avaliacoesImportacaoFalhas`
- [X] T016 [P] [US2] Escrever testes em `lib/avaliacoes/importacao.test.ts` (nova avaliação conta como importada; reimportação sem mudança não duplica nem conta como atualizada; mudança de nota/comentário conta como atualizada; produto sem `integracoes.<canal>` ignora esse canal; falha em um canal não impede o processamento do outro) — depende de T015
- [X] T017 [US2] Criar `app/api/avaliacoes/importar/route.ts`: `GET`/`POST` protegidos por `Authorization: Bearer $CRON_SECRET` (mesmo padrão de `/api/estoque/sincronizar`); lista produtos via `listarProdutosComIntegracaoExterna` (T005), chama `importarAvaliacoesProduto` (T015) para cada um, soma `produtosProcessados`/`avaliacoesImportadas`/`avaliacoesAtualizadas`/`falharam` (contracts/avaliacoes-api.md) — depende de T005, T015
- [X] T018 [P] [US2] Escrever testes em `app/api/avaliacoes/importar/route.test.ts` (`401` sem segredo ou segredo errado; soma correta dos contadores; um produto com falha não interrompe o processamento dos demais) — depende de T017
- [X] T019 [US2] Adicionar uma segunda entrada em `crons` de `vercel.ts`, apontando para `/api/avaliacoes/importar`, em horário diferente do cron de estoque (research.md #5) — depende de T017

**Checkpoint**: Importação real do Mercado Livre funcionando de ponta a ponta e alimentando a seção construída na US1; Shopee permanece como canal condicional (stub) até a aprovação do app.

---

## Phase 5: User Story 3 - Falha de importação em um canal não compromete os demais (Priority: P2)

**Goal**: Expor as falhas de importação (já isoladas por canal/produto desde a T015) de forma consultável pelo responsável da loja, sem investigar registros técnicos brutos.

**Independent Test**: Simular uma falha de credencial/indisponibilidade para um produto (mock de `fetch` retornando erro) e verificar que os demais produtos continuam sendo processados na mesma execução (já coberto por T016/T018) e que a falha aparece em `GET /api/avaliacoes/pendencias`.

### Implementation for User Story 3

- [X] T020 [US3] Criar `app/api/avaliacoes/pendencias/route.ts`: `GET` lista `listarFalhasPendentes` (T004) com o nome do produto quando `produtoId` estiver presente (mesmo padrão de `GET /api/anuncios/pendencias`, contracts/avaliacoes-api.md, FR-006, SC-005) — depende de T004
- [X] T021 [P] [US3] Escrever testes em `app/api/avaliacoes/pendencias/route.test.ts` (lista falhas com e sem produto identificável)

**Checkpoint**: Todas as três histórias completas — importação confiável, consultável pelo responsável da loja e visível para o visitante do site.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificação final da feature completa.

- [X] T022 Rodar `npx tsc --noEmit` (ok), `npx vitest run` (236/236 passaram, 44 arquivos) e `npm run build` (ok — `/api/produtos/[id]/avaliacoes`, `/api/avaliacoes/importar` e `/api/avaliacoes/pendencias` listadas)
- [X] T023 Revisado `contracts/avaliacoes-api.md` (assinatura de `importarAvaliacoesProduto` atualizada com o campo `falhas`) e `research.md` #3 (upsert implementado como find-then-insert, não `updateOne`/`upsert`). `data-model.md` e `quickstart.md` já batiam com o implementado, sem ajustes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — começa imediatamente.
- **Foundational (Phase 2)**: Depende de T001/T002 (modelos).
- **US1 (Phase 3)**: Depende do Foundational completo (usa T003 para leitura/paginação).
- **US2 (Phase 4)**: Depende do Foundational completo (T003, T004, T005); pode avançar em paralelo a US1 (arquivos diferentes), mas seu teste independente não depende de US1 estar pronta.
- **US3 (Phase 5)**: Depende do Foundational completo (T004); pode avançar em paralelo a US1/US2, mas faz mais sentido depois de US2 existir (é o que gera falhas a listar).
- **Polish (Phase 6)**: Após todas as histórias.

### User Story Dependencies

- **User Story 1 (P1)**: Depende do Foundational; é o valor visível ao cliente final (MVP).
- **User Story 2 (P1)**: Depende do Foundational; alimenta os dados que a US1 exibe, mas é independentemente testável via upsert direto/observação no Mongo.
- **User Story 3 (P2)**: Depende do Foundational; expõe consulta sobre um comportamento de isolamento já implementado na US2.

### Within Each User Story

- Modelos/tipos antes de repositories.
- Repositories/domínio antes de rotas de API.
- Clients de canal antes de qualquer módulo que os use.
- História completa antes de avançar para a próxima prioridade.

### Parallel Opportunities

- T001/T002 podem rodar em paralelo entre si.
- T004/T005 podem rodar em paralelo entre si (arquivos diferentes); ambos após T003 estar disponível para a US1/US2 usarem, mas sem dependência direta entre T003/T004/T005.
- T007/T010 podem rodar em paralelo (arquivos diferentes) dentro da US1.
- T011/T012/T013/T014 podem rodar em paralelo entre si (arquivos diferentes) dentro da US2.
- T018/T019 podem rodar em paralelo entre si depois de T017.

---

## Parallel Example: User Story 2

```bash
# Clients de canal em paralelo:
Task: "T011 Criar lib/avaliacoes/canais/mercadoLivre.ts"
Task: "T013 Criar lib/avaliacoes/canais/shopee.ts"

# Depois, o que amarra os anteriores:
Task: "T015 Criar lib/avaliacoes/importacao.ts (depende de T003, T004, T011, T013)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001-T002)
2. Phase 2: Foundational (T003-T005)
3. Phase 3: US1 (T006-T010) — validar com avaliações semeadas manualmente no Mongo
4. **STOP and VALIDATE**: seção "avaliações de clientes" funcionando na página do produto
5. Continuar se pronto

### Incremental Delivery

1. Setup + Foundational + US1 → Seção de avaliações visível no site (MVP, com dados semeados manualmente)
2. + US2 → Avaliações reais do Mercado Livre passam a alimentar a seção automaticamente
3. + US3 → Falhas de importação consultáveis pelo responsável da loja
4. Cada história agrega valor sem quebrar as anteriores

---

## Notes

- [P] tasks = arquivos diferentes, sem dependências entre si.
- [Story] mapeia a tarefa à história para rastreabilidade.
- Nenhuma dependência de pacote nova — Mercado Livre continua integrado via `fetch` direto (mesma decisão da Tarefa 5/7); nenhuma env var nova além das já configuradas (`MERCADOLIVRE_CLIENT_ID`/`MERCADOLIVRE_CLIENT_SECRET`, `CRON_SECRET`) e das opcionais já previstas para a Shopee (`SHOPEE_PARTNER_ID`/`SHOPEE_PARTNER_KEY`).
- Textos de UI (ex: seção "avaliações de clientes", mensagem de "sem avaliações") em PT-BR inline, seguindo o padrão I18N já existente do projeto.
- Após cada tarefa ou grupo lógico, validar com `npx tsc --noEmit` e `npx vitest run`.
- Moderação, resposta a avaliações e avaliações nativas do site (canal `"site"`) ficam fora do escopo desta tarefa (spec.md, Assumptions).
