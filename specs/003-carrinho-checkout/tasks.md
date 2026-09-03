---

description: "Task list for feature implementation"
---

# Tasks: Carrinho e Checkout

**Input**: Design documents from `/specs/003-carrinho-checkout/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: O projeto introduziu Vitest na Tarefa 2 e o plano técnico prevê testes unitários das regras de negócio desta tarefa — tarefas de teste incluídas por história.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project (Next.js App Router)**: `app/`, `lib/`, `components/` na raiz do repositório, conforme plan.md.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Base de dados/domínio compartilhada pelas histórias de checkout (US2/US3).

- [X] T001 Adicionar campo opcional `idempotencia?: string` ao `Pedido` em `lib/models/pedido.ts`, com comentário explicando o uso (anti-duplicação de checkout, conforme data-model.md)
- [X] T002 Criar `lib/pedidos/repository.ts` com `colecaoPedidos()` garantindo os índices (único esparso em `idempotencia`, simples em `criadoEm`) — mesmo padrão de `lib/produtos/repository.ts`

**Checkpoint**: Modelo e acesso a dados de pedidos prontos.

---

## Phase 2: User Story 1 - Visitante monta e gerencia o carrinho (Priority: P1) 🎯 MVP

**Goal**: Carrinho com estado no cliente (React Context + localStorage): adicionar do detalhe do produto, ver itens em `/carrinho`, alterar quantidades, remover, contador no header.

**Independent Test**: Adicionar produto do detalhe → conferir `/carrinho` (nome, foto, preço, quantidade, subtotal, total) → alterar/remover itens → fechar e reabrir o navegador no mesmo dispositivo e confirmar que o carrinho persiste.

### Implementation for User Story 1

- [X] T003 [P] [US1] Criar funções puras do carrinho em `lib/carrinho/carrinho.ts`: `adicionarItem`, `alterarQuantidade`, `removerItem`, `limparCarrinho`, `calcularTotais` e parse seguro do `localStorage` (dados corrompidos → carrinho vazio)
- [X] T004 [P] [US1] Escrever testes unitários em `lib/carrinho/carrinho.test.ts` (soma de quantidades, limites de quantidade, totais, parse de JSON corrompido)
- [X] T005 [US1] Criar tipos, ações e reducer do carrinho em `components/carrinho/carrinho-context.ts` (usando as funções de T003)
- [X] T006 [US1] Criar `components/carrinho/CarrinhoProvider.tsx` (Context + `useReducer` + persistência/hidratação via `localStorage`)
- [X] T007 [US1] Criar `components/carrinho/BotaoAdicionarCarrinho.tsx` (seletor de quantidade com limite no estoque do produto — FR-005) e estilos em `components/carrinho/*.module.css`
- [X] T008 [US1] Integrar `BotaoAdicionarCarrinho` na página de detalhe `app/produtos/[categoria]/[slug]/page.tsx`
- [X] T009 [US1] Criar página `app/carrinho/page.tsx` (itens com foto/nome/preço, edição de quantidade, remoção, totais, estado vazio com link para `/produtos`, CTA para `/checkout`)
- [X] T010 [US1] Criar `components/carrinho/CarrinhoIcone.tsx` (ícone com contador) e integrá-lo no nav de `components/SiteHeader.tsx`

**Checkpoint**: Carrinho 100% funcional e testável isoladamente (MVP).

---

## Phase 3: User Story 2 - Visitante finaliza o checkout e cria o pedido (Priority: P1)

**Goal**: Formulário de checkout (dados do cliente + endereço), resumo do pedido, criação do pedido "pendente" via `POST /api/pedidos` e página de confirmação `/pedido/[id]`.

**Independent Test**: Com itens no carrinho, preencher `/checkout` com dados válidos → conferir o resumo → confirmar → pedido criado com status "pendente" no MongoDB e página `/pedido/[id]` exibindo o resumo; carrinho esvaziado após.

### Implementation for User Story 2

- [X] T011 [P] [US2] Criar `lib/pedidos/validation.ts` com `validarCheckout(payload)` retornando mapa `campo → erro` (nome, email válido, endereço completo, itens não vazios, quantidade ≥ 1 — FR-006/FR-007/FR-014)
- [X] T012 [P] [US2] Escrever testes unitários em `lib/pedidos/validation.test.ts` (campos ausentes, email inválido, endereço incompleto, itens vazios)
- [X] T013 [US2] Implementar `criarPedido` e `buscarPedidoPorId` em `lib/pedidos/repository.ts`: idempotência (busca por `idempotencia` antes do insert; em duplicata retorna o pedido existente), preços lidos do banco por `produtoId`, `status: "pendente"`, `canalOrigem: "site"`, `criadoEm`/`atualizadoEm` — depende de T002 e T011
- [X] T014 [US2] Implementar `POST` em `app/api/pedidos/route.ts` (camada fina: validar → 400 com `campos`; criar → 201 com pedido; duplicata → 200 com pedido existente) mantendo o `GET` esqueleto — depende de T013
- [X] T015 [US2] Criar `components/checkout/FormularioCheckout.tsx` (Client Component: campos de cliente + endereço, validação por campo, token de idempotência gerado ao montar, estado `enviando` bloqueando duplo envio, POST para `/api/pedidos`) e estilos em `components/checkout/*.module.css`
- [X] T016 [US2] Criar `components/checkout/ResumoPedido.tsx` (itens + total do carrinho, reutilizado no checkout e na confirmação)
- [X] T017 [US2] Criar página `app/checkout/page.tsx` (redireciona para `/carrinho` se vazio — FR-014; formulário + resumo; em sucesso limpa o carrinho e redireciona para `/pedido/[id]`) — depende de T015 e T016
- [X] T018 [US2] Criar página `app/pedido/[id]/page.tsx` (Server Component: `buscarPedidoPorId`, `notFound()` se inexistente, resumo do pedido + indicação "pendente de pagamento") — depende de T013 e T016

**Checkpoint**: Checkout ponta a ponta funcional (US1 + US2 juntas).

---

## Phase 4: User Story 3 - Estoque é validado no momento do checkout (Priority: P2)

**Goal**: Bloqueio de confirmação de checkout com estoque insuficiente ou produto indisponível, com mensagem clara por item.

**Independent Test**: Reduzir o estoque de um produto no banco (ou via `/admin/produtos`) após adicioná-lo ao carrinho → tentar confirmar o checkout → receber bloqueio com item e quantidade disponível; nenhum pedido criado.

### Implementation for User Story 3

- [X] T019 [P] [US3] Criar `lib/pedidos/estoque.ts` com `validarEstoque(itens)`: agrupa quantidades por `produtoId`, lê produtos do banco, acusa produto inexistente e `Σ quantidades > estoque` (retorna item + `quantidadeDisponivel`)
- [X] T020 [P] [US3] Escrever testes unitários em `lib/pedidos/estoque.test.ts` (produto inexistente, estoque zerado, itens duplicados somando acima do estoque, validação OK)
- [X] T021 [US3] Integrar `validarEstoque` no fluxo de `criarPedido` (antes do insert) e no `POST /api/pedidos`: responder `409` com `{ erro, itens: [{ produtoId, nome, quantidadeDisponivel }] }` — depende de T013 e T019
- [X] T022 [US3] Exibir no `components/checkout/FormularioCheckout.tsx` o erro de estoque vindo do `409` (itens problemáticos e quantidade disponível), sem criar pedido — depende de T021

**Checkpoint**: Todas as três histórias funcionando independentemente.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verificação final da feature completa.

- [X] T023 Executar `npm run lint`, `npx tsc --noEmit`, `npx vitest run` e `npm run build` e corrigir qualquer falha (conforme quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — começa imediatamente.
- **US1 (Phase 2)**: Depende apenas do repositório — sem dependência de Setup.
- **US2 (Phase 3)**: Depende de Setup (T001/T002) e de US1 (carrinho é lido/esvaziado no checkout).
- **US3 (Phase 4)**: Depende de US2 (endurece o fluxo de criação).
- **Polish (Phase 5)**: Após todas as histórias.

### User Story Dependencies

- **User Story 1 (P1)**: Independente — pode começar após o kickoff; não bloqueia nem é bloqueada pelo Setup.
- **User Story 2 (P1)**: Depende de US1 (contexto do carrinho) e do Setup (modelo/repositório de pedidos).
- **User Story 3 (P2)**: Depende de US2 (integra-se ao `criarPedido`/endpoint).

### Within Each User Story

- Funções puras antes do reducer/contexto (US1); validação antes do repositório/endpoint (US2/US3).
- Testes unitários junto das funções que testam (mesmo arquivo de entrega).
- História completa antes de avançar para a próxima prioridade.

### Parallel Opportunities

- T003/T004 podem rodar em paralelo; T011/T012 e T019/T020 também.
- Setup (T001/T002) e US1 (T003–T010) não se tocam — podem avançar em paralelo.
- Dentro de US2: T015/T016 (componentes) podem ser feitos em paralelo com T013/T014 (backend), integrando em T017.

---

## Parallel Example: User Story 2

```bash
# Backend em paralelo com UI:
Task: "T013 Implementar criarPedido e buscarPedidoPorId em lib/pedidos/repository.ts"
Task: "T015 Criar components/checkout/FormularioCheckout.tsx"
Task: "T016 Criar components/checkout/ResumoPedido.tsx"

# Depois da integração:
Task: "T014 Implementar POST em app/api/pedidos/route.ts (depende de T013)"
Task: "T017 Criar página app/checkout/page.tsx (depende de T015/T016)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001–T002)
2. Phase 2: US1 (T003–T010)
3. **STOP and VALIDATE**: testar o carrinho isoladamente (adicionar/alterar/remover/persistência)
4. Continuar se pronto

### Incremental Delivery

1. Setup + US1 → Carrinho funcional (MVP)
2. + US2 → Checkout ponta a ponta com pedido "pendente"
3. + US3 → Validação de estoque no checkout
4. Cada história agrega valor sem quebrar as anteriores

---

## Notes

- [P] tasks = arquivos diferentes, sem dependências entre si.
- [Story] mapeia a tarefa à história para rastreabilidade.
- Nenhuma dependência nova de pacote nesta feature (carrinho usa Context + localStorage — ver research.md).
- Abatimento de estoque (EDI-78) e pagamento (EDI-77) NÃO fazem parte destas tarefas (FR-015).
- Textos de UI em PT-BR inline, seguindo o padrão atual do projeto (research.md item 7).
- Após cada tarefa ou grupo lógico, validar com `npx tsc --noEmit` e `npx vitest run`.
