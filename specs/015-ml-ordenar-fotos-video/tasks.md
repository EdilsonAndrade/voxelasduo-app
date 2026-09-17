# Tasks: Ordenar fotos do produto (Mercado Livre e site)

**Input**: Design documents from `specs/015-ml-ordenar-fotos-video/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ordenar-fotos.md, quickstart.md

**Tests**: Incluídos para a lógica em `lib/` (padrão já existente do projeto, Vitest, `*.test.ts` co-localizados — research.md #5). A UI de reordenação em `ProdutoForm.tsx` não ganha teste automatizado (sem `jsdom` no projeto); é verificada manualmente (Test Guide ao final).

**Organization**: 3 user stories — US1 e US2 são P1, US3 é P2. US1 (reordenar e persistir) é independente. US2 (corte de 6 no anúncio) e US3 (indicador visual do corte) dependem do helper `fotosParaAnuncio` criado na fase Foundational.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Mesmo projeto único Next.js (ver plan.md): `lib/`, `app/`, `components/`.

---

## Phase 1: Setup

Nenhuma tarefa de setup necessária — projeto, dependências e ambiente já existentes; nenhuma variável de ambiente ou biblioteca nova (research.md #4).

---

## Phase 2: Foundational

**Purpose**: Helper compartilhado que aplica o limite de 6 fotos do Mercado Livre (data-model.md) — usado tanto para montar o anúncio (US2) quanto para o indicador visual no admin (US3). US1 não depende desta fase.

- [X] T001 [P] Criar `lib/estoque/canais/mercadoLivre/fotos.ts` com `LIMITE_FOTOS_MERCADO_LIVRE = 6` e `fotosParaAnuncio(fotos: string[]): string[]` (`.slice(0, 6)`, função pura — data-model.md)
- [X] T002 [P] Criar `lib/estoque/canais/mercadoLivre/fotos.test.ts`: array com menos de 6 fotos retorna igual; com exatamente 6 retorna igual; com mais de 6 retorna só as 6 primeiras, na mesma ordem — depende de T001

**Checkpoint**: `fotosParaAnuncio` pronto e testado — US2 e US3 podem consumir.

---

## Phase 3: User Story 1 - Reordenar as fotos do produto (Priority: P1) 🎯 MVP

**Goal**: O vendedor arrasta (ou usa botões de mover) as fotos já cadastradas de um produto no admin para escolher a ordem, e essa ordem é salva.

**Independent Test**: Abrir um produto com 3+ fotos, mover uma foto de posição, salvar, reabrir o produto e confirmar que a nova ordem persistiu — sem depender de nada relacionado ao Mercado Livre.

**Nota de design**: antes de implementar a UI desta fase, invocar a skill `frontend-design` (regra do projeto para qualquer alteração de UI) para orientar a interação de arrastar/soltar e o estilo dos controles de mover.

### Implementation for User Story 1

- [X] T003 [US1] Em `components/admin/ProdutoForm.tsx`, criar `moverFoto(origem: number, destino: number)` que reordena `valores.fotos` localmente (`splice` remove+insere, mesmo padrão de `removerFoto` já existente)
- [X] T004 [US1] Adicionar atributos de drag-and-drop nativo (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) nas miniaturas já renderizadas em `ProdutoForm.tsx` (bloco `styles.fotos`/`styles.foto`), chamando `moverFoto` no drop (research.md #4)
- [X] T005 [US1] Adicionar botões ◀/▶ ("mover para trás"/"mover para frente", adaptado à galeria horizontal — mesma intenção de FR-001) em cada miniatura em `ProdutoForm.tsx`, desabilitados no primeiro/último item, chamando `moverFoto` — cobre teclado/touch sem suporte a drag (research.md #4)
- [X] T006 [P] [US1] Estilizar miniaturas arrastáveis e os novos botões de mover em `components/admin/admin.module.css` (cursor de arrastar, estado de "arrastando sobre" com `var(--roxo)`, badge de ordem, botões compactos sobre a miniatura) — direção visual revisada com a skill `frontend-design`, reaproveitando os tokens já existentes do admin

**Checkpoint**: US1 completa e testável de forma independente — reordenar e salvar já muda a ordem em `produto.fotos`; a galeria do produto no site (`app/produtos/[categoria]/[slug]/page.tsx:47-54`) já renderiza nessa mesma ordem, sem nenhuma mudança de código adicional (ela já itera `produto.fotos` na ordem do array).

---

## Phase 4: User Story 2 - Anúncio do Mercado Livre respeita a ordem escolhida (Priority: P1)

**Goal**: Ao criar ou recriar (despublicar + publicar de novo) o anúncio no Mercado Livre, as fotos são enviadas na ordem persistida do produto, respeitando o limite de 6.

**Independent Test**: Publicar (ou despublicar e publicar de novo) um produto com fotos reordenadas e conferir, no anúncio criado, que a sequência de imagens bate com a ordem definida no admin — e que um produto com mais de 6 fotos publica normalmente, só com as 6 primeiras.

### Tests for User Story 2

- [X] T007 [P] [US2] Adicionar caso em `lib/estoque/canais/mercadoLivre/anuncios.test.ts`: produto com mais de 6 fotos gera `pictures` só com as 6 primeiras, na ordem de `produto.fotos` — depende de T001

### Implementation for User Story 2

- [X] T008 [US2] Em `criarAnuncio` (`lib/estoque/canais/mercadoLivre/anuncios.ts:163`), trocar `produto.fotos.map((source) => ({ source }))` por `fotosParaAnuncio(produto.fotos).map((source) => ({ source }))` — depende de T001, T007

**Checkpoint**: US1 + US2 juntas já entregam o valor principal do ticket — reordenar no site muda o que é publicado no Mercado Livre, sem quebrar produtos com mais de 6 fotos.

---

## Phase 5: User Story 3 - Indicar quais fotos vão para o Mercado Livre quando há mais de 6 (Priority: P2)

**Goal**: Quando o produto tem mais de 6 fotos, o admin marca visualmente quais 6 (e em que ordem) vão para o anúncio do Mercado Livre.

**Independent Test**: Cadastrar um produto com 8 fotos e conferir que a UI marca as 6 primeiras como "vai para o Mercado Livre" e as 2 últimas como "não vai"; reordenar trazendo uma das últimas para dentro das 6 primeiras e conferir que a marcação é recalculada.

### Implementation for User Story 3

- [X] T009 [US3] Em `ProdutoForm.tsx`, comparar `index < LIMITE_FOTOS_MERCADO_LIVRE` (importado de `lib/estoque/canais/mercadoLivre/fotos.ts`) e, quando `valores.fotos.length > LIMITE_FOTOS_MERCADO_LIVRE`, renderizar um rótulo por miniatura ("ML" / "Fora", com `title` completo para acessibilidade) — depende de T001, T003, T004
- [X] T010 [P] [US3] Estilizar o rótulo em `components/admin/admin.module.css` (badge discreto sobre a miniatura, cor de aviso `#b3701f` já usada em `.fieldWarning` para "Fora")

**Checkpoint**: Todas as user stories funcionais de forma independente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T011 Rodar verificação local completa (quickstart.md): `npx tsc --noEmit` (ok), `npx vitest run` (327 passed), `npm run build` (ok) — `npm run lint`/`next lint` está quebrado neste repo independentemente desta feature (sem `eslint.config.*`), não é regressão introduzida aqui
- [X] T012 Escrever o Test Guide final da feature (conforme regra do projeto — ver resposta final ao usuário)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: nenhuma tarefa — sem bloqueio
- **Foundational (Phase 2)**: sem dependência de Setup; bloqueia US2 e US3 (não bloqueia US1)
- **US1 (Phase 3)**: pode começar imediatamente, em paralelo com Foundational
- **US2 (Phase 4)**: depende de Foundational (T001) — não depende de US1 para funcionar sozinha, mas só faz sentido demonstrar junto (a ordem vem de onde US1 grava)
- **US3 (Phase 5)**: depende de Foundational (T001) e da estrutura de miniaturas de US1 (T003, T004)
- **Polish (Phase 6)**: depende de todas as stories desejadas estarem completas

### Parallel Opportunities

- T001/T002 (Foundational) em paralelo com T003-T006 (US1) — arquivos diferentes, sem dependência
- T006 (CSS de US1) em paralelo com T003-T005 (mesma fase, arquivo diferente)
- T007 (teste de US2) em paralelo com T001/T002 assim que T001 existir
- T010 (CSS de US3) em paralelo com T009

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 2 (Foundational) — rápida, só o helper
2. Completar Phase 3 (US1) — reordenar já funciona no admin e no site
3. **Parar e validar**: reordenar um produto de teste e conferir a galeria no site

### Incremental Delivery

1. Foundational + US1 → reordenação funcionando no site (MVP)
2. + US2 → Mercado Livre passa a respeitar a ordem e o limite de 6
3. + US3 → admin fica claro sobre quais fotos vão para o Mercado Livre
4. Polish → verificação local + Test Guide para o usuário validar o fluxo completo

## Notes

- [P] = arquivos diferentes, sem dependência entre si
- [Story] mapeia a tarefa à user story correspondente (rastreabilidade)
- Nenhuma rota de API nova é criada — só os arquivos listados acima são tocados (plan.md, Project Structure)
